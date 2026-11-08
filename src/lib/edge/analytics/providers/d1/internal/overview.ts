import type { Env } from "@/lib/edge/types";
import { hasPagePathFilter } from "@/lib/filter-contract/filters";

import type {
  FilterDocument,
  Interval,
  OverviewAggregateRow,
  PreferredSourceResult,
  QueryWindow,
  TrendAggregateRow,
} from "./core";
import {
  buildTimeBuckets,
  filteredVisitsCte,
  queryD1All,
  timeBucketCase,
  timeBucketTimestamp,
} from "./core";
import type { D1ReadDiagnostics } from "./diagnostics";
import {
  queryOverviewForSitesFromRollups,
  queryTrendForSitesFromRollups,
} from "./rollup-queries";
import { scrollDepthOf, scrollDepthSql } from "./scroll-depth";

const VALID_DURATION = "duration_ms IS NOT NULL AND duration_ms >= 0";

/**
 * The filtered page views grouped by session, visitor and `bucket`, with
 * their views and durations: one pass over visits that every aggregate of
 * the statement reads. With scroll depth the groups are per page too, and
 * materialized, since two aggregates read them.
 */
function pageViewGroups(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  options: {
    readonly bucket?: string;
    readonly withScrollDepth: boolean;
  },
) {
  const source = filteredVisitsCte(siteId, window, filters, {
    columns: `session_id, visitor_id, started_at, duration_ms${
      options.withScrollDepth ? ", pathname, scroll_depth" : ""
    }`,
  });
  const keys = [
    "session_id",
    "visitor_id",
    ...(options.bucket ? ["bucket"] : []),
    ...(options.withScrollDepth ? ["pathname"] : []),
  ].join(", ");
  const columns = [
    "session_id",
    "visitor_id",
    ...(options.bucket ? [`${options.bucket} AS bucket`] : []),
    ...(options.withScrollDepth ? ["pathname"] : []),
  ].join(", ");
  return {
    sql: `${source.sql},
page_view_groups AS${options.withScrollDepth ? " MATERIALIZED" : ""} (
  SELECT
    ${columns},
    count(*) AS views,
    MIN(started_at) AS first_at,
    COALESCE(sum(CASE WHEN ${VALID_DURATION} THEN duration_ms ELSE 0 END), 0) AS total_duration,
    COALESCE(sum(CASE WHEN ${VALID_DURATION} THEN 1 ELSE 0 END), 0) AS duration_views${
      options.withScrollDepth ? ",\n    MAX(scroll_depth) AS depth" : ""
    }
  FROM filtered_visits
  GROUP BY ${keys}
)`,
    bindings: source.bindings,
  };
}

/**
 * The overview totals. With a page path filter they add the scroll depth of
 * the page views the filters match.
 */
export async function queryOverviewFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<OverviewAggregateRow> {
  const withScrollDepth = hasPagePathFilter(filters);
  const groups = pageViewGroups(siteId, window, filters, { withScrollDepth });
  const sql = `
WITH
${groups.sql},
visitor_sessions AS (
  SELECT
    session_id,
    visitor_id,
    sum(views) AS views,
    sum(total_duration) AS total_duration,
    sum(duration_views) AS duration_views
  FROM page_view_groups
  GROUP BY session_id, visitor_id
)${
    withScrollDepth
      ? `,
scroll_depth AS (
  ${scrollDepthSql({ from: "page_view_groups", visitor: "visitor_id", depth: "depth" })}
)`
      : ""
  }
SELECT
  COALESCE(sum(views), 0) AS views,
  count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END) AS sessions,
  count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors,
  COALESCE(sum(CASE WHEN session_id != '' AND views = 1 THEN 1 ELSE 0 END), 0) AS bounces,
  COALESCE(sum(total_duration), 0) AS totalDuration,
  COALESCE(sum(duration_views), 0) AS durationViews${
    withScrollDepth
      ? `,
  (SELECT scrollDepth FROM scroll_depth) AS scrollDepth`
      : ""
  }
FROM visitor_sessions
`;
  const row =
    (
      await queryD1All<Record<string, unknown>>(
        env,
        sql,
        groups.bindings,
        diagnostics,
      )
    )[0] ?? {};
  return {
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
    bounces: Number(row.bounces ?? 0),
    totalDuration: Number(row.totalDuration ?? 0),
    durationViews: Number(row.durationViews ?? 0),
    ...(withScrollDepth ? { scrollDepth: scrollDepthOf(row.scrollDepth) } : {}),
  };
}
/**
 * Trend rows for the page views in `window`, counted into `buckets`, which
 * may belong to a larger window the caller reads in parts. A session counts
 * in the bucket of its first page view. With a page path filter each bucket
 * adds the scroll depth of its matching page views.
 */
async function queryTrendBucketsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  buckets: ReturnType<typeof buildTimeBuckets>,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<TrendAggregateRow[]> {
  const withScrollDepth = hasPagePathFilter(filters);
  const visitBucket = timeBucketCase(buckets, "started_at");
  const sessionBucket = timeBucketCase(buckets, "MIN(first_at)");
  const groups = pageViewGroups(siteId, window, filters, {
    bucket: visitBucket.sql,
    withScrollDepth,
  });
  // Each bucket's scroll depth is one more arm of the union, read once.
  const depthColumn = (value: string) =>
    withScrollDepth ? `, ${value} AS scrollDepth` : "";
  const sql = `
WITH
${groups.sql},
visit_buckets AS (
  SELECT
    bucket,
    sum(views) AS views,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors,
    sum(total_duration) AS totalDuration,
    sum(duration_views) AS durationViews
  FROM page_view_groups
  GROUP BY bucket
),
session_starts AS (
  SELECT ${sessionBucket.sql} AS bucket, sum(views) AS views
  FROM page_view_groups
  WHERE session_id != ''
  GROUP BY session_id
),
session_buckets AS (
  SELECT
    bucket,
    count(*) AS sessions,
    COALESCE(sum(CASE WHEN views = 1 THEN 1 ELSE 0 END), 0) AS bounces
  FROM session_starts
  GROUP BY bucket
),${
    withScrollDepth
      ? `
scroll_depth_buckets AS (
  ${scrollDepthSql({
    from: "page_view_groups",
    visitor: "visitor_id",
    depth: "depth",
    groupBy: { sql: "bucket", as: "bucket" },
  })}
),`
      : ""
  }
combined AS (
  SELECT bucket, views, visitors, 0 AS sessions, 0 AS bounces, totalDuration, durationViews${depthColumn("NULL")} FROM visit_buckets
  UNION ALL
  SELECT bucket, 0 AS views, 0 AS visitors, sessions, bounces, 0 AS totalDuration, 0 AS durationViews${depthColumn("NULL")} FROM session_buckets${
    withScrollDepth
      ? `
  UNION ALL
  SELECT bucket, 0 AS views, 0 AS visitors, 0 AS sessions, 0 AS bounces, 0 AS totalDuration, 0 AS durationViews, scrollDepth FROM scroll_depth_buckets`
      : ""
  }
)
SELECT
  bucket,
  sum(views) AS views,
  sum(visitors) AS visitors,
  sum(sessions) AS sessions,
  sum(bounces) AS bounces,
  sum(totalDuration) AS totalDuration,
  sum(durationViews) AS durationViews${depthColumn("MAX(scrollDepth)")}
FROM combined
GROUP BY bucket
ORDER BY bucket ASC
`;
  return (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      groups.bindings,
      diagnostics,
    )
  ).map((row) => ({
    bucket: Number(row.bucket ?? 0),
    timestampMs: timeBucketTimestamp(buckets, Number(row.bucket ?? 0)),
    views: Number(row.views ?? 0),
    visitors: Number(row.visitors ?? 0),
    sessions: Number(row.sessions ?? 0),
    bounces: Number(row.bounces ?? 0),
    totalDuration: Number(row.totalDuration ?? 0),
    durationViews: Number(row.durationViews ?? 0),
    ...(withScrollDepth ? { scrollDepth: scrollDepthOf(row.scrollDepth) } : {}),
  }));
}
/**
 * Site-level activity is a composite concern, not a breakdown metric. Keep
 * the filter and half-open window aligned with the overview/trend readers.
 */
export async function queryLatestSiteActivity(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<number | null> {
  const source = filteredVisitsCte(siteId, window, filters, {
    columns: "last_activity_at",
  });
  const row = (
    await queryD1All<Record<string, unknown>>(
      env,
      `
WITH
${source.sql}
SELECT MAX(last_activity_at) AS lastActivityAt
FROM filtered_visits
`,
      source.bindings,
      diagnostics,
    )
  )[0];
  const raw = row?.lastActivityAt;
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
/** Unfiltered reads may use the rollups. */
function readsRollups(filters: FilterDocument) {
  return filters.conditions.length === 0;
}
export async function queryOverviewAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<PreferredSourceResult<OverviewAggregateRow>> {
  if (readsRollups(filters)) {
    const rollup = await queryOverviewForSitesFromRollups(
      env,
      [siteId],
      window,
      async (_siteIds, rawWindow) =>
        new Map([
          [
            siteId,
            await queryOverviewFromD1(
              env,
              siteId,
              rawWindow,
              filters,
              diagnostics,
            ),
          ],
        ]),
      diagnostics,
    );
    const value = rollup.value.get(siteId);
    if (value) {
      return {
        value,
        source: "d1",
        diagnosticSource: "rollup",
        approximateVisitors: false,
      };
    }
  }
  return {
    value: await queryOverviewFromD1(env, siteId, window, filters, diagnostics),
    source: "d1",
    diagnosticSource: "raw",
    approximateVisitors: false,
  };
}
export async function queryTrendAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<PreferredSourceResult<TrendAggregateRow[]>> {
  const buckets = buildTimeBuckets(window, interval);
  if (readsRollups(filters)) {
    const rollup = await queryTrendForSitesFromRollups(
      env,
      [siteId],
      window,
      buckets,
      async (_siteIds, rawWindow) =>
        (
          await queryTrendBucketsFromD1(
            env,
            siteId,
            rawWindow,
            buckets,
            filters,
            diagnostics,
          )
        ).map((row) => ({ ...row, siteId })),
      diagnostics,
    );
    if (rollup.rawSiteIds.length === 0) {
      return {
        value: rollup.rows.map(({ siteId: _siteId, ...row }) => row),
        source: "d1",
        diagnosticSource: "rollup",
      };
    }
  }
  return {
    value: await queryTrendBucketsFromD1(
      env,
      siteId,
      window,
      buckets,
      filters,
      diagnostics,
    ),
    source: "d1",
    diagnosticSource: "raw",
  };
}
