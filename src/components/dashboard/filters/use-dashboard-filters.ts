import { useCallback } from "react";

import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import {
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import {
  EMPTY_DASHBOARD_FILTER_DOCUMENT,
  serializeDashboardSearchParams,
  withDashboardFilterSearchParams,
} from "@/lib/dashboard/filter-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import { usePathname } from "@/lib/router";

/** Sets the page's filters, in the page and its address. */
export function useApplyDashboardFilters(): (document: FilterDocument) => void {
  const { setUiFilters } = useDashboardQueryControls();
  const searchParams = useLiveSearchParams();
  const pathname = usePathname() || "/";
  return useCallback(
    (document: FilterDocument) => {
      setUiFilters(document);
      const query = serializeDashboardSearchParams(
        withDashboardFilterSearchParams(searchParams, document),
      );
      const current = serializeDashboardSearchParams(searchParams);
      if (query === current) return;
      replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams, setUiFilters],
  );
}

/** Removes every filter from the page and its address. */
export function useClearDashboardFilters(): () => void {
  const applyFilters = useApplyDashboardFilters();
  return useCallback(
    () => applyFilters(EMPTY_DASHBOARD_FILTER_DOCUMENT),
    [applyFilters],
  );
}
