import { D1_MAX_BOUND_PARAMETERS } from "@/lib/db";
import {
  concat,
  join,
  parameter,
  type SqlFragment,
  text,
} from "@/lib/db/sql/fragment";
import type { FilterDocument } from "@/lib/edge/analytics/contract";
import type { Env } from "@/lib/edge/types";

import { queryD1All } from "./core-sources";
import { buildTimeBuckets, timeBucketCase } from "./core-time";
import type { Interval, QueryWindow } from "./core-types";
import type { D1ReadDiagnostics } from "./diagnostics";
import {
  eventFilterSql,
  eventMatchSql,
  type FilterSqlScope,
  pageViewMatchSql,
  sitePk,
  visitFilterSql,
} from "./filter-compiler";

/** A goal to count: its filter and, for revenue, its currency. */
export interface GoalToCount {
  readonly id: string;
  readonly filter: FilterDocument;
  readonly currency?: string;
}

/** The revenue of a goal's custom events in its currency. */
export interface GoalRevenueAggregate {
  readonly total: number;
  /** The matched events that carried revenue in the currency. */
  readonly events: number;
}

export interface GoalConversionCounts {
  readonly sessions: number;
  readonly visitors: number;
  /** The page views or custom events that matched. */
  readonly conversions: number;
  /** Null for a goal without a currency. */
  readonly revenue: GoalRevenueAggregate | null;
}

/** The period's sessions and visitors, and each goal's conversions. */
export interface GoalConversionsAggregate {
  readonly totalSessions: number;
  readonly totalVisitors: number;
  readonly goals: ReadonlyMap<string, GoalConversionCounts>;
}

function scopeOf(siteId: string, window: QueryWindow): FilterSqlScope {
  return {
    siteId,
    startMs: window.startMs,
    endExclusiveMs: window.endExclusiveMs,
  };
}

function andFilter(predicate: SqlFragment | null): SqlFragment {
  return predicate ? concat(text("\n    AND "), predicate) : text("");
}

/** The site's filtered page views in the window, aliased `v`. */
function pageViewsFrom(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
): SqlFragment {
  return concat(
    text(`
  FROM visits v
  WHERE v.site_pk = `),
    sitePk(siteId),
    text(" AND v.started_at >= "),
    parameter(window.startMs),
    text(" AND v.started_at < "),
    parameter(window.endExclusiveMs),
    andFilter(visitFilterSql(filters, scopeOf(siteId, window))),
  );
}

/** The site's filtered custom events in the window, `ce` with visit `v`. */
function eventsFrom(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
): SqlFragment {
  return concat(
    text(`
  FROM custom_events ce
  INNER JOIN custom_event_names cen
    ON cen.id = ce.event_name_id
  INNER JOIN visits v
    ON v.site_pk = ce.site_pk
   AND v.visit_id = ce.visit_id
  WHERE ce.site_pk = `),
    sitePk(siteId),
    text(" AND ce.occurred_at >= "),
    parameter(window.startMs),
    text(" AND ce.occurred_at < "),
    parameter(window.endExclusiveMs),
    andFilter(eventFilterSql(filters, scopeOf(siteId, window))),
  );
}

function countValue(value: unknown): number {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

const DISTINCT_SESSION = (flag: string) =>
  `count(DISTINCT CASE WHEN ${flag} AND session_id != '' THEN session_id END)`;
const DISTINCT_VISITOR = (flag: string) =>
  `count(DISTINCT CASE WHEN ${flag} AND visitor_id != '' THEN visitor_id END)`;

/**
 * One statement for `goals`: one pass over the filtered page views and
 * custom events together, so the period's sessions and visitors are the
 * ones either was seen in, and a goal both can match (custom properties
 * alone) counts each session and visitor once. Each row's match of each
 * goal is one column of the inner select.
 */
function goalConversionsStatement(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  goals: readonly GoalToCount[],
): SqlFragment {
  const scope = scopeOf(siteId, window);
  const counts = (goal: GoalToCount, index: number) =>
    concat(
      text(`,
  ${DISTINCT_SESSION(`goal_${index}`)} AS goal_${index}_sessions,
  ${DISTINCT_VISITOR(`goal_${index}`)} AS goal_${index}_visitors,
  COALESCE(sum(goal_${index}), 0) AS goal_${index}_conversions`),
      ...(goal.currency === undefined
        ? []
        : [
            text(
              `,\n  COALESCE(sum(CASE WHEN goal_${index} AND revenue_currency = `,
            ),
            parameter(goal.currency),
            text(
              ` THEN revenue_amount ELSE 0 END), 0) AS goal_${index}_revenue,\n  COALESCE(sum(CASE WHEN goal_${index} AND revenue_currency = `,
            ),
            parameter(goal.currency),
            text(` THEN 1 ELSE 0 END), 0) AS goal_${index}_revenue_events`),
          ]),
    );
  const flags = (match: (goal: GoalToCount) => SqlFragment) =>
    goals.map((goal, index) =>
      concat(text(",\n    ("), match(goal), text(`) AS goal_${index}`)),
    );
  return concat(
    text(`
SELECT
  ${DISTINCT_SESSION("1")} AS total_sessions,
  ${DISTINCT_VISITOR("1")} AS total_visitors`),
    ...goals.map(counts),
    text(`
FROM (
  SELECT v.session_id, v.visitor_id, NULL AS revenue_amount, NULL AS revenue_currency`),
    ...flags((goal) => pageViewMatchSql(goal.filter, scope)),
    pageViewsFrom(siteId, window, filters),
    text(`
  UNION ALL
  SELECT v.session_id, v.visitor_id, ce.revenue_amount, ce.revenue_currency`),
    ...flags((goal) => eventMatchSql(goal.filter, scope)),
    eventsFrom(siteId, window, filters),
    text("\n)"),
  );
}

/**
 * The goals in as few statements as D1's parameter cap allows: one for a
 * site's usual handful of goals.
 */
function statementsFor(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  goals: readonly GoalToCount[],
): Array<{ goals: readonly GoalToCount[]; statement: SqlFragment }> {
  const statements: Array<{
    goals: readonly GoalToCount[];
    statement: SqlFragment;
  }> = [];
  let chunk: GoalToCount[] = [];
  let statement = goalConversionsStatement(siteId, window, filters, chunk);
  for (const goal of goals) {
    const next = goalConversionsStatement(siteId, window, filters, [
      ...chunk,
      goal,
    ]);
    if (chunk.length > 0 && next.bindings.length > D1_MAX_BOUND_PARAMETERS) {
      statements.push({ goals: chunk, statement });
      chunk = [goal];
      statement = goalConversionsStatement(siteId, window, filters, chunk);
    } else {
      chunk = [...chunk, goal];
      statement = next;
    }
  }
  statements.push({ goals: chunk, statement });
  return statements;
}

/**
 * Each goal's unique conversions (visitors), converted sessions, total
 * conversions and revenue in the window and filters, with the period's
 * sessions and visitors, which a conversion rate is against. A goal that
 * names a custom event converts on custom events, one of custom properties
 * alone on both, and any other on page views.
 */
export async function queryGoalConversionsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  goals: readonly GoalToCount[],
  diagnostics?: D1ReadDiagnostics,
): Promise<GoalConversionsAggregate> {
  const results = await Promise.all(
    statementsFor(siteId, window, filters, goals).map(
      async ({ goals: chunk, statement }) => ({
        chunk,
        row:
          (
            await queryD1All<Record<string, unknown>>(
              env,
              statement.text,
              statement.bindings as (string | number | null)[],
              diagnostics,
            )
          )[0] ?? {},
      }),
    ),
  );
  const conversions = new Map<string, GoalConversionCounts>();
  for (const { chunk, row } of results) {
    chunk.forEach((goal, index) => {
      conversions.set(goal.id, {
        sessions: countValue(row[`goal_${index}_sessions`]),
        visitors: countValue(row[`goal_${index}_visitors`]),
        conversions: countValue(row[`goal_${index}_conversions`]),
        revenue:
          goal.currency === undefined
            ? null
            : {
                total: Number(row[`goal_${index}_revenue`] ?? 0),
                events: countValue(row[`goal_${index}_revenue_events`]),
              },
      });
    });
  }
  const first = results[0]!.row;
  return {
    totalSessions: countValue(first.total_sessions),
    totalVisitors: countValue(first.total_visitors),
    goals: conversions,
  };
}

export interface GoalTimeseriesAggregateRow {
  readonly bucket: number;
  readonly totalSessions: number;
  readonly convertedSessions: number;
  readonly totalVisitors: number;
  readonly convertedVisitors: number;
}

function observations(
  time: string,
  converted: SqlFragment,
  from: SqlFragment,
): SqlFragment {
  return concat(
    text(`
    SELECT ${time} AS observed_at, v.session_id, v.visitor_id, (`),
    converted,
    text(") AS converted"),
    from,
  );
}

/**
 * A goal's sessions and visitors per bucket, of the period and converted,
 * in one statement. A session or visitor counts once in each bucket it was
 * seen in, by a page view or a custom event.
 */
export async function queryGoalTimeseriesFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  filters: FilterDocument,
  goal: FilterDocument,
): Promise<GoalTimeseriesAggregateRow[]> {
  const scope = scopeOf(siteId, window);
  const buckets = buildTimeBuckets(window, interval);
  const rows = join(
    [
      observations(
        "v.started_at",
        pageViewMatchSql(goal, scope),
        pageViewsFrom(siteId, window, filters),
      ),
      observations(
        "ce.occurred_at",
        eventMatchSql(goal, scope),
        eventsFrom(siteId, window, filters),
      ),
    ],
    text("\n    UNION ALL"),
  );
  // The bucket's CASE is written once: it grows with the bucket count.
  const result = await queryD1All<Record<string, unknown>>(
    env,
    `
SELECT
  bucket,
  ${DISTINCT_SESSION("1")} AS totalSessions,
  ${DISTINCT_SESSION("converted")} AS convertedSessions,
  ${DISTINCT_VISITOR("1")} AS totalVisitors,
  ${DISTINCT_VISITOR("converted")} AS convertedVisitors
FROM (
  SELECT ${timeBucketCase(buckets, "observed_at").sql} AS bucket, session_id, visitor_id, converted
  FROM (${rows.text}
  )
)
WHERE bucket IS NOT NULL
GROUP BY bucket
ORDER BY bucket ASC
`,
    rows.bindings as (string | number | null)[],
  );
  const rowByBucket = new Map(
    result.map((row) => [Number(row.bucket), row] as const),
  );
  return buckets.map((bucket) => {
    const row = rowByBucket.get(bucket.index);
    return {
      bucket: bucket.index,
      totalSessions: countValue(row?.totalSessions),
      convertedSessions: countValue(row?.convertedSessions),
      totalVisitors: countValue(row?.totalVisitors),
      convertedVisitors: countValue(row?.convertedVisitors),
    };
  });
}
