import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useDashboardQuery } from "@/components/dashboard/shell/dashboard-query-provider";
import { intlLocale } from "@/lib/dashboard/format";
import { buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import {
  buildTeamAggregateTrend,
  buildTeamSiteTrends,
  teamDashboardQueryOptions,
} from "@/lib/dashboard/team-dashboard-query";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import { navigateWithTransition } from "@/lib/page-transition";
import { useRouter } from "@/lib/router";

import {
  emptyOverviewMetrics,
  emptySiteMetricChangeRates,
  getSiteSlug,
  postJson,
  sortSitesForInitialOrder,
  withSiteSlug,
} from "./model";
import type { TeamManagementClientProps } from "./types";

/** The all-sites overview: every site's metrics, and creating a site. */
export function useTeamManagement({
  locale,
  messages,
  activeTeam,
  systemRole,
  teamDashboardSnapshot = null,
}: TeamManagementClientProps) {
  const router = useRouter();

  const { window: selectedWindow } = useDashboardQuery();

  const canUseInitialSnapshotWindow =
    teamDashboardSnapshot &&
    selectedWindow.preset === teamDashboardSnapshot.range &&
    selectedWindow.interval === teamDashboardSnapshot.window.interval &&
    selectedWindow.timeZone === teamDashboardSnapshot.window.timeZone &&
    (selectedWindow.preset !== "custom" ||
      (selectedWindow.from === teamDashboardSnapshot.window.from &&
        selectedWindow.to === teamDashboardSnapshot.window.to));

  const window = canUseInitialSnapshotWindow
    ? {
        ...teamDashboardSnapshot.window,
        preset: selectedWindow.preset,
      }
    : selectedWindow;

  const copy = messages.teamManagement;
  const siteCreateCopy = messages.adminSites;

  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);
  const [createSiteName, setCreateSiteName] = useState("");
  const [createSiteDomain, setCreateSiteDomain] = useState("");
  const [createSitePublicSlug, setCreateSitePublicSlug] = useState("");
  const [createSiteError, setCreateSiteError] = useState("");
  const [creatingSite, setCreatingSite] = useState(false);

  const canManage = canManageTeam(activeTeam.membershipRole, systemRole);
  const canManageSites = canManage;

  const dashboardQuery = useQuery(
    teamDashboardQueryOptions({
      teamId: activeTeam.id,
      window,
      range: selectedWindow.preset,
      snapshot: teamDashboardSnapshot,
      enabled: true,
    }),
  );

  const dashboardSnapshot = dashboardQuery.data;
  const dashboardData = dashboardSnapshot?.data;
  const dashboardWindow = dashboardSnapshot?.window ?? window;

  const dashboardSites = useMemo(
    () =>
      sortSitesForInitialOrder((dashboardData?.sites ?? []).map(withSiteSlug)),
    [dashboardData?.sites],
  );

  async function handleCreateSite() {
    const name = createSiteName.trim();
    const domain = createSiteDomain.trim();
    const publicSlug = createSitePublicSlug.trim();

    if (name.length < 2 || domain.length < 3) {
      setCreateSiteError(siteCreateCopy.invalidInput);
      toast.error(siteCreateCopy.invalidInput);
      return;
    }

    setCreatingSite(true);
    setCreateSiteError("");
    try {
      const created = await postJson<SiteData>("sites", {
        teamId: activeTeam.id,
        name,
        domain,
        publicSlug: publicSlug || undefined,
      });
      setCreateSiteDialogOpen(false);
      setCreateSiteName("");
      setCreateSiteDomain("");
      setCreateSitePublicSlug("");
      toast.success(siteCreateCopy.createSuccess);
      navigateWithTransition(
        router,
        buildSitePath(locale, getSiteSlug(created), "settings"),
      );
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : siteCreateCopy.createFailed;
      setCreateSiteError(message || siteCreateCopy.createFailed);
      toast.error(message || siteCreateCopy.createFailed);
    } finally {
      setCreatingSite(false);
    }
  }

  const aggregateChartRenderData = useMemo(() => {
    if (!dashboardData) return undefined;
    return buildTeamAggregateTrend(dashboardData.trend, dashboardWindow);
  }, [dashboardData, dashboardWindow]);

  const siteTrendById = useMemo(
    () =>
      buildTeamSiteTrends(
        dashboardSites.map((site) => site.id),
        dashboardData?.trend ?? [],
        dashboardWindow,
      ),
    [dashboardData?.trend, dashboardSites, dashboardWindow],
  );

  const siteDashboardCards = useMemo(
    () =>
      dashboardSites.map((site) => {
        const overview = site.overview ?? emptyOverviewMetrics();
        return {
          site,
          overview,
          pagesPerSession:
            overview.sessions > 0 ? overview.views / overview.sessions : 0,
          changeRates: site.changeRates ?? emptySiteMetricChangeRates(),
          trend: siteTrendById[site.id] ?? [],
        };
      }),
    [dashboardSites, siteTrendById],
  );

  const aggregateChartSites = useMemo(
    () =>
      dashboardSites.map((site) => ({
        id: site.id,
        name: site.name,
      })),
    [dashboardSites],
  );

  const pagesPerSessionFormatter = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale(locale), {
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  return {
    aggregateChartRenderData,
    aggregateChartSites,
    canManage,
    canManageSites,
    copy,
    createSiteDialogOpen,
    createSiteDomain,
    createSiteError,
    createSiteName,
    createSitePublicSlug,
    creatingSite,
    dashboardQuery,
    dashboardSites,
    dashboardWindow,
    handleCreateSite,
    isPageDataLoading: dashboardQuery.isPending && !dashboardData,
    pagesPerSessionFormatter,
    setCreateSiteDialogOpen,
    setCreateSiteDomain,
    setCreateSiteError,
    setCreateSiteName,
    setCreateSitePublicSlug,
    siteCount: dashboardSites.length,
    siteCreateCopy,
    siteDashboardCards,
    window,
  };
}
