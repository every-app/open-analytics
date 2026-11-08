import type { PaginatedCollection } from "./pagination";

export interface GoalDefinition {
  id: string;
  siteId: string;
  name: string;
  filterDslVersion: 1;
  filterDsl: string;
  /** ISO 4217 code of the goal's revenue; absent for a goal without revenue. */
  currency?: string;
  semanticFingerprint: string;
  createdAt: number;
  updatedAt: number;
}

export interface GoalMetric {
  total: number;
  converted: number;
  conversionRate: number;
}

/**
 * Revenue of the custom events a goal matched, in the goal's currency.
 * Events in other currencies aren't converted or counted.
 */
export interface GoalRevenue {
  currency: string;
  total: number;
  /** `total` per matched event that carried revenue in `currency`. */
  average: number;
}

export interface GoalSummary {
  sessions: GoalMetric;
  /** Unique conversions; the rate is against the period's visitors. */
  visitors: GoalMetric;
  /** Total conversions: the page views or custom events that matched. */
  conversions: number;
  /** Null for a goal without a currency. */
  revenue: GoalRevenue | null;
}

export interface GoalTimeseriesPoint {
  timestampMs: number;
  sessions: GoalMetric;
  visitors: GoalMetric;
}

export interface GoalListData {
  ok: boolean;
  data: PaginatedCollection<GoalDefinition>;
}

export interface GoalSummaryData {
  ok: boolean;
  data: { goal: GoalDefinition; summary: GoalSummary };
}

/** Every goal of the site with its conversions. */
export interface GoalConversionsData {
  ok: boolean;
  data: { goals: { goal: GoalDefinition; summary: GoalSummary }[] };
}

export interface GoalTimeseriesData {
  ok: boolean;
  data: {
    goal: GoalDefinition;
    interval: "minute" | "hour" | "day" | "week" | "month";
    timeseries: GoalTimeseriesPoint[];
  };
}

export interface GoalMutationData {
  ok: boolean;
  data: { goal: GoalDefinition };
}

export interface GoalDeleteData {
  ok: boolean;
}
