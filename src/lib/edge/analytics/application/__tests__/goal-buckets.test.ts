import { describe, expect, it } from "vitest";

import {
  GOAL_TIMESERIES_MAX_BUCKETS,
  goalTimeseriesHasTooManyBuckets,
} from "@/lib/edge/analytics/application/goal-buckets";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

describe("goalTimeseriesHasTooManyBuckets", () => {
  it("allows a trend up to the bucket ceiling and refuses one past it", () => {
    expect(GOAL_TIMESERIES_MAX_BUCKETS).toBe(512);
    const minutes = (count: number) => ({
      startMs: 0,
      endExclusiveMs: count * MINUTE_MS,
      timeZone: "UTC",
      interval: "minute" as const,
    });

    expect(
      goalTimeseriesHasTooManyBuckets(minutes(GOAL_TIMESERIES_MAX_BUCKETS)),
    ).toBe(false);
    expect(
      goalTimeseriesHasTooManyBuckets(minutes(GOAL_TIMESERIES_MAX_BUCKETS + 1)),
    ).toBe(true);
  });

  it("allows decades of monthly buckets, so a long range is never refused", () => {
    expect(
      goalTimeseriesHasTooManyBuckets({
        startMs: 0,
        endExclusiveMs: 40 * 365 * DAY_MS,
        timeZone: "UTC",
        interval: "month",
      }),
    ).toBe(false);
  });

  it("refuses a range whose buckets can't be planned", () => {
    expect(
      goalTimeseriesHasTooManyBuckets({
        startMs: Number.NaN,
        endExclusiveMs: MINUTE_MS,
        timeZone: "Not/A_TimeZone",
        interval: "day",
      }),
    ).toBe(true);
  });
});
