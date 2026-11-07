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
import {
  attachFilterScopePreference,
  type FilterDocument,
} from "@/lib/filter-contract/index";
import { usePathname } from "@/lib/router";

/**
 * Sets the page's filters, in the page and its address. The page's scope
 * stays as picked (a card's request may carry the scope Auto resolved to,
 * which the address doesn't take); with no filters left, it goes back to
 * Auto.
 */
export function useApplyDashboardFilters(): (document: FilterDocument) => void {
  const { setUiFilters, scopePreference } = useDashboardQueryControls();
  const searchParams = useLiveSearchParams();
  const pathname = usePathname() || "/";
  return useCallback(
    (document: FilterDocument) => {
      const scope = document.root ? scopePreference : "auto";
      const scoped = attachFilterScopePreference(document, scope);
      setUiFilters(scoped);
      const params = serializeFilterScopeToSearchParams(
        withDashboardFilterSearchParams(searchParams, scoped),
        scope,
      );
      const query = serializeDashboardSearchParams(params);
      const current = serializeDashboardSearchParams(searchParams);
      if (query === current) return;
      replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, scopePreference, searchParams, setUiFilters],
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
