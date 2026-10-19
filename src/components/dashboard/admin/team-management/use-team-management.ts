import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useDashboardQuery } from "@/components/dashboard/shell/dashboard-query-provider";
import { intlLocale } from "@/lib/dashboard/format";
import { canManageTeam } from "@/lib/dashboard/permissions";
import {
  buildTeamAggregateTrend,
  buildTeamSiteTrends,
  teamDashboardQueryOptions,
} from "@/lib/dashboard/team-dashboard-query";
import type {} from "@/lib/dashboard-api/client/edge";

import {
  emptyOverviewMetrics,
  emptySiteMetricChangeRates,
  sortSitesForInitialOrder,
  withSiteSlug,
} from "./model";
import type { TeamManagementClientProps } from "./types";

/** The all-sites overview: every site's metrics. */
export function useTeamManagement({
  locale,
  activeTeam,
  systemRole,
  teamDashboardSnapshot = null,
}: TeamManagementClientProps) {
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

  const [createSiteDialogOpen, setCreateSiteDialogOpen] = useState(false);

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

  function openCreateSiteDialog() {
    setCreateSiteDialogOpen(true);
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
    createSiteDialogOpen,
    dashboardQuery,
    dashboardSites,
    dashboardWindow,
    isPageDataLoading: dashboardQuery.isPending && !dashboardData,
    openCreateSiteDialog,
    pagesPerSessionFormatter,
    setCreateSiteDialogOpen,
    siteDashboardCards,
    window,
  };
}
