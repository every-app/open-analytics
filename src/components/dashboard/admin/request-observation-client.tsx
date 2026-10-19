import { useState } from "react";
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { PageHeading } from "@insightflare/ui/page-heading";
import { Spinner } from "@insightflare/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@insightflare/ui/table";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, ShieldIcon } from "lucide-react";

import { intlLocale } from "@/lib/dashboard/format";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type {
  RequestObservationCount,
  RequestObservationSummary,
} from "@/lib/edge/collector/request-observations";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

const WINDOWS = [1, 7, 30] as const;

interface RequestObservationClientProps {
  locale: Locale;
  messages: AppMessages;
  sites: Array<{ id: string; name: string }>;
}

/** Requests /collect refused: by category, reason, place, network and client. */
export function RequestObservationClient({
  locale,
  messages,
  sites,
}: RequestObservationClientProps) {
  const copy = messages.requestObservation;
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(7);
  const query = useQuery({
    queryKey: ["dashboard", "request-observation", days],
    queryFn: ({ signal }) =>
      requestAdminService<RequestObservationSummary>("request-observation", {
        params: { days },
        signal,
      }),
  });
  const summary = query.data;
  const siteName = (id: string) =>
    sites.find((site) => site.id === id)?.name ?? id;
  const reasonLabel = (reason: string) =>
    (copy.botReasonLabels as Record<string, string>)[reason] ?? reason;
  const categoryLabel = (category: string) =>
    (copy.categoryLabels as Record<string, string>)[category] ?? category;
  const time = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (
    <div className="space-y-4">
      <PageHeading
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {WINDOWS.map((window) => (
              <Button
                key={window}
                type="button"
                size="sm"
                variant={window === days ? "default" : "outline"}
                onClick={() => setDays(window)}
              >
                {formatI18nTemplate(copy.overviewLabels.windowDays, {
                  days: window,
                })}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {query.isFetching ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              {copy.refresh}
            </Button>
          </div>
        }
      />

      {query.isError ? (
        <p className="text-sm text-destructive">{copy.loadFailed}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ShieldIcon className="size-4" />
            {copy.blockedTotal}: {summary?.total ?? "…"}
          </CardTitle>
          <CardDescription>{copy.retentionNote}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {summary?.byCategory.map((row) => (
            <Badge key={row.value} variant="secondary">
              {categoryLabel(row.value)}: {row.count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopCard
          title={copy.topReasons}
          rows={summary?.byReason}
          label={reasonLabel}
          noData={copy.noData}
        />
        <TopCard
          title={copy.site}
          rows={summary?.bySite}
          label={siteName}
          noData={copy.noData}
        />
        <TopCard
          title={copy.country}
          rows={summary?.byCountry}
          noData={copy.noData}
        />
        <TopCard
          title={copy.network}
          rows={summary?.byNetwork}
          noData={copy.noData}
        />
        <TopCard
          title={copy.userAgent}
          rows={summary?.byUserAgent}
          noData={copy.noData}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.recentTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {summary && summary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noData}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.time}</TableHead>
                  <TableHead>{copy.site}</TableHead>
                  <TableHead>{copy.reason}</TableHead>
                  <TableHead>{copy.location}</TableHead>
                  <TableHead>{copy.network}</TableHead>
                  <TableHead>{copy.ipPrefix}</TableHead>
                  <TableHead>{copy.pathname}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.recent.map((row, index) => (
                  <TableRow key={`${row.receivedAt}-${index}`}>
                    <TableCell className="whitespace-nowrap">
                      {time.format(row.receivedAt)}
                    </TableCell>
                    <TableCell>{siteName(row.siteId)}</TableCell>
                    <TableCell>
                      {row.reasons.map(reasonLabel).join(", ") ||
                        categoryLabel(row.category)}
                    </TableCell>
                    <TableCell>
                      {[row.city, row.country].filter(Boolean).join(", ") ||
                        copy.emptyValue}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {row.asn
                        ? `AS${row.asn} ${row.asOrganization}`
                        : copy.emptyValue}
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.ipPrefix || copy.emptyValue}
                    </TableCell>
                    <TableCell className="max-w-56 truncate font-mono">
                      {row.pathname || copy.emptyValue}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TopCard({
  title,
  rows,
  label = (value) => value,
  noData,
}: {
  title: string;
  rows: RequestObservationCount[] | undefined;
  label?: (value: string) => string;
  noData: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{noData}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows?.map((row) => (
              <li key={row.value} className="flex justify-between gap-4">
                <span className="min-w-0 truncate">{label(row.value)}</span>
                <span className="tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
