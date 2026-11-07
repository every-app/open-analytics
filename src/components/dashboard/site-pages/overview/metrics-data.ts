import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchOverview } from "@/lib/dashboard/client/data/index";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  OverviewData,
  OverviewMetrics,
  TrendPoint,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";

export interface OverviewSummary {
  current: OverviewMetrics;
  currentPoints: TrendPoint[];
  /** What the stats' changes are measured against. */
  reference: OverviewMetrics;
  /** The comparison's points, when Compare is on. */
  comparisonPoints?: TrendPoint[];
}

function detailPoints(overview: OverviewData): TrendPoint[] {
  if (!overview.detail) throw new Error("overview_detail_missing");
  return overview.detail.data;
}

/**
 * The totals and per-interval points the top stats and the main graph read.
 * With Compare on, the comparison's totals and points come along; without,
 * the change is against the previous period. A failed request fails the
 * query, so the stats and graph say so instead of showing zeros.
 */
export async function fetchOverviewSummary(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  comparisonQuery: DashboardComparisonQuery | null,
  signal: AbortSignal,
): Promise<OverviewSummary> {
  if (comparisonQuery) {
    const [current, comparison] = await Promise.all([
      fetchOverview(siteId, window, filters, { includeDetail: true, signal }),
      fetchOverview(siteId, comparisonQuery.window, comparisonQuery.filters, {
        includeDetail: true,
        signal,
      }),
    ]);
    return {
      current: current.data,
      currentPoints: detailPoints(current),
      reference: comparison.data,
      comparisonPoints: detailPoints(comparison),
    };
  }
  const current = await fetchOverview(siteId, window, filters, {
    includeChange: true,
    includeDetail: true,
    signal,
  });
  if (!current.previousData) throw new Error("overview_previous_missing");
  return {
    current: current.data,
    currentPoints: detailPoints(current),
    reference: current.previousData,
  };
}

export function useOverviewSummaryQuery({
  siteId,
  window,
  filters,
  comparisonQuery,
}: {
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  comparisonQuery: DashboardComparisonQuery | null;
}) {
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonKey = comparisonQuery
    ? [
        comparisonQuery.mode,
        comparisonQuery.window.from,
        comparisonQuery.window.to,
        filterQueryKey(comparisonQuery.filters),
      ]
    : ["none"];
  return useQuery({
    queryKey: [
      "dashboard",
      "overview-summary",
      siteId,
      window.from,
      window.to,
      window.interval,
      window.timeZone,
      filtersKey,
      ...comparisonKey,
    ],
    queryFn: ({ signal }) =>
      fetchOverviewSummary(siteId, window, filters, comparisonQuery, signal),
    enabled: typeof globalThis.window !== "undefined",
    placeholderData: keepPreviousData,
  });
}
