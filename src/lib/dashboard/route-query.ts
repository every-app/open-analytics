import { queryOptions } from "@tanstack/react-query";

import {
  loadDashboardInitialWindow,
  loadDashboardTeam,
  loadLocale,
} from "@/lib/dashboard/route-data";

export const dashboardShellQueryOptions = queryOptions({
  queryKey: ["dashboard-shell"],
  staleTime: 30_000,
  queryFn: async () => {
    const [teamContext, initialDashboardWindow] = await Promise.all([
      loadDashboardTeam(),
      loadDashboardInitialWindow(),
    ]);
    return { teamContext, initialDashboardWindow };
  },
});

/**
 * The page language, read once on the server and handed to the browser with
 * the page: a share page's anonymous viewer can't call a server function.
 * Appearance sets it when the person picks another language.
 */
export const localeQueryOptions = queryOptions({
  queryKey: ["locale"],
  staleTime: Infinity,
  gcTime: Infinity,
  queryFn: () => loadLocale(),
});
