import { scopedFilterMetadata } from "@/lib/edge/analytics/contract";
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
  buildVisitFilterSql,
  buildVisitSourceCte,
  queryD1All,
  timeBucketCase,
  timeBucketTimestamp,
  visitSourceBindings,
} from "./core";
import {
  type D1ReadDiagnostics,
  recordScopedFilterDiagnostics,
} from "./diagnostics";
import {
  queryOverviewForSitesFromRollups,
  queryTrendForSitesFromRollups,
} from "./rollup-queries";
import {
  scopedDatasetFor,
  scopedDatasetForUnpreparedReader,
} from "./scoped-dataset";
import { scrollDepthOf, scrollDepthSql } from "./scroll-depth";
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
  const scopedDataset =
    scopedDatasetFor(siteId, window, filters) ??
    scopedDatasetForUnpreparedReader(
      "overview",
      siteId,
      window,
      filters,
      "session",
    );
  recordScopedFilterDiagnostics(diagnostics, scopedFilterMetadata(filters));
  const filter = scopedDataset
    ? { clause: "", bindings: [] as Array<string | number> }
    : buildVisitFilterSql(filters, "visit_source", { window });
  const visitSource = buildVisitSourceCte().replace(
    "visit_source AS (",
    "visit_source AS MATERIALIZED (",
  );
  const metricSource = scopedDataset
    ? scopedDataset.visitRelation
    : "filtered_visits";
  const entityCounts = scopedDataset
    ? `
  (SELECT count(*) FROM ${scopedDataset.sessionRelation}) AS sessions,
  (SELECT count(*) FROM ${scopedDataset.visitorRelation}) AS visitors,`
    : `
  count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END) AS sessions,
  count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors,`;
  const sourceSql = scopedDataset
    ? `${scopedDataset.ctes},`
    : `${visitSource},
filtered_visits AS MATERIALIZED (
  SELECT *
  FROM visit_source
  ${filter.clause}
),`;
  const withScrollDepth = hasPagePathFilter(filters);
  const sql = `
WITH
${sourceSql}
session_rollup AS (
  SELECT vs.session_id, count(*) AS visit_count
  FROM ${metricSource} vs
  WHERE vs.session_id != ''
  GROUP BY vs.session_id
)${
    withScrollDepth
      ? `,
scroll_depth AS (
  ${scrollDepthSql({ from: metricSource, visitor: "visitor_id", depth: "scroll_depth" })}
)`
      : ""
  }
SELECT
  count(*) AS views,
${entityCounts}
  COALESCE((SELECT count(*) FROM session_rollup WHERE visit_count = 1), 0) AS bounces,
  COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN duration_ms ELSE 0 END), 0) AS totalDuration,
  COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN 1 ELSE 0 END), 0) AS durationViews${
    withScrollDepth
      ? `,
  (SELECT scrollDepth FROM scroll_depth) AS scrollDepth`
      : ""
  }
FROM ${metricSource}
`;
  const row =
    (
      await queryD1All<Record<string, unknown>>(
        env,
        sql,
        scopedDataset
          ? scopedDataset.bindings.map((binding) => binding.value)
          : [...visitSourceBindings(siteId, window), ...filter.bindings],
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
 * may belong to a larger window the caller reads in parts. With a page path
 * filter each bucket adds the scroll depth of its matching page views.
 */
async function queryTrendBucketsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  buckets: ReturnType<typeof buildTimeBuckets>,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<TrendAggregateRow[]> {
  const scopedDataset =
    scopedDatasetFor(siteId, window, filters) ??
    scopedDatasetForUnpreparedReader(
      "trend",
      siteId,
      window,
      filters,
      "session",
    );
  recordScopedFilterDiagnostics(diagnostics, scopedFilterMetadata(filters));
  const filter = scopedDataset
    ? { clause: "", bindings: [] as Array<string | number> }
    : buildVisitFilterSql(filters, "visit_source", { window });
  const visitSource = buildVisitSourceCte().replace(
    "visit_source AS (",
    "visit_source AS MATERIALIZED (",
  );
  const visitBucket = timeBucketCase(buckets, "started_at");
  const scopedVisitorBucket = scopedDataset
    ? timeBucketCase(buckets, "observed_at")
    : null;
  const sessionBucket = timeBucketCase(
    buckets,
    scopedDataset ? "session_observed_at" : "session_started_at",
  );
  const metricSource = scopedDataset
    ? scopedDataset.visitRelation
    : "filtered_visits";
  const scopedEntityObservations = scopedDataset
    ? `
scope_entity_observations AS (
  SELECT visitor_id, session_id, started_at AS observed_at, 1 AS is_visit_observation
  FROM ${scopedDataset.visitRelation}
  UNION ALL
  SELECT visitor_id, session_id, occurred_at AS observed_at, 0 AS is_visit_observation
  FROM ${scopedDataset.eventRelation}
),`
    : "";
  const visitBucketRollup = scopedDataset
    ? `
visit_bucket_rollup AS (
  SELECT
    ${visitBucket.sql} AS bucket,
    count(*) AS views,
    0 AS visitors,
    COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN duration_ms ELSE 0 END), 0) AS totalDuration,
    COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN 1 ELSE 0 END), 0) AS durationViews
  FROM ${metricSource}
  GROUP BY bucket
),`
    : `
visit_bucket_rollup AS (
  SELECT
    ${visitBucket.sql} AS bucket,
    count(*) AS views,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors,
    COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN duration_ms ELSE 0 END), 0) AS totalDuration,
    COALESCE(sum(CASE WHEN duration_ms IS NOT NULL AND duration_ms >= 0 THEN 1 ELSE 0 END), 0) AS durationViews
  FROM ${metricSource}
  GROUP BY bucket
),`;
  const withScrollDepth = hasPagePathFilter(filters);
  const scrollDepthRollup = withScrollDepth
    ? `
scroll_depth_rollup AS MATERIALIZED (
  ${scrollDepthSql({
    from: metricSource,
    visitor: "visitor_id",
    depth: "scroll_depth",
    groupBy: { sql: visitBucket.sql, as: "bucket" },
  })}
),`
    : "";
  const scopedVisitorBucketRollup = scopedDataset
    ? `
visitor_bucket_rollup AS (
  SELECT
    ${scopedVisitorBucket?.sql} AS bucket,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors
  FROM scope_entity_observations
  GROUP BY bucket
),`
    : "";
  const sessionRollup = scopedDataset
    ? `
session_rollup AS (
  SELECT
    session_id,
    MIN(observed_at) AS session_observed_at,
    COUNT(CASE WHEN is_visit_observation = 1 THEN 1 END) AS visit_count
  FROM scope_entity_observations
  WHERE session_id != ''
  GROUP BY session_id
),`
    : `
session_rollup AS (
  SELECT
    vs.session_id,
    MIN(vs.started_at) AS session_started_at,
    count(*) AS visit_count
  FROM ${metricSource} vs
  WHERE vs.session_id != ''
  GROUP BY vs.session_id
),`;
  const combined = scopedDataset
    ? `
combined AS (
  SELECT bucket, views, visitors, 0 AS sessions, 0 AS bounces, totalDuration, durationViews FROM visit_bucket_rollup
  UNION ALL
  SELECT bucket, 0 AS views, visitors, 0 AS sessions, 0 AS bounces, 0 AS totalDuration, 0 AS durationViews FROM visitor_bucket_rollup
  UNION ALL
  SELECT bucket, 0 AS views, 0 AS visitors, sessions, bounces, 0 AS totalDuration, 0 AS durationViews FROM session_bucket_rollup
 )`
    : `
combined AS (
  SELECT bucket, views, visitors, 0 AS sessions, 0 AS bounces, totalDuration, durationViews FROM visit_bucket_rollup
  UNION ALL
  SELECT bucket, 0 AS views, 0 AS visitors, sessions, bounces, 0 AS totalDuration, 0 AS durationViews FROM session_bucket_rollup
 )`;
  const sourceSql = scopedDataset
    ? `${scopedDataset.ctes},
${scopedEntityObservations}`
    : `${visitSource},
filtered_visits AS MATERIALIZED (
  SELECT *
  FROM visit_source
  ${filter.clause}
),`;
  const sql = `
WITH
${sourceSql}
${visitBucketRollup}
${scrollDepthRollup}
${scopedVisitorBucketRollup}
${sessionRollup}
session_bucket_rollup AS (
  SELECT
    ${sessionBucket.sql} AS bucket,
    count(*) AS sessions,
    COALESCE(sum(CASE WHEN visit_count = 1 THEN 1 ELSE 0 END), 0) AS bounces
  FROM session_rollup
  GROUP BY bucket
),
${combined}
SELECT
  bucket,
  sum(views) AS views,
  sum(visitors) AS visitors,
  sum(sessions) AS sessions,
  sum(bounces) AS bounces,
  sum(totalDuration) AS totalDuration,
  sum(durationViews) AS durationViews${
    withScrollDepth
      ? `,
  (SELECT sd.scrollDepth FROM scroll_depth_rollup sd WHERE sd.bucket = combined.bucket) AS scrollDepth`
      : ""
  }
FROM combined
GROUP BY bucket
ORDER BY bucket ASC
`;
  return (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      [
        ...(scopedDataset
          ? scopedDataset.bindings.map((binding) => binding.value)
          : [...visitSourceBindings(siteId, window), ...filter.bindings]),
        ...visitBucket.bindings,
        ...(withScrollDepth ? visitBucket.bindings : []),
        ...(scopedVisitorBucket?.bindings ?? []),
        ...sessionBucket.bindings,
      ],
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
  const scopedDataset =
    scopedDatasetFor(siteId, window, filters) ??
    scopedDatasetForUnpreparedReader(
      "overview",
      siteId,
      window,
      filters,
      "session",
    );
  recordScopedFilterDiagnostics(diagnostics, scopedFilterMetadata(filters));
  const filter = scopedDataset
    ? { clause: "", bindings: [] as Array<string | number> }
    : buildVisitFilterSql(filters, "visit_source", { window });
  const visitSource = buildVisitSourceCte().replace(
    "visit_source AS (",
    "visit_source AS MATERIALIZED (",
  );
  const metricSource = scopedDataset
    ? scopedDataset.visitRelation
    : "filtered_visits";
  const sourceSql = scopedDataset
    ? `${scopedDataset.ctes},`
    : `${visitSource},
filtered_visits AS MATERIALIZED (
  SELECT *
  FROM visit_source
  ${filter.clause}
),`;
  const sql = `
WITH
${sourceSql}
SELECT MAX(last_activity_at) AS lastActivityAt
FROM ${metricSource}
`;
  const row = (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      scopedDataset
        ? scopedDataset.bindings.map((binding) => binding.value)
        : [...visitSourceBindings(siteId, window), ...filter.bindings],
      diagnostics,
    )
  )[0];
  const raw = row?.lastActivityAt;
  if (raw === null || raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
/** Unfiltered reads have nothing to scope, so they may use the rollups. */
function readsRollups(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
) {
  return (
    filters.root === null && scopedDatasetFor(siteId, window, filters) === null
  );
}
export async function queryOverviewAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<PreferredSourceResult<OverviewAggregateRow>> {
  if (readsRollups(siteId, window, filters)) {
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
  if (readsRollups(siteId, window, filters)) {
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
