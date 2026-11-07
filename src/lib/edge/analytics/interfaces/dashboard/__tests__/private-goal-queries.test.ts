import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Composition from "@/lib/edge/analytics/composition";

const runtime = vi.hoisted(() => ({
  getGoal: vi.fn(),
  execute: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/composition", async (importOriginal) => ({
  ...(await importOriginal<typeof Composition>()),
  createEdgeSiteAnalyticsRuntime: () => ({
    resources: { goals: { get: runtime.getGoal } },
    execute: runtime.execute,
  }),
}));

import { executePrivateQuery } from "@/lib/edge/analytics/interfaces/dashboard/private";
import type { Env } from "@/lib/edge/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const FROM = Date.UTC(2026, 0, 1);
const goal = {
  id: "goal-1",
  filterDslVersion: 1,
  filterDsl: 'event.name eq "signup"',
};

function query(
  pathname: "goal-summary" | "goal-timeseries",
  params: Record<string, string>,
) {
  const url = new URL(`https://edge.test/api/private/${pathname}`);
  for (const [key, value] of Object.entries({
    siteId: "site-1",
    id: "goal-1",
    from: String(FROM),
    to: String(FROM + 7 * DAY_MS),
    ...params,
  })) {
    url.searchParams.set(key, value);
  }
  return executePrivateQuery({
    env: {} as Env,
    siteId: "site-1",
    pathname,
    url,
    request: new Request(url),
  });
}

describe("private goal summary and timeseries queries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    runtime.getGoal.mockResolvedValue(goal);
    runtime.execute.mockResolvedValue({
      ok: true,
      data: { summary: { conversions: 3 } },
      meta: { source: "raw" },
    });
  });

  it("rejects an invalid window before reading the goal", async () => {
    const response = await query("goal-summary", { from: "soon" });

    expect(response.status).toBe(400);
    expect(runtime.getGoal).not.toHaveBeenCalled();
  });

  it("answers a missing goal with not found and a failed lookup with an error", async () => {
    runtime.getGoal.mockResolvedValueOnce(null);
    expect((await query("goal-summary", {})).status).toBe(404);

    runtime.getGoal.mockRejectedValueOnce(new Error("D1 down"));
    expect((await query("goal-timeseries", {})).status).toBe(500);
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("refuses a timeseries with more buckets than a chart can show", async () => {
    const response = await query("goal-timeseries", {
      interval: "minute",
      to: String(FROM + 7 * DAY_MS),
    });

    expect(response.status).toBe(422);
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it("runs the summary without an interval and the timeseries with one", async () => {
    const summary = await query("goal-summary", { interval: "hour" });
    const timeseries = await query("goal-timeseries", { interval: "hour" });

    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({
      ok: true,
      data: { summary: { conversions: 3 } },
    });
    expect(timeseries.status).toBe(200);
    const [summaryCall, timeseriesCall] = runtime.execute.mock.calls;
    expect(summaryCall![0]).toBe("goal-summary");
    expect(summaryCall![1]).not.toHaveProperty("interval");
    expect(summaryCall![1]).toMatchObject({ goalId: "goal-1" });
    expect(timeseriesCall![0]).toBe("goal-timeseries");
    expect(timeseriesCall![1]).toMatchObject({ interval: "hour" });
  });

  it("answers a goal over many years of data instead of refusing the range", async () => {
    const years = await query("goal-summary", {
      to: String(FROM + 12 * 365 * DAY_MS),
    });
    const monthly = await query("goal-timeseries", {
      interval: "month",
      to: String(FROM + 12 * 365 * DAY_MS),
    });

    expect(years.status).toBe(200);
    expect(monthly.status).toBe(200);
    expect(runtime.execute).toHaveBeenCalledTimes(2);
  });

  it("maps query errors and empty results", async () => {
    runtime.execute.mockResolvedValueOnce({
      ok: false,
      error: { kind: "invalid-input", issues: [] },
    });
    expect((await query("goal-summary", {})).status).toBe(400);

    runtime.execute.mockResolvedValueOnce({
      ok: true,
      data: null,
      meta: { source: "raw" },
    });
    expect((await query("goal-summary", {})).status).toBe(404);
  });
});
