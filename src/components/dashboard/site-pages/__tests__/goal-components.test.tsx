import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionGlobalConfig } from "motion/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("@/lib/dashboard/client/data", () => ({
  fetchGoalDefinition: vi.fn(),
  fetchGoalSummary: vi.fn(),
  fetchGoalTimeseries: vi.fn(),
}));
vi.mock("@/components/dashboard/filters/filter-editor", () => ({
  FilterDslEditor: (props: {
    audience: string;
    initialFilterDsl: string;
    onApply: (filterDsl: string) => void;
  }) =>
    createElement(
      "div",
      {
        "data-audience": props.audience,
        "data-initial-filter-dsl": props.initialFilterDsl,
      },
      createElement(
        "button",
        {
          type: "button",
          onClick: () => props.onApply(props.initialFilterDsl),
        },
        "Apply mocked filter",
      ),
    ),
}));
import { LayerManagerProvider } from "@insightflare/ui/layer-manager";

import { FunnelStepFilterDialog } from "@/components/dashboard/site-pages/funnels/funnel-step-filter-dialog";
import { GoalCard } from "@/components/dashboard/site-pages/goals/goal-card";
import {
  GoalDetail,
  goalSummaryQueryKey,
  goalTimeseriesQueryKey,
} from "@/components/dashboard/site-pages/goals/goal-detail";
import { GoalEditor } from "@/components/dashboard/site-pages/goals/goal-editor";
import { goalDefinitionQueryKey } from "@/components/dashboard/site-pages/goals/use-goal-conversions";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import {
  fetchGoalSummary,
  fetchGoalTimeseries,
} from "@/lib/dashboard/client/data";
import type {
  GoalDefinition,
  GoalSummaryData,
  GoalTimeseriesData,
} from "@/lib/dashboard-api/client/edge";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/filter-contract";
import { getMessages } from "@/lib/i18n/messages";
const messages = getMessages("en");
const labels = messages.goals;
const filters = EMPTY_FILTER_DOCUMENT;
const window = {
  preset: "7d" as const,
  from: 1_000,
  to: 10_000,
  interval: "day" as const,
  timeZone: "UTC",
};
const goal: GoalDefinition = {
  id: "goal-1",
  siteId: "site-1",
  name: "Purchase completed",
  filterDslVersion: 1,
  filterDsl: 'event.name eq "purchase"',
  semanticFingerprint: "goal-v1-purchase",
  createdAt: 1,
  updatedAt: 2,
};
const summary: GoalSummaryData = {
  ok: true,
  data: {
    goal,
    summary: {
      sessions: { total: 10, converted: 2, conversionRate: 0.2 },
      visitors: { total: 8, converted: 1, conversionRate: 0.125 },
      conversions: 3,
      revenue: null,
    },
  },
};
const timeseries: GoalTimeseriesData = {
  ok: true,
  data: {
    goal,
    interval: "day",
    timeseries: [
      {
        timestampMs: 1_000,
        sessions: { total: 5, converted: 1, conversionRate: 0.2 },
        visitors: { total: 4, converted: 1, conversionRate: 0.25 },
      },
    ],
  },
};
function renderWithQueryClient(
  element: ReactNode,
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 15_000 },
    },
  }),
): {
  readonly client: QueryClient;
  readonly container: HTMLDivElement;
  readonly root: Root;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(
        LayerManagerProvider,
        null,
        createElement(
          TimeZoneProvider,
          null,
          createElement(QueryClientProvider, { client }, element),
        ),
      ),
    );
  });
  return { client, container, root };
}
function buttonWithText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.body.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text),
  );
}
/** Selects a Radix tab the way a pointer does: on mouse down. */
function selectTab(label: string) {
  const tab = Array.from(document.body.querySelectorAll('[role="tab"]')).find(
    (element) => element.textContent === label,
  );
  act(() => {
    tab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 }),
    );
  });
}
function typeInto(selector: string, value: string) {
  const input = document.body.querySelector<HTMLInputElement>(selector);
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  act(() => {
    setValue?.call(input, value);
    input?.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function inputValue(selector: string): string | undefined {
  return document.body.querySelector<HTMLInputElement>(selector)?.value;
}
describe("Goal dashboard components", () => {
  let intersectionCallback:
    ((entries: IntersectionObserverEntry[]) => void) | undefined;

  // A chart animation still running when a test unmounts would be canceled
  // after the test ends; finish animations at once instead.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });
  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchGoalSummary).mockResolvedValue(summary);
    vi.mocked(fetchGoalTimeseries).mockResolvedValue(timeseries);
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersectionCallback = (entries) => callback(entries, this as never);
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the summary it is given, and fetches nothing itself", () => {
    const onOpen = vi.fn();
    const { container, root } = renderWithQueryClient(
      createElement(GoalCard, {
        goal,
        locale: "en",
        labels,
        messages,
        summary: summary.data.summary,
        comparisonSummary: undefined,
        comparing: false,
        loadError: false,
        canManage: false,
        onOpen,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    expect(fetchGoalSummary).not.toHaveBeenCalled();
    expect(fetchGoalTimeseries).not.toHaveBeenCalled();
    expect(container.textContent).toContain("12.5%·1/ 8");
    expect(container.querySelector(`[aria-label="${labels.edit}"]`)).toBeNull();
    expect(
      container.querySelector(`[aria-label="${labels.delete}"]`),
    ).toBeNull();
    const openRegion = container.querySelector(
      `[role="button"][aria-label="${labels.open}: ${goal.name}"]`,
    );
    expect(
      container.querySelector('[data-slot="card"]')?.getAttribute("role"),
    ).toBeNull();
    expect(openRegion).not.toBeNull();
    expect(openRegion?.querySelector('[role="button"]')).toBeNull();
    act(() => {
      openRegion?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    container.remove();
  });

  it("says when a card's conversions couldn't load", () => {
    const { container, root } = renderWithQueryClient(
      createElement(GoalCard, {
        goal,
        locale: "en",
        labels,
        messages,
        summary: undefined,
        comparisonSummary: undefined,
        comparing: false,
        loadError: true,
        canManage: false,
        onOpen: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    expect(container.textContent).toContain(labels.detailLoadError);
    act(() => root.unmount());
    container.remove();
  });

  it("keeps deep-link definition keys independent of dashboard analysis state", () => {
    expect(goalDefinitionQueryKey("site-1", "goal-1")).toEqual([
      "dashboard",
      "goal-definition",
      "site-1",
      "goal-1",
    ]);
  });

  it("reads a cached summary in the detail view and only adds the timeseries query there", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: 15_000 },
      },
    });
    client.setQueryData(
      goalSummaryQueryKey("site-1", goal, window, "empty"),
      summary,
    );
    const { container, root } = renderWithQueryClient(
      createElement(GoalDetail, {
        goal,
        comparisonLabel: "Previous period",
        siteId: "site-1",
        locale: "en",
        labels,
        window,
        filters,
        filterKey: "empty",
        canManage: true,
        actionPending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
      client,
    );
    expect(goalTimeseriesQueryKey("site-1", goal, window, "empty")).toContain(
      window.interval,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchGoalSummary).not.toHaveBeenCalled();
    expect(fetchGoalTimeseries).toHaveBeenCalledTimes(1);
    expect(
      Array.from(container.querySelectorAll("button")).some((button) =>
        button.textContent?.includes(labels.edit),
      ),
    ).toBe(true);
    expect(
      Array.from(container.querySelectorAll("button")).some((button) =>
        button.textContent?.includes(labels.delete),
      ),
    ).toBe(true);
    expect(
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes(labels.edit),
      )?.disabled,
    ).toBe(false);
    expect(
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes(labels.delete),
      )?.disabled,
    ).toBe(false);
    expect(container.textContent).toContain('Event name equals "purchase"');
    expect(container.textContent).not.toContain(goal.filterDsl);
    act(() => root.unmount());
    container.remove();
  });

  it("separates analysis cache keys by range, filter, semantic identity, and interval", () => {
    const changedWindow = { ...window, to: window.to + 1_000 };
    const changedGoal = {
      ...goal,
      semanticFingerprint: `${goal.semanticFingerprint}-changed`,
    };
    const summaryKey = goalSummaryQueryKey("site-1", goal, window, "empty");

    expect(
      goalSummaryQueryKey("site-1", goal, changedWindow, "empty"),
    ).not.toEqual(summaryKey);
    expect(goalSummaryQueryKey("site-1", goal, window, "changed")).not.toEqual(
      summaryKey,
    );
    expect(
      goalSummaryQueryKey("site-1", changedGoal, window, "empty"),
    ).not.toEqual(summaryKey);

    const timeseriesKey = goalTimeseriesQueryKey(
      "site-1",
      goal,
      window,
      "empty",
    );
    expect(
      goalTimeseriesQueryKey(
        "site-1",
        goal,
        { ...window, interval: "hour" },
        "empty",
      ),
    ).not.toEqual(timeseriesKey);
  });

  it("renders both visitor and session series", async () => {
    const { container, root } = renderWithQueryClient(
      createElement(GoalDetail, {
        goal,
        comparisonLabel: "Previous period",
        siteId: "site-1",
        locale: "en",
        labels,
        window,
        filters,
        filterKey: "empty",
        canManage: false,
        actionPending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    await vi.waitFor(() =>
      expect(fetchGoalTimeseries).toHaveBeenCalledTimes(1),
    );
    await vi.waitFor(() =>
      expect(container.querySelector('[data-slot="chart"]')).not.toBeNull(),
    );
    expect(
      container.querySelector('[data-goal-series="visitors,sessions"]'),
    ).not.toBeNull();
    act(() => root.unmount());
    container.remove();
  });

  it("disables detail actions only while a definition mutation is pending", () => {
    vi.mocked(fetchGoalSummary).mockImplementation(
      () => new Promise<GoalSummaryData>(() => {}),
    );
    vi.mocked(fetchGoalTimeseries).mockImplementation(
      () => new Promise<GoalTimeseriesData>(() => {}),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const { container, root } = renderWithQueryClient(
      createElement(GoalDetail, {
        goal,
        comparisonLabel: "Previous period",
        siteId: "site-1",
        locale: "en",
        labels,
        window,
        filters,
        filterKey: "empty",
        canManage: true,
        actionPending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
      client,
    );
    const findAction = (label: string) =>
      Array.from(container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes(label),
      );
    expect(findAction(labels.edit)?.disabled).toBe(false);
    expect(findAction(labels.delete)?.disabled).toBe(false);

    act(() => {
      root.render(
        createElement(
          LayerManagerProvider,
          null,
          createElement(
            TimeZoneProvider,
            null,
            createElement(
              QueryClientProvider,
              { client },
              createElement(GoalDetail, {
                goal,
                comparisonLabel: "Previous period",
                siteId: "site-1",
                locale: "en",
                labels,
                window,
                filters,
                filterKey: "empty",
                canManage: true,
                actionPending: true,
                onEdit: vi.fn(),
                onDelete: vi.fn(),
              }),
            ),
          ),
        ),
      );
    });
    expect(findAction(labels.edit)?.disabled).toBe(true);
    expect(findAction(labels.delete)?.disabled).toBe(true);
    act(() => root.unmount());
    container.remove();
  });

  it("keeps the editor compact, counts conditions, and preserves raw DSL", async () => {
    const rawDsl = '  event.name eq "purchase"  ';
    const submit = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const { container, root } = renderWithQueryClient(
      createElement(GoalEditor, {
        open: true,
        goal: { ...goal, name: "Original goal", filterDsl: rawDsl },
        labels,
        messages,
        siteId: "site-1",
        window,
        submitting: false,
        onOpenChange,
        onSubmit: submit,
      }),
    );

    const filterButton = Array.from(
      document.body.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes(`${labels.filter} (1)`));
    expect(filterButton).toBeDefined();
    expect(filterButton?.className).toContain("w-full");
    act(() => filterButton?.click());
    const filterEditor = document.body.querySelector(
      '[data-audience="private-dashboard"]',
    );
    expect(filterEditor).not.toBeNull();
    expect(filterEditor?.getAttribute("data-initial-filter-dsl")).toBe(rawDsl);

    const apply = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "Apply mocked filter",
    );
    act(() => apply?.click());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    const save = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.includes(labels.saveEdit),
    );
    act(() => save?.click());
    await vi.waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        name: "Original goal",
        filterDsl: rawDsl,
        currency: null,
      }),
    );
    act(() => root.unmount());
    container.remove();
  });

  it("saves a goal's revenue currency, and refuses one on a goal that matches page views", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const renderEditor = (filterDsl: string) =>
      renderWithQueryClient(
        createElement(GoalEditor, {
          open: true,
          goal: { ...goal, filterDsl, currency: "EUR" },
          labels,
          messages,
          siteId: "site-1",
          window,
          submitting: false,
          onOpenChange: vi.fn(),
          onSubmit: submit,
        }),
      );
    const saveButton = () =>
      Array.from(document.body.querySelectorAll("button")).find((button) =>
        button.textContent?.includes(labels.saveEdit),
      );

    const eventGoal = renderEditor('event.name eq "purchase"');
    expect(document.body.textContent).toContain(labels.revenueCurrency);
    expect(document.body.textContent).toContain(labels.revenueCurrencyHint);
    act(() => saveButton()?.click());
    await vi.waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        name: goal.name,
        filterDsl: 'event.name eq "purchase"',
        currency: "EUR",
      }),
    );
    act(() => eventGoal.root.unmount());
    eventGoal.container.remove();

    const pageGoal = renderEditor('page.path eq "/thank-you"');
    expect(document.body.textContent).toContain(
      labels.revenueCurrencyEventsOnly,
    );
    expect(saveButton()?.disabled).toBe(true);
    act(() => pageGoal.root.unmount());
    pageGoal.container.remove();
  });

  it("creates a scroll depth goal from a threshold and a wildcard path, named like Plausible", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const { container, root } = renderWithQueryClient(
      createElement(GoalEditor, {
        open: true,
        goal: null,
        labels,
        messages,
        siteId: "site-1",
        window,
        submitting: false,
        onOpenChange: vi.fn(),
        onSubmit: submit,
      }),
    );
    expect(document.body.querySelector("#goal-scroll-threshold")).toBeNull();

    selectTab(labels.triggerScrollDepth);
    expect(inputValue("#goal-scroll-threshold")).toBe("75");
    // A scroll depth goal matches page views, so it has no revenue.
    expect(document.body.textContent).not.toContain(labels.revenueCurrency);
    expect(document.body.textContent).toContain(labels.pagePathHint);
    expect(
      document.body.querySelector("#goal-name")?.getAttribute("placeholder"),
    ).toBe("Scroll 75%");

    typeInto("#goal-scroll-threshold", "0");
    expect(document.body.textContent).toContain(labels.scrollThresholdInvalid);
    expect(buttonWithText(labels.save)?.disabled).toBe(true);
    typeInto("#goal-scroll-threshold", "60");
    typeInto("#goal-page-path", "/a/*/b/*");
    expect(document.body.textContent).toContain(
      labels.pagePathWildcardUnsupported,
    );
    expect(buttonWithText(labels.save)?.disabled).toBe(true);
    typeInto("#goal-page-path", "/blog*");
    expect(
      document.body.querySelector("#goal-name")?.getAttribute("placeholder"),
    ).toBe("Scroll 60% on /blog*");

    act(() => buttonWithText(labels.save)?.click());
    await vi.waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        name: "Scroll 60% on /blog*",
        filterDsl: 'page.path startsWith "/blog" AND page.scrollDepth gte 60',
        currency: null,
      }),
    );
    act(() => root.unmount());
    container.remove();
  });

  it("reopens a scroll depth goal with its threshold and path, and any other filter in the generic editor", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const filterDsl =
      'page.path startsWith "/products/" AND page.path endsWith "/reviews" AND page.path notIn ["/products/reviews"] AND page.scrollDepth gte 90';
    const { container, root } = renderWithQueryClient(
      createElement(GoalEditor, {
        open: true,
        goal: { ...goal, name: "Read reviews", filterDsl },
        labels,
        messages,
        siteId: "site-1",
        window,
        submitting: false,
        onOpenChange: vi.fn(),
        onSubmit: submit,
      }),
    );

    const selectedTab = document.body.querySelector(
      '[role="tab"][aria-selected="true"]',
    );
    expect(selectedTab?.textContent).toBe(labels.triggerScrollDepth);
    expect(inputValue("#goal-scroll-threshold")).toBe("90");
    expect(inputValue("#goal-page-path")).toBe("/products/*/reviews");
    act(() => buttonWithText(labels.saveEdit)?.click());
    await vi.waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        name: "Read reviews",
        filterDsl,
        currency: null,
      }),
    );

    // The same filter, opened as a generic one, keeps its conditions.
    selectTab(labels.triggerFilter);
    expect(buttonWithText(`${labels.filter} (4)`)).toBeDefined();
    act(() => root.unmount());
    container.remove();

    const generic = renderWithQueryClient(
      createElement(GoalEditor, {
        open: true,
        goal: {
          ...goal,
          filterDsl: 'page.path eq "/pricing" AND page.scrollDepth gt 75',
        },
        labels,
        messages,
        siteId: "site-1",
        window,
        submitting: false,
        onOpenChange: vi.fn(),
        onSubmit: submit,
      }),
    );
    expect(
      document.body.querySelector('[role="tab"][aria-selected="true"]')
        ?.textContent,
    ).toBe(labels.triggerFilter);
    expect(buttonWithText(`${labels.filter} (2)`)).toBeDefined();
    act(() => generic.root.unmount());
    generic.container.remove();
  });

  it("carries a scroll goal's edits to the filter trigger and back", async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    const { container, root } = renderWithQueryClient(
      createElement(GoalEditor, {
        open: true,
        goal: {
          ...goal,
          name: "Read pricing",
          filterDsl: 'page.path eq "/pricing" AND page.scrollDepth gte 75',
        },
        labels,
        messages,
        siteId: "site-1",
        window,
        submitting: false,
        onOpenChange: vi.fn(),
        onSubmit: submit,
      }),
    );

    typeInto("#goal-scroll-threshold", "40");
    // To add a condition, the visitor switches to the filter: it is the
    // scroll goal they edited, not the one they opened.
    selectTab(labels.triggerFilter);
    expect(buttonWithText(`${labels.filter} (2)`)).toBeDefined();
    selectTab(labels.triggerScrollDepth);
    expect(inputValue("#goal-scroll-threshold")).toBe("40");
    expect(inputValue("#goal-page-path")).toBe("/pricing");
    selectTab(labels.triggerFilter);
    act(() => buttonWithText(labels.saveEdit)?.click());
    await vi.waitFor(() =>
      expect(submit).toHaveBeenCalledWith({
        name: "Read pricing",
        filterDsl: 'page.path eq "/pricing" AND page.scrollDepth gte 40',
        currency: null,
      }),
    );
    act(() => root.unmount());
    container.remove();
  });

  it("shows — for a scroll depth goal's converting sessions", async () => {
    const scrollGoal = {
      ...goal,
      name: "Scroll 75% on /pricing",
      filterDsl: 'page.path eq "/pricing" AND page.scrollDepth gte 75',
    };
    vi.mocked(fetchGoalSummary).mockResolvedValue({
      ok: true,
      data: { ...summary.data, goal: scrollGoal },
    });
    const { container, root } = renderWithQueryClient(
      createElement(GoalDetail, {
        goal: scrollGoal,
        comparisonLabel: "Previous period",
        siteId: "site-1",
        locale: "en",
        labels,
        window,
        filters,
        filterKey: "empty",
        canManage: false,
        actionPending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    // Uniques and their conversion rate stay.
    await vi.waitFor(() => expect(container.textContent).toContain("1 / 8"));
    expect(container.textContent).toContain("12.5%");
    expect(container.textContent).not.toContain("2 / 10");
    expect(container.textContent?.match(/—/g)).toHaveLength(2);
    act(() => root.unmount());
    container.remove();
  });

  it("shows a revenue goal's revenue and average revenue in its currency", async () => {
    const revenueGoal = { ...goal, currency: "USD" };
    vi.mocked(fetchGoalSummary).mockResolvedValue({
      ok: true,
      data: {
        goal: revenueGoal,
        summary: {
          ...summary.data.summary,
          revenue: { currency: "USD", total: 1234.5, average: 61.725 },
        },
      },
    });
    const { container, root } = renderWithQueryClient(
      createElement(GoalDetail, {
        goal: revenueGoal,
        comparisonLabel: "Previous period",
        siteId: "site-1",
        locale: "en",
        labels,
        window,
        filters,
        filterKey: "empty",
        canManage: false,
        actionPending: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    await vi.waitFor(() =>
      expect(container.textContent).toContain("$1,234.50"),
    );
    expect(container.textContent).toContain(labels.revenue);
    expect(container.textContent).toContain(labels.averageRevenue);
    expect(container.textContent).toContain("$61.73");
    act(() => root.unmount());
    container.remove();
  });

  it("edits a funnel step's filter in the private filter editor", () => {
    const { container, root } = renderWithQueryClient(
      createElement(FunnelStepFilterDialog, {
        open: true,
        filterDsl: 'event.name eq "purchase"',
        labels: messages.funnels,
        messages,
        onApply: vi.fn(),
        onOpenChange: vi.fn(),
        siteId: "site-1",
        window,
      }),
    );

    expect(
      document.body
        .querySelector('[data-audience="private-dashboard"]')
        ?.getAttribute("data-initial-filter-dsl"),
    ).toBe('event.name eq "purchase"');
    act(() => root.unmount());
    container.remove();
  });
});
