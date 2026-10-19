import { useEffect, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { Skeleton } from "@insightflare/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@insightflare/ui/table";
import { useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, GlobeIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { CreateSiteDialog } from "@/components/dashboard/admin/create-site-dialog";
import { getSiteSlug } from "@/components/dashboard/admin/team-management/model";
import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import {
  SettingsCard,
  SettingsPage,
} from "@/components/settings/settings-section";
import { shortDateTime } from "@/lib/dashboard/format";
import { buildSitePath } from "@/lib/dashboard/paths";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { SiteData, TeamData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

interface AdminSitesManagementClientProps {
  locale: Locale;
  messages: AppMessages;
  activeTeam: TeamData;
  initialSites?: readonly SiteData[] | null;
}
async function fetchSites(
  teamId: string,
  signal?: AbortSignal,
): Promise<SiteData[]> {
  return requestAdminService<SiteData[]>("sites", {
    params: { teamId },
    signal,
  });
}

/** Settings → Sites: the organization's sites, and adding one. */
export function AdminSitesManagementClient({
  locale,
  messages,
  activeTeam,
  initialSites = null,
}: AdminSitesManagementClientProps) {
  const { timeZone } = useDashboardQueryControls();
  const t = messages.adminSites;
  const [createOpen, setCreateOpen] = useState(false);
  const sitesQuery = useQuery({
    queryKey: ["dashboard", "admin-sites", activeTeam.id],
    queryFn: ({ signal }) => fetchSites(activeTeam.id, signal),
    initialData: initialSites ?? undefined,
    enabled: typeof window !== "undefined" && Boolean(activeTeam.id),
  });
  const sites = sitesQuery.data ?? [];

  useEffect(() => {
    if (!sitesQuery.isError) return;
    const message =
      sitesQuery.error instanceof Error
        ? sitesQuery.error.message
        : t.loadFailed;
    toast.error(message || t.loadFailed);
  }, [
    sitesQuery.error,
    sitesQuery.errorUpdatedAt,
    sitesQuery.isError,
    t.loadFailed,
  ]);

  const addSiteButton = (
    <Button type="button" onClick={() => setCreateOpen(true)}>
      <PlusIcon data-icon="inline-start" />
      {t.createTitle}
    </Button>
  );

  return (
    <SettingsPage
      title={messages.settingsNav.sites}
      actions={sites.length > 0 ? addSiteButton : undefined}
    >
      <SettingsCard className="divide-y-0">
        {sitesQuery.isPending ? (
          <div className="divide-y divide-border">
            {[0, 1, 2].map((index) => (
              <div key={index} className="px-5 py-4">
                <Skeleton className="h-5 w-56" />
              </div>
            ))}
          </div>
        ) : sites.length === 0 ? (
          <EmptyState
            variant="plain"
            media="rows"
            icon={GlobeIcon}
            title={t.noData}
            action={addSiteButton}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead>{t.columns.domain}</TableHead>
                <TableHead>{t.columns.created}</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">{t.columns.action}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => {
                const href = buildSitePath(locale, getSiteSlug(site));
                return (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">
                      <Link href={href} className="hover:underline">
                        {site.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.domain}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {shortDateTime(locale, site.createdAt * 1000, timeZone)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.open}
                      >
                        <Link href={href}>
                          <ChevronRightIcon />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SettingsCard>
      <CreateSiteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locale={locale}
        messages={messages}
        teamId={activeTeam.id}
      />
    </SettingsPage>
  );
}
