import { queryOptions } from "@tanstack/react-query";

import {
  loadDashboardInitialWindow,
  loadDashboardTeam,
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
