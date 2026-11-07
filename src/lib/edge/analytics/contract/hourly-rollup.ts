export const ROLLUP_LAG_HOURS = 12;
export const ROLLUP_SCHEMA_VERSION = 1;

export interface BasicRollupRow {
  siteId: string;
  hourBucket: number;
  views: number;
  durationMsSum: number;
  durationMsCount: number;
}

export interface AggregateSiteHourMetricRow {
  metric: "basic" | "visitor" | "session";
  siteId: string;
  hourBucket: number;
  views: number | null;
  durationMsSum: number | null;
  durationMsCount: number | null;
  visitorId: string | null;
  sessionId: string | null;
  visitCount: number | null;
}

export interface StoredRollupRow extends BasicRollupRow {
  sessions: number;
  visitors: number;
  bounces: number;
  visitorSetJson: string;
  sessionCountsJson: string;
}
