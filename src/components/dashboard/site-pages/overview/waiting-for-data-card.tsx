import { Button } from "@insightflare/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ActivityIcon, SettingsIcon } from "lucide-react";

import { CodeBlock } from "@/components/common/code-block";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import Link from "@/lib/router";

// Checked again while waiting, so the card leaves once the first view lands.
const WAITING_REFETCH_MS = 15_000;

/**
 * A site that has never received a page view: its tracking snippet, until
 * the first view arrives.
 */
export function WaitingForDataCard({
  messages,
  siteId,
  siteDomain,
  settingsHref,
}: {
  messages: AppMessages;
  siteId: string;
  siteDomain: string;
  settingsHref: string;
}) {
  const copy = messages.getStarted;
  const enabled = typeof window !== "undefined";
  const tracking = useQuery({
    queryKey: ["dashboard", "site-tracking", siteId],
    queryFn: ({ signal }) =>
      requestAdminService<{ hasData: boolean }>("site-tracking", {
        params: { siteId },
        signal,
      }),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.hasData === false ? WAITING_REFETCH_MS : false,
  });
  const waiting = tracking.data?.hasData === false;
  const snippet = useQuery({
    queryKey: ["dashboard", "site-script-snippet", siteId],
    queryFn: async ({ signal }) =>
      (
        await requestAdminService<{ snippet: string }>("script-snippet", {
          params: { siteId },
          signal,
        })
      ).snippet,
    enabled: enabled && waiting,
  });
  if (!waiting) return null;

  return (
    <section
      aria-labelledby="waiting-for-data-title"
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="relative mt-1 flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2
              id="waiting-for-data-title"
              className="text-base font-semibold tracking-tight"
            >
              {copy.waitingTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatI18nTemplate(copy.waitingDescription, {
                domain: siteDomain,
              })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={settingsHref}>
            <SettingsIcon data-icon="inline-start" />
            {copy.trackingSettings}
          </Link>
        </Button>
      </div>
      {snippet.data ? (
        <CodeBlock
          value={snippet.data}
          copyLabel={copy.copy}
          copiedLabel={copy.copied}
        />
      ) : (
        <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-xs text-muted-foreground">
          <ActivityIcon className="size-3.5 animate-pulse" aria-hidden />
        </div>
      )}
    </section>
  );
}
