import { emptyDashboardFilterOptions } from "@/lib/dashboard/client/data/empty";
import type {
  DashboardFilterOptionKey,
  DashboardListRequestOptions,
  OverviewClientDimensionTab,
  OverviewPageCardTab,
  OverviewSourceCardTab,
} from "@/lib/dashboard/client/data/types";
import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import {
  normalizeOverviewRows,
  normalizePaginatedCollection,
  withComparison,
  withFilters,
  withPagination,
} from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  DashboardFilterOptionsData,
  OverviewTabData,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument, FilterScope } from "@/lib/filter-contract";
type OverviewTableRequestOptions = DashboardListRequestOptions & {
  resolvedScope?: FilterScope;
};
const clientPathByTab: Record<OverviewClientDimensionTab, string> = {
  browser: "browser",
  osVersion: "os-version",
  deviceType: "device-type",
};
export async function fetchOverviewPageCardTab(
  siteId: string,
  window: TimeWindow,
  tab: OverviewPageCardTab,
  filters?: FilterDocument,
  options?: OverviewTableRequestOptions,
): Promise<OverviewTabData["data"]> {
  const payload = await fetchPrivateJson<OverviewTabData>(
    `/api/private/overview-page-${tab}`,
    withComparison(
      withFilters(
        withPagination(
          {
            siteId,
            from: window.from,
            to: window.to,
            timeZone: window.timeZone,
            ...(options?.search?.trim()
              ? { search: options.search.trim() }
              : {}),
            ...(options?.sort ? { sort: options.sort } : {}),
            ...(options?.direction ? { direction: options.direction } : {}),
          },
          options,
          100,
        ),
        filters,
        options?.resolvedScope,
      ),
      options?.comparison,
      {
        metric: options?.comparisonMetric,
        sortBy: options?.comparisonSortBy,
      },
    ),
    { signal: options?.signal },
  );
  const data = normalizePaginatedCollection<
    OverviewTabData["data"]["items"][number]
  >(payload.data);
  return { ...data, items: normalizeOverviewRows(data.items) };
}
export async function fetchOverviewSourceCardTab(
  siteId: string,
  window: TimeWindow,
  tab: OverviewSourceCardTab,
  filters?: FilterDocument,
  options?: OverviewTableRequestOptions,
): Promise<OverviewTabData["data"]> {
  const payload = await fetchPrivateJson<OverviewTabData>(
    `/api/private/overview-source-${tab}`,
    withComparison(
      withFilters(
        withPagination(
          {
            siteId,
            from: window.from,
            to: window.to,
            timeZone: window.timeZone,
            ...(options?.search?.trim()
              ? { search: options.search.trim() }
              : {}),
            ...(options?.sort ? { sort: options.sort } : {}),
            ...(options?.direction ? { direction: options.direction } : {}),
          },
          options,
          100,
        ),
        filters,
        options?.resolvedScope,
      ),
      options?.comparison,
      {
        metric: options?.comparisonMetric,
        sortBy: options?.comparisonSortBy,
      },
    ),
    { signal: options?.signal },
  );
  const data = normalizePaginatedCollection<
    OverviewTabData["data"]["items"][number]
  >(payload.data);
  return { ...data, items: normalizeOverviewRows(data.items) };
}
export async function fetchOverviewClientDimensionTab(
  siteId: string,
  window: TimeWindow,
  tab: OverviewClientDimensionTab,
  filters?: FilterDocument,
  options?: OverviewTableRequestOptions,
): Promise<OverviewTabData["data"]> {
  const payload = await fetchPrivateJson<OverviewTabData>(
    `/api/private/overview-client-${clientPathByTab[tab]}`,
    withComparison(
      withFilters(
        withPagination(
          {
            siteId,
            from: window.from,
            to: window.to,
            timeZone: window.timeZone,
            ...(options?.search?.trim()
              ? { search: options.search.trim() }
              : {}),
            ...(options?.sort ? { sort: options.sort } : {}),
            ...(options?.direction ? { direction: options.direction } : {}),
          },
          options,
          100,
        ),
        filters,
        options?.resolvedScope,
      ),
      options?.comparison,
      {
        metric: options?.comparisonMetric,
        sortBy: options?.comparisonSortBy,
      },
    ),
    { signal: options?.signal },
  );
  const data = normalizePaginatedCollection<
    OverviewTabData["data"]["items"][number]
  >(payload.data);
  return { ...data, items: normalizeOverviewRows(data.items) };
}
export async function fetchFilterValues(
  siteId: string,
  window: TimeWindow,
  filterKey: DashboardFilterOptionKey,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    signal?: AbortSignal;
    resolvedScope?: FilterScope;
  },
): Promise<DashboardFilterOptionsData["data"]> {
  const payload = await fetchPrivateJson<DashboardFilterOptionsData>(
    "/api/private/filter-values",
    withFilters(
      withPagination(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
          filterKey,
          ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
        },
        options,
        200,
      ),
      filters,
      options?.resolvedScope,
    ),
    { signal: options?.signal },
  ).catch(() => emptyDashboardFilterOptions());
  return normalizePaginatedCollection<
    DashboardFilterOptionsData["data"]["items"][number]
  >(payload.data);
}
