import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchOverview } from "@/lib/dashboard/client/data/index";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  OverviewMetrics,
  TrendPoint,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";

import type { DashboardLoad } from "./dashboard-load";

export interface OverviewSummary {
  current: OverviewMetrics;
  currentPoints: TrendPoint[];
  /** What the stats' changes are measured against. */
  reference: OverviewMetrics;
  /** The comparison's points, when Compare is on. */
  comparisonPoints?: TrendPoint[];
}

interface ReferenceSummary {
  reference: OverviewMetrics;
  comparisonPoints?: TrendPoint[];
}

/** The period just before `window`, as long as it. */
export function previousPeriod(window: TimeWindow): TimeWindow {
  return { ...window, from: 2 * window.from - window.to, to: window.from };
}

/**
 * What the stats' changes are measured against: with Compare on, the
 * comparison's totals and points; without, the previous period's totals.
 */
export async function fetchReferenceSummary(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  comparisonQuery: DashboardComparisonQuery | null,
  signal: AbortSignal,
): Promise<ReferenceSummary> {
  if (comparisonQuery) {
    const comparison = await fetchOverview(
      siteId,
      comparisonQuery.window,
      comparisonQuery.filters,
      { includeDetail: true, signal },
    );
    if (!comparison.detail) throw new Error("overview_detail_missing");
    return {
      reference: comparison.data,
      comparisonPoints: comparison.detail.data,
    };
  }
  const previous = await fetchOverview(
    siteId,
    previousPeriod(window),
    filters,
    { signal },
  );
  return { reference: previous.data };
}

/**
 * The totals and per-interval points the top stats and the main graph read:
 * the dashboard load's, and what they're measured against. A failed request
 * fails the summary, so the stats and graph say so instead of showing zeros.
 */
export function useOverviewSummaryQuery({
  siteId,
  window,
  filters,
  comparisonQuery,
  load,
}: {
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  comparisonQuery: DashboardComparisonQuery | null;
  load: DashboardLoad;
}) {
  const current = useQuery(load.query);
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonKey = comparisonQuery
    ? [
        comparisonQuery.mode,
        comparisonQuery.window.from,
        comparisonQuery.window.to,
        filterQueryKey(comparisonQuery.filters),
      ]
    : ["previous"];
  const reference = useQuery({
    queryKey: [
      "dashboard",
      "overview-reference",
      siteId,
      window.from,
      window.to,
      window.interval,
      window.timeZone,
      filtersKey,
      ...comparisonKey,
    ],
    queryFn: ({ signal }) =>
      fetchReferenceSummary(siteId, window, filters, comparisonQuery, signal),
    enabled: typeof globalThis.window !== "undefined",
    placeholderData: keepPreviousData,
  });
  const data = useMemo<OverviewSummary | undefined>(
    () =>
      current.data && reference.data
        ? {
            current: current.data.overview,
            currentPoints: current.data.trend.data,
            ...reference.data,
          }
        : undefined,
    [current.data, reference.data],
  );
  return {
    data,
    isPlaceholderData: current.isPlaceholderData || reference.isPlaceholderData,
    isFetching: current.isFetching || reference.isFetching,
    isError: current.isError || reference.isError,
    refetch: () => Promise.all([current.refetch(), reference.refetch()]),
  };
}
