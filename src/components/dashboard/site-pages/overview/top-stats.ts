import {
  addZonedInterval,
  shiftZonedYears,
  startOfZonedInterval,
  zonedParts,
} from "@/lib/analytics/time-zone";
import type { DashboardComparisonMode } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  OverviewMetrics,
  TrendPoint,
} from "@/lib/dashboard-api/client/edge";
import { type FilterDocument, hasPagePathFilter } from "@/lib/filter-contract";

/** The dashboard's top stats, in Plausible's order. */
export enum TopStat {
  Visitors = "visitors",
  Visits = "visits",
  Pageviews = "pageviews",
  ViewsPerVisit = "viewsPerVisit",
  BounceRate = "bounceRate",
  VisitDuration = "visitDuration",
  ScrollDepth = "scrollDepth",
}

const SITE_STATS: readonly TopStat[] = [
  TopStat.Visitors,
  TopStat.Visits,
  TopStat.Pageviews,
  TopStat.ViewsPerVisit,
  TopStat.BounceRate,
  TopStat.VisitDuration,
];

// With a page filter, Plausible drops views per visit and shows the page's
// scroll depth beside its time on page.
const PAGE_STATS: readonly TopStat[] = [
  TopStat.Visitors,
  TopStat.Visits,
  TopStat.Pageviews,
  TopStat.BounceRate,
  TopStat.ScrollDepth,
  TopStat.VisitDuration,
];

/** The six stats the dashboard shows for `filters`, as Plausible does. */
export function topStats(filters: FilterDocument): readonly TopStat[] {
  return hasPagePathFilter(filters) ? PAGE_STATS : SITE_STATS;
}

/** The address key holding the stat the main graph draws. */
export const GRAPH_METRIC_PARAM = "metric";

/** Stats where a fall is the good direction. */
export const LOWER_IS_BETTER: ReadonlySet<TopStat> = new Set([
  TopStat.BounceRate,
]);

/** The stat the graph draws: the address's, when shown, or unique visitors. */
export function graphMetricFromSearchParams(
  searchParams: URLSearchParams,
  stats: readonly TopStat[],
): TopStat {
  const value = searchParams.get(GRAPH_METRIC_PARAM);
  return stats.find((stat) => stat === value) ?? TopStat.Visitors;
}

/** The address with the graph drawing `metric`; visitors needs no key. */
export function withGraphMetric(
  searchParams: URLSearchParams,
  metric: TopStat,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (metric === TopStat.Visitors) next.delete(GRAPH_METRIC_PARAM);
  else next.set(GRAPH_METRIC_PARAM, metric);
  return next;
}

type Totals = Pick<
  OverviewMetrics | TrendPoint,
  | "views"
  | "visitors"
  | "sessions"
  | "bounces"
  | "totalDurationMs"
  | "scrollDepth"
>;

/**
 * One stat over some totals. The per-visit stats have no value without a
 * visit, and the scroll depth none without a page view that reported one.
 */
export function topStatValue(stat: TopStat, totals: Totals): number | null {
  if (stat === TopStat.Visitors) return totals.visitors;
  if (stat === TopStat.Visits) return totals.sessions;
  if (stat === TopStat.Pageviews) return totals.views;
  if (stat === TopStat.ScrollDepth) return totals.scrollDepth ?? null;
  if (totals.sessions <= 0) return null;
  if (stat === TopStat.ViewsPerVisit) return totals.views / totals.sessions;
  if (stat === TopStat.BounceRate) return totals.bounces / totals.sessions;
  return totals.totalDurationMs / totals.sessions;
}

/** The change from `reference` to `current`, in percent; null without one. */
export function topStatChange(
  current: number | null,
  reference: number | null,
): number | null {
  if (current === null || reference === null || reference === 0) return null;
  return ((current - reference) / reference) * 100;
}

export interface GraphPoint {
  timestampMs: number;
  /** Null where a per-visit stat had no visits. */
  value: number | null;
}

const EMPTY_TOTALS: Totals = {
  views: 0,
  visitors: 0,
  sessions: 0,
  bounces: 0,
  totalDurationMs: 0,
};

/**
 * A stat per interval across the whole window: every bucket from the
 * window's start to its end, the empty ones too, so the line spans the
 * range.
 */
export function graphPoints(
  window: Pick<TimeWindow, "from" | "to" | "interval" | "timeZone">,
  points: readonly TrendPoint[],
  stat: TopStat,
): GraphPoint[] {
  const byBucket = new Map<number, Totals>();
  for (const point of points) {
    const bucket = startOfZonedInterval(
      point.timestampMs,
      window.interval,
      window.timeZone,
    );
    const totals = byBucket.get(bucket) ?? EMPTY_TOTALS;
    byBucket.set(bucket, {
      views: totals.views + point.views,
      visitors: totals.visitors + point.visitors,
      sessions: totals.sessions + point.sessions,
      bounces: totals.bounces + point.bounces,
      totalDurationMs: totals.totalDurationMs + point.totalDurationMs,
      // An average can't be added up; the server sends one point per interval.
      scrollDepth: point.scrollDepth,
    });
  }
  const result: GraphPoint[] = [];
  const end = startOfZonedInterval(
    Math.max(window.from, window.to - 1),
    window.interval,
    window.timeZone,
  );
  for (
    let bucket = startOfZonedInterval(
      window.from,
      window.interval,
      window.timeZone,
    );
    bucket <= end;
    bucket = addZonedInterval(bucket, window.interval, window.timeZone)
  ) {
    result.push({
      timestampMs: bucket,
      value: topStatValue(stat, byBucket.get(bucket) ?? EMPTY_TOTALS),
    });
  }
  return result;
}

/**
 * The comparison's point for each current one. Year over year pairs a bucket
 * with the one holding the same zoned date and time a year earlier, so a leap
 * day doesn't shift the line, and a 29 February has none; weeks pair with the
 * week holding that date. Other comparisons pair bucket for bucket.
 */
export function alignComparisonPoints(
  window: Pick<TimeWindow, "interval" | "timeZone">,
  mode: DashboardComparisonMode,
  points: readonly GraphPoint[],
  reference: readonly GraphPoint[],
): (GraphPoint | undefined)[] {
  if (mode !== "year") return points.map((_, index) => reference[index]);
  const byStart = new Map(reference.map((point) => [point.timestampMs, point]));
  return points.map((point) => {
    const { month, day } = zonedParts(point.timestampMs, window.timeZone);
    if (window.interval !== "week" && month === 2 && day === 29) {
      return undefined;
    }
    return byStart.get(
      startOfZonedInterval(
        shiftZonedYears(point.timestampMs, -1, window.timeZone),
        window.interval,
        window.timeZone,
      ),
    );
  });
}
