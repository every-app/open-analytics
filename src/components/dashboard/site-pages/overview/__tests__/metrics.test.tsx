import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardLoad } from "@/components/dashboard/site-pages/overview/dashboard-load";
import { OverviewMetricsSection } from "@/components/dashboard/site-pages/overview/metrics";
import type { OverviewSummary } from "@/components/dashboard/site-pages/overview/metrics-data";
import { replaceUrlWithoutNavigation } from "@/lib/dashboard/client/history";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { OverviewMetrics } from "@/lib/dashboard-api/client/edge";
import { analyticsFilterRegistry, parseFilterDsl } from "@/lib/filter-contract";
import { getMessages } from "@/lib/i18n/messages";

const summary = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("@/components/dashboard/site-pages/overview/metrics-data", () => ({
  useOverviewSummaryQuery: () => ({
    data: summary.data,
    isPlaceholderData: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock(
  "@/components/dashboard/comparison/use-dashboard-comparison-query",
  () => ({
    useDashboardComparisonQuery: () => null,
    dashboardComparisonLabel: () => "",
  }),
);
vi.mock("@/lib/dashboard/client/history", () => ({
  useLiveSearchParams: () => new URLSearchParams(),
  replaceUrlWithoutNavigation: vi.fn(),
}));
vi.mock("@/lib/router", () => ({ usePathname: () => "/overview" }));
vi.mock("@insightflare/product-ui/charts", () => ({
  MetricAreaChart: () => null,
}));
vi.mock("@/components/dashboard/charts/metric-trend-chart", () => ({
  MetricTrendChart: () => null,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const window: TimeWindow = {
  preset: "custom",
  from: Date.UTC(2026, 10, 1),
  to: Date.UTC(2026, 10, 2),
  interval: "hour",
  timeZone: "UTC",
};

function metrics(scrollDepth?: number | null): OverviewMetrics {
  return {
    views: 4,
    sessions: 3,
    visitors: 2,
    bounces: 1,
    totalDurationMs: 30_000,
    avgDurationMs: 10_000,
    bounceRate: 1 / 3,
    scrollDepth,
  };
}

let root: Root | undefined;

function renderStats(filter: string, current: OverviewMetrics): HTMLElement {
  summary.data = {
    current,
    currentPoints: [],
    reference: metrics(50),
  } satisfies OverviewSummary;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <OverviewMetricsSection
        locale="en"
        messages={getMessages("en")}
        siteId="site-1"
        window={window}
        filters={parseFilterDsl(filter, analyticsFilterRegistry)}
        load={{} as DashboardLoad}
      />,
    ),
  );
  return container;
}

const tiles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button"));

describe("the top stats' scroll depth", () => {
  afterEach(() => {
    act(() => root?.unmount());
    document.body.replaceChildren();
  });

  it("shows a tile with a page path filter, and graphs it when picked", () => {
    const container = renderStats('page.path eq "/pricing"', metrics(65));

    expect(tiles(container)).toHaveLength(6);
    const tile = tiles(container).find((button) =>
      button.textContent?.includes("Scroll depth"),
    )!;
    expect(
      tiles(container).some((button) =>
        button.textContent?.includes("Views per visit"),
      ),
    ).toBe(false);
    expect(tile.textContent).toContain("Scroll depth");
    expect(tile.textContent).toContain("65%");
    // Up from the reference's 50.
    expect(tile.textContent).toContain("+30.0%");

    act(() => tile.click());
    expect(replaceUrlWithoutNavigation).toHaveBeenCalledWith(
      "/overview?metric=scrollDepth",
    );
  });

  it("isn't shown without one", () => {
    const container = renderStats('geo.country eq "US"', metrics());

    expect(tiles(container)).toHaveLength(6);
    expect(container.textContent).not.toContain("Scroll depth");
  });
});
