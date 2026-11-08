import { useMemo } from "react";

import { useLiveSearchParams } from "@/lib/dashboard/client/history";
import {
  type DashboardComparisonQuery,
  resolveDashboardComparisonQuery,
} from "@/lib/dashboard/comparison-query";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
export function useDashboardComparisonQuery(
  timeWindow: TimeWindow,
  filters: FilterDocument,
): DashboardComparisonQuery | null {
  const searchParams = useLiveSearchParams();
  const searchParamsKey = searchParams.toString();
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);

  return useMemo(
    () =>
      resolveDashboardComparisonQuery(
        new URLSearchParams(searchParamsKey),
        timeWindow,
        filters,
      ),
    [
      filters,
      filtersKey,
      searchParamsKey,
      timeWindow.from,
      timeWindow.interval,
      timeWindow.timeZone,
      timeWindow.to,
    ],
  );
}
/**
 * What the comparison series is called: the period it reads when it follows
 * the page's filters, or just "Compare" when it has filters of its own.
 */
export function dashboardComparisonLabel(
  messages: AppMessages,
  comparisonQuery: DashboardComparisonQuery | null | undefined,
): string {
  if (!comparisonQuery || comparisonQuery.filters.conditions.length > 0) {
    return messages.dashboardHeader.compareButton;
  }
  if (comparisonQuery.mode === "previous") {
    return messages.dashboardHeader.previousPeriod;
  }
  if (comparisonQuery.mode === "year") {
    return messages.dashboardHeader.yearAgo;
  }
  return messages.dashboardHeader.compareButton;
}
