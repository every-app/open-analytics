import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edge/analytics/providers/d1/internal/goals", () => ({
  queryGoalDefinition: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/goal-summary", () => ({
  queryGoalSummaryFromD1: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/goal-timeseries", () => ({
  queryGoalTimeseriesFromD1: vi.fn(),
}));

import { queryGoalSummaryFromD1 } from "@/lib/edge/analytics/providers/d1/internal/goal-summary";
import { queryGoalTimeseriesFromD1 } from "@/lib/edge/analytics/providers/d1/internal/goal-timeseries";
import { queryGoalDefinition } from "@/lib/edge/analytics/providers/d1/internal/goals";
import { readSiteGoalSummary } from "@/lib/edge/analytics/providers/d1/operations/site-goal-summary";
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
  filters: { version: 1 as const, root: null },
};

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
    vi.mocked(queryGoalSummaryFromD1).mockResolvedValue({
      totalSessions: 0,
      convertedSessions: 0,
      totalVisitors: 3,
      convertedVisitors: 1,
      revenue: null,
    });

    await expect(readSiteGoalSummary(inputBase)).resolves.toEqual({
      goal,
      summary: {
        sessions: { total: 0, converted: 0, conversionRate: 0 },
        visitors: { total: 3, converted: 1, conversionRate: 1 / 3 },
        revenue: null,
      },
    });
    expect(queryGoalSummaryFromD1).toHaveBeenCalledWith(
      inputBase.env,
      inputBase.siteId,
      inputBase.window,
      inputBase.filters,
      expect.objectContaining({ version: 1, root: expect.any(Object) }),
      undefined,
      undefined,
    );
  });

  it("averages a revenue goal's revenue over the events that carried it", async () => {
    const revenueGoal = { ...goal, currency: "USD" };
    vi.mocked(queryGoalDefinition).mockResolvedValue(revenueGoal);
    vi.mocked(queryGoalSummaryFromD1)
      .mockResolvedValueOnce({
        totalSessions: 4,
        convertedSessions: 3,
        totalVisitors: 4,
        convertedVisitors: 3,
        revenue: { total: 30, events: 2 },
      })
      .mockResolvedValueOnce({
        totalSessions: 4,
        convertedSessions: 0,
        totalVisitors: 4,
        convertedVisitors: 0,
        revenue: { total: 0, events: 0 },
      });

    const result = await readSiteGoalSummary(inputBase);
    expect(result?.summary.revenue).toEqual({
      currency: "USD",
      total: 30,
      average: 15,
    });
    expect(vi.mocked(queryGoalSummaryFromD1).mock.calls[0]?.[6]).toBe("USD");
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
    expect(queryGoalSummaryFromD1).not.toHaveBeenCalled();
    expect(queryGoalTimeseriesFromD1).not.toHaveBeenCalled();
  });
});
