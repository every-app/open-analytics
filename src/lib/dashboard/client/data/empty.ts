import type { DashboardFilterOptionsData } from "@/lib/dashboard-api/client/edge";
function emptyPagination(limit = 1) {
  return {
    limit,
    returned: 0,
    hasMore: false,
    nextCursor: null,
  } as const;
}
export function emptyDashboardFilterOptions(): DashboardFilterOptionsData {
  return {
    ok: true,
    data: { items: [], pagination: emptyPagination() },
  };
}
