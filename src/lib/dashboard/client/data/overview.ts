import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import { withFilters, withPagination } from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  DashboardData,
  OverviewData,
  PagesData,
  TrendData,
} from "@/lib/dashboard-api/client/edge";
import type { DashboardCardTabs } from "@/lib/edge/analytics/contract/dashboard";
import type { FilterDocument } from "@/lib/filter-contract";
/**
 * A dashboard load in one request: the totals, the graph's points and the
 * top rows of `cards`, the tab each card shows.
 */
export async function fetchDashboard(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  cards: DashboardCardTabs | null,
  signal: AbortSignal,
): Promise<DashboardData> {
  return fetchPrivateJson<DashboardData>(
    "/api/private/dashboard",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
        ...cards,
      },
      filters,
    ),
    { signal },
  );
}
export async function fetchOverview(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: {
    includeDetail?: boolean;
    signal?: AbortSignal;
  },
): Promise<OverviewData> {
  return fetchPrivateJson<OverviewData>(
    "/api/private/overview",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        ...(options?.includeDetail
          ? { includeDetail: 1, interval: window.interval }
          : {}),
      },
      filters,
    ),
    { signal: options?.signal },
  );
}
export async function fetchTrend(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: { signal?: AbortSignal },
): Promise<TrendData> {
  return fetchPrivateJson<TrendData>(
    "/api/private/trend",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
      },
      filters,
    ),
    { signal: options?.signal },
  );
}
export async function fetchPages(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    cursor?: string | null;
    signal?: AbortSignal;
  },
): Promise<PagesData> {
  return fetchPrivateJson<PagesData>(
    "/api/private/pages",
    withFilters(
      withPagination(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
        },
        options,
        100,
      ),
      filters,
    ),
    { signal: options?.signal },
  );
}
