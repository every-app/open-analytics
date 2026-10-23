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
import { serializeFilterScopeToSearchParams } from "@/lib/dashboard/query-state";
import { usePathname } from "@/lib/router";

/** Removes every filter from the page and its address. */
export function useClearDashboardFilters(): () => void {
  const { setUiFilters } = useDashboardQueryControls();
  const searchParams = useLiveSearchParams();
  const pathname = usePathname() || "/";
  return useCallback(() => {
    setUiFilters(EMPTY_DASHBOARD_FILTER_DOCUMENT);
    const params = serializeFilterScopeToSearchParams(
      withDashboardFilterSearchParams(
        searchParams,
        EMPTY_DASHBOARD_FILTER_DOCUMENT,
      ),
      "auto",
    );
    const query = serializeDashboardSearchParams(params);
    replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams, setUiFilters]);
}
