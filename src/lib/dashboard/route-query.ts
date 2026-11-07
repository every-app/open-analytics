import { queryOptions } from "@tanstack/react-query";

import { loadDashboardShell } from "@/lib/dashboard/route-data";

export const dashboardShellQueryOptions = queryOptions({
  queryKey: ["dashboard-shell"],
  staleTime: 30_000,
  queryFn: () => loadDashboardShell(),
});
