import {
  buildCalendarBucketPlan,
  createTimeRange,
  normalizeReportingTimeZone,
} from "@/lib/edge/analytics/contract";

/**
 * The most buckets a goal trend reads in one query: its SQL holds a clause
 * per bucket, and D1 limits how long a statement can be.
 */
export const GOAL_TIMESERIES_MAX_BUCKETS = 512;

export type GoalInterval = "minute" | "hour" | "day" | "week" | "month";

/**
 * Whether a goal trend over the range needs more buckets than one query can
 * hold. A range whose buckets can't be planned counts as too many.
 */
export function goalTimeseriesHasTooManyBuckets(input: {
  readonly startMs: number;
  readonly endExclusiveMs: number;
  readonly timeZone: string;
  readonly interval: GoalInterval;
}): boolean {
  try {
    return buildCalendarBucketPlan({
      range: createTimeRange(input.startMs, input.endExclusiveMs),
      granularity: input.interval,
      reportingTimeZone: normalizeReportingTimeZone(input.timeZone),
      maxBuckets: GOAL_TIMESERIES_MAX_BUCKETS,
    }).truncated;
  } catch {
    return true;
  }
}
