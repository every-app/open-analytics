import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edge/analytics/providers/d1/internal/goals", () => ({
  queryAllGoalDefinitions: vi.fn(),
  queryGoalDefinition: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/goal-conversions", () => ({
  queryGoalConversionsFromD1: vi.fn(),
  queryGoalTimeseriesFromD1: vi.fn(),
}));

import {
  queryGoalConversionsFromD1,
  queryGoalTimeseriesFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/goal-conversions";
import {
  queryAllGoalDefinitions,
  queryGoalDefinition,
} from "@/lib/edge/analytics/providers/d1/internal/goals";
import {
  readSiteGoalConversions,
  readSiteGoalSummary,
} from "@/lib/edge/analytics/providers/d1/operations/site-goal-summary";
import { readSiteGoalTimeseries } from "@/lib/edge/analytics/providers/d1/operations/site-goal-timeseries";

const inputBase = {
  env: {} as never,
  siteId: "site-1",
  goalId: "goal-1",
  window: {
    startMs: 0,
    endExclusiveMs: 180_000,
    nowMs: 180_000,
    timeZone: "UTC",
  },
  filters: { conditions: [] },
};

function aggregate(
  totals: { sessions: number; visitors: number },
  counts: {
    sessions: number;
    visitors: number;
    conversions: number;
    revenue: { total: number; events: number } | null;
  },
  goalId = "goal-1",
) {
  return {
    totalSessions: totals.sessions,
    totalVisitors: totals.visitors,
    goals: new Map([[goalId, counts]]),
  };
}

const goal = {
  id: "goal-1",
  siteId: "site-1",
  name: "Purchase",
  filterDslVersion: 1 as const,
  filterDsl: 'event.name eq "purchase"',
  semanticFingerprint: "goal-v1:test",
  createdAt: 1,
  updatedAt: 1,
};

describe("site Goal analytics operations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses the persisted Goal filter and maps rates with a zero denominator", async () => {
    vi.mocked(queryGoalDefinition).mockResolvedValue(goal);
    vi.mocked(queryGoalConversionsFromD1).mockResolvedValue(
      aggregate(
        { sessions: 0, visitors: 3 },
        { sessions: 0, visitors: 1, conversions: 2, revenue: null },
      ),
    );

    await expect(readSiteGoalSummary(inputBase)).resolves.toEqual({
      goal,
      summary: {
        sessions: { total: 0, converted: 0, conversionRate: 0 },
        visitors: { total: 3, converted: 1, conversionRate: 1 / 3 },
        conversions: 2,
        revenue: null,
      },
    });
    expect(queryGoalConversionsFromD1).toHaveBeenCalledWith(
      inputBase.env,
      inputBase.siteId,
      inputBase.window,
      inputBase.filters,
      [
        {
          id: "goal-1",
          filter: {
            conditions: [expect.objectContaining({ value: "purchase" })],
          },
        },
      ],
      undefined,
    );
  });

  it("averages a revenue goal's revenue over the events that carried it", async () => {
    const revenueGoal = { ...goal, currency: "USD" };
    vi.mocked(queryGoalDefinition).mockResolvedValue(revenueGoal);
    vi.mocked(queryGoalConversionsFromD1)
      .mockResolvedValueOnce(
        aggregate(
          { sessions: 4, visitors: 4 },
          {
            sessions: 3,
            visitors: 3,
            conversions: 3,
            revenue: { total: 30, events: 2 },
          },
        ),
      )
      .mockResolvedValueOnce(
        aggregate(
          { sessions: 4, visitors: 4 },
          {
            sessions: 0,
            visitors: 0,
            conversions: 0,
            revenue: { total: 0, events: 0 },
          },
        ),
      );

    const result = await readSiteGoalSummary(inputBase);
    expect(result?.summary.revenue).toEqual({
      currency: "USD",
      total: 30,
      average: 15,
    });
    expect(
      vi.mocked(queryGoalConversionsFromD1).mock.calls[0]?.[4][0]?.currency,
    ).toBe("USD");
    // No revenue events: an average of zero, not a division by zero.
    expect((await readSiteGoalSummary(inputBase))?.summary.revenue).toEqual({
      currency: "USD",
      total: 0,
      average: 0,
    });
  });

  it("zero-fills missing SQL buckets and returns the canonical timestamp contract", async () => {
    vi.mocked(queryGoalDefinition).mockResolvedValue(goal);
    vi.mocked(queryGoalTimeseriesFromD1).mockResolvedValue([
      {
        bucket: 1,
        totalSessions: 2,
        convertedSessions: 1,
        totalVisitors: 1,
        convertedVisitors: 1,
      },
    ]);

    await expect(
      readSiteGoalTimeseries({ ...inputBase, interval: "minute" }),
    ).resolves.toEqual({
      goal,
      interval: "minute",
      timeseries: [
        {
          timestampMs: 0,
          sessions: { total: 0, converted: 0, conversionRate: 0 },
          visitors: { total: 0, converted: 0, conversionRate: 0 },
        },
        {
          timestampMs: 60_000,
          sessions: { total: 2, converted: 1, conversionRate: 0.5 },
          visitors: { total: 1, converted: 1, conversionRate: 1 },
        },
        {
          timestampMs: 120_000,
          sessions: { total: 0, converted: 0, conversionRate: 0 },
          visitors: { total: 0, converted: 0, conversionRate: 0 },
        },
      ],
    });
  });

  it("does not run an analysis query when the Goal definition is missing", async () => {
    vi.mocked(queryGoalDefinition).mockResolvedValue(null);
    await expect(readSiteGoalSummary(inputBase)).resolves.toBeNull();
    await expect(
      readSiteGoalTimeseries({ ...inputBase, interval: "day" }),
    ).resolves.toBeNull();
    expect(queryGoalConversionsFromD1).not.toHaveBeenCalled();
    expect(queryGoalTimeseriesFromD1).not.toHaveBeenCalled();
  });

  it("reads every goal's conversions in one call, and none for a site without goals", async () => {
    const signup = {
      ...goal,
      id: "goal-2",
      filterDsl: 'page.path eq "/signup"',
    };
    vi.mocked(queryAllGoalDefinitions).mockResolvedValueOnce([goal, signup]);
    vi.mocked(queryGoalConversionsFromD1).mockResolvedValue({
      totalSessions: 10,
      totalVisitors: 8,
      goals: new Map([
        ["goal-1", { sessions: 2, visitors: 2, conversions: 3, revenue: null }],
        ["goal-2", { sessions: 4, visitors: 4, conversions: 4, revenue: null }],
      ]),
    });

    const result = await readSiteGoalConversions(inputBase);
    expect(
      result.goals.map(({ goal, summary }) => [goal.id, summary.visitors]),
    ).toEqual([
      ["goal-1", { total: 8, converted: 2, conversionRate: 0.25 }],
      ["goal-2", { total: 8, converted: 4, conversionRate: 0.5 }],
    ]);
    expect(queryGoalConversionsFromD1).toHaveBeenCalledTimes(1);

    vi.mocked(queryAllGoalDefinitions).mockResolvedValueOnce([]);
    await expect(readSiteGoalConversions(inputBase)).resolves.toEqual({
      goals: [],
    });
    expect(queryGoalConversionsFromD1).toHaveBeenCalledTimes(1);
  });
});
