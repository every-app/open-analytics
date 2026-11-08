import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const fetchDashboard = vi.hoisted(() => vi.fn());
const fetchOverview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dashboard/client/data/index", () => ({
  fetchDashboard,
  fetchOverview,
}));

import {
  type DashboardLoad,
  useDashboardLoad,
} from "@/components/dashboard/site-pages/overview/dashboard-load";
import {
  previousPeriod,
  useOverviewSummaryQuery,
} from "@/components/dashboard/site-pages/overview/metrics-data";
import { EMPTY_DASHBOARD_FILTER_DOCUMENT } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  DashboardCard,
  DevicesCardTab,
  LocationsCardTab,
  PagesCardTab,
  SourcesCardTab,
} from "@/lib/edge/analytics/contract/dashboard";
import { analyticsFilterRegistry, parseFilterDsl } from "@/lib/filter-contract";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const window: TimeWindow = {
  preset: "7d",
  from: 7_000,
  to: 14_000,
  interval: "day",
  timeZone: "UTC",
};
const DEFAULT_TABS = {
  [DashboardCard.Sources]: SourcesCardTab.Channel,
  [DashboardCard.Pages]: PagesCardTab.Path,
  [DashboardCard.Locations]: LocationsCardTab.Map,
  [DashboardCard.Devices]: DevicesCardTab.Browser,
};
const totals = (visitors: number) => ({
  views: visitors * 2,
  sessions: visitors,
  visitors,
  bounces: 0,
  totalDurationMs: 0,
  avgDurationMs: 0,
  bounceRate: 0,
});

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  fetchDashboard.mockReset();
  fetchOverview.mockReset();
});

/** Renders `element`; the function returned renders it again with new props. */
function render(element: ReturnType<typeof createElement>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const show = (next: ReturnType<typeof createElement>) =>
    act(() =>
      root!.render(createElement(QueryClientProvider, { client }, next)),
    );
  show(element);
  return show;
}

describe("the dashboard load", () => {
  it("brings the tabs shown when the range or filters last changed, and no cards while comparing", () => {
    let load: DashboardLoad | undefined;
    function Probe(props: { filter: string; comparing: boolean }) {
      load = useDashboardLoad(
        "site-1",
        window,
        props.filter
          ? parseFilterDsl(props.filter, analyticsFilterRegistry)
          : EMPTY_DASHBOARD_FILTER_DOCUMENT,
        props.comparing,
      );
      return null;
    }
    const rerender = render(
      createElement(Probe, { filter: "", comparing: false }),
    );
    expect(load?.cards).toEqual(DEFAULT_TABS);
    const firstKey = load?.query.queryKey;

    // Picking a tab doesn't reload the page: the tab reads its own rows.
    act(() =>
      load!.setTabs({
        ...load!.tabs,
        [DashboardCard.Pages]: PagesCardTab.Exit,
      }),
    );
    expect(load?.tabs[DashboardCard.Pages]).toBe(PagesCardTab.Exit);
    expect(load?.cards).toEqual(DEFAULT_TABS);
    expect(load?.query.queryKey).toEqual(firstKey);

    // A new filter loads the tabs shown now.
    rerender(
      createElement(Probe, {
        filter: 'page.path eq "/pricing"',
        comparing: false,
      }),
    );
    expect(load?.cards).toEqual({
      ...DEFAULT_TABS,
      [DashboardCard.Pages]: PagesCardTab.Exit,
    });

    rerender(
      createElement(Probe, {
        filter: 'page.path eq "/pricing"',
        comparing: true,
      }),
    );
    expect(load?.cards).toBeNull();
  });

  it("measures the load's totals against the period just before", async () => {
    fetchDashboard.mockResolvedValue({
      ok: true,
      overview: totals(10),
      trend: { interval: "day", data: [{ timestampMs: 7_000, visitors: 10 }] },
      cards: {},
    });
    fetchOverview.mockResolvedValue({ ok: true, data: totals(8) });
    let summary: ReturnType<typeof useOverviewSummaryQuery> | undefined;
    function Probe() {
      const load = useDashboardLoad(
        "site-1",
        window,
        EMPTY_DASHBOARD_FILTER_DOCUMENT,
        false,
      );
      summary = useOverviewSummaryQuery({
        siteId: "site-1",
        window,
        filters: EMPTY_DASHBOARD_FILTER_DOCUMENT,
        comparisonQuery: null,
        load,
      });
      return null;
    }
    render(createElement(Probe));

    await vi.waitFor(() =>
      expect(summary?.data).toEqual({
        current: totals(10),
        currentPoints: [{ timestampMs: 7_000, visitors: 10 }],
        reference: totals(8),
      }),
    );
    expect(summary?.isError).toBe(false);
    expect(fetchDashboard).toHaveBeenCalledWith(
      "site-1",
      window,
      EMPTY_DASHBOARD_FILTER_DOCUMENT,
      DEFAULT_TABS,
      expect.any(AbortSignal),
    );
    expect(fetchOverview).toHaveBeenCalledWith(
      "site-1",
      previousPeriod(window),
      EMPTY_DASHBOARD_FILTER_DOCUMENT,
      { signal: expect.any(AbortSignal) },
    );

    // Retrying reloads both.
    await act(() => summary!.refetch());
    expect(fetchDashboard).toHaveBeenCalledTimes(2);
    expect(fetchOverview).toHaveBeenCalledTimes(2);
  });
});
