import type { PagesDashboardListRequestOptions } from "@/lib/dashboard/client/data/types";
import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import {
  withComparison,
  withFilters,
  withPagination,
} from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { PagesDashboardData } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract";
export async function fetchPagesDashboard(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: PagesDashboardListRequestOptions,
): Promise<PagesDashboardData> {
  const params = withComparison(
    withFilters(
      withPagination(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
          interval: window.interval,
          ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
          ...(options?.sort ? { sort: options.sort } : {}),
          ...(options?.direction ? { direction: options.direction } : {}),
        },
        options,
        12,
      ),
      filters,
    ),
    options?.comparison,
    {
      metric: options?.comparisonMetric,
      sortBy: options?.comparisonSortBy,
    },
  );
  return fetchPrivateJson<PagesDashboardData>(
    "/api/private/pages-dashboard",
    params,
    { signal: options?.signal },
  );
}
