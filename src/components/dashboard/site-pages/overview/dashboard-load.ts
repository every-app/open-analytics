import { useMemo, useState } from "react";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import { fetchDashboard } from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  DashboardCard,
  type DashboardCardTabs,
  DevicesCardTab,
  LocationsCardTab,
  PagesCardTab,
  SourcesCardTab,
} from "@/lib/edge/analytics/contract/dashboard";
import type { FilterDocument } from "@/lib/filter-contract/index";

/** The tabs the cards open on, as in Plausible. */
const DEFAULT_CARD_TABS: DashboardCardTabs = {
  [DashboardCard.Sources]: SourcesCardTab.Channel,
  [DashboardCard.Pages]: PagesCardTab.Path,
  [DashboardCard.Locations]: LocationsCardTab.Map,
  [DashboardCard.Devices]: DevicesCardTab.Browser,
};

function dashboardQuery(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  filtersKey: string,
  cards: DashboardCardTabs | null,
) {
  return queryOptions({
    queryKey: [
      "dashboard",
      "load",
      siteId,
      window.from,
      window.to,
      window.interval,
      window.timeZone,
      filtersKey,
      cards ? Object.values(cards).join(",") : "no-cards",
    ],
    queryFn: ({ signal }) =>
      fetchDashboard(siteId, window, filters, cards, signal),
    enabled: typeof globalThis.window !== "undefined",
    placeholderData: keepPreviousData,
  });
}

export interface DashboardLoad {
  /** The tab each card shows. */
  readonly tabs: DashboardCardTabs;
  readonly setTabs: (tabs: DashboardCardTabs) => void;
  /**
   * The tabs whose top rows the load brings: those shown when the range,
   * filters or Compare last changed. A tab picked since reads its own rows,
   * so picking one doesn't reload the page. None while Compare is on.
   */
  readonly cards: DashboardCardTabs | null;
  readonly query: ReturnType<typeof dashboardQuery>;
}

/**
 * The dashboard's one request for the top stats, the graph and the cards'
 * top rows, and the tabs the cards show.
 */
export function useDashboardLoad(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  comparing: boolean,
): DashboardLoad {
  const [tabs, setTabs] = useState(DEFAULT_CARD_TABS);
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const loadKey = [
    siteId,
    window.from,
    window.to,
    window.interval,
    window.timeZone,
    filtersKey,
    comparing,
  ].join("|");
  const [loaded, setLoaded] = useState({ key: loadKey, tabs });
  // A new range, filter or comparison loads the tabs shown now.
  if (loaded.key !== loadKey) setLoaded({ key: loadKey, tabs });
  const loadedTabs = loaded.key === loadKey ? loaded.tabs : tabs;
  const cards = comparing ? null : loadedTabs;
  const query = useMemo(
    () => dashboardQuery(siteId, window, filters, filtersKey, cards),
    [cards, filters, filtersKey, siteId, window],
  );
  return { tabs, setTabs, cards, query };
}
