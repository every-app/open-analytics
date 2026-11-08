import {
  analyticsFilterRegistry,
  filterFingerprint,
  type PagesDashboardSortKey,
  type QueryAudience,
  type SortDirection,
} from "@/lib/edge/analytics/contract";
import type { Env } from "@/lib/edge/types";
import {
  decodePageCursor,
  encodePageCursor,
  hasExactKeys,
  type PageResult,
  pageResult,
  paginationBindingForWindow,
} from "@/lib/pagination";

import type {
  FilterDocument,
  Interval,
  PageCardAggregateRow,
  PageCardTitleRow,
  PageCardTrendRow,
  PageRow,
  QueryWindow,
} from "./core";
import {
  type BoundSql,
  buildTimeBuckets,
  filteredVisitsCte,
  queryD1All,
  timeBucketCase,
  timeBucketTimestamp,
} from "./core";
import { type PageDashboardCursor } from "./pages-dashboard";
import { dailyDimensionRows, rollupEdgeSource } from "./rollup-breakdowns";
import { RollupDimension } from "./rollup-dimensions";
import {
  NO_SCROLL_DEPTH_RANK,
  scrollDepthOf,
  scrollDepthSql,
} from "./scroll-depth";
export interface PageAggregateCursor {
  readonly views: number;
  readonly sessions: number;
  readonly pathname: string;
}
function pageAggregateCursor(value: unknown): PageAggregateCursor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return hasExactKeys(candidate, ["views", "sessions", "pathname"]) &&
    typeof candidate.views === "number" &&
    Number.isFinite(candidate.views) &&
    typeof candidate.sessions === "number" &&
    Number.isFinite(candidate.sessions) &&
    typeof candidate.pathname === "string"
    ? (candidate as unknown as PageAggregateCursor)
    : null;
}
export function pageCursorBinding(
  operation: string,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  extra: readonly unknown[] = [],
  audience: QueryAudience = "private-dashboard",
): Promise<string> {
  return paginationBindingForWindow(window, [
    `analytics-${operation}-v1`,
    audience,
    siteId,
    window.startMs,
    window.endExclusiveMs,
    window.timeZone,
    filterFingerprint(filters, analyticsFilterRegistry),
    ...extra,
  ]);
}
/**
 * The `page_rollup` CTE: each pathname's views and sessions. An unfiltered
 * read adds the rolled-up days to a raw grouping of the window's edges; a
 * filtered one groups the plain scan of the window's matching page views.
 */
async function pageAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
): Promise<BoundSql> {
  const grouping = (relation: string) => `
  SELECT
    pathname,
    count(*) AS views,
    count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END) AS sessions
  FROM ${relation}
  GROUP BY pathname`;
  const rollup = await rollupEdgeSource(env, siteId, window, filters);
  if (rollup) {
    const daily = dailyDimensionRows(
      siteId,
      RollupDimension.PagePath,
      rollup.split,
    );
    return {
      sql: `${rollup.visitSource.sql},
page_rollup AS (
  SELECT pathname, SUM(views) AS views, SUM(sessions) AS sessions
  FROM (${grouping("visit_source")}
    UNION ALL
    SELECT value AS pathname, views, sessions FROM (${daily.sql})
  )
  GROUP BY pathname
)`,
      bindings: [...rollup.visitSource.bindings, ...daily.bindings],
    };
  }
  const source = filteredVisitsCte(siteId, window, filters);
  return {
    sql: `${source.sql},
page_rollup AS (${grouping("filtered_visits")}
)`,
    bindings: source.bindings,
  };
}
/** Pages by views, then sessions, then path; after `cursor` when given. */
async function queryPageRows(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  cursor: PageAggregateCursor | null,
): Promise<PageRow[]> {
  const aggregate = await pageAggregate(env, siteId, window, filters);
  const cursorClause = cursor
    ? `
WHERE views < ?
   OR (views = ? AND sessions < ?)
   OR (views = ? AND sessions = ? AND pathname > ?)`
    : "";
  const sql = `
WITH
${aggregate.sql}
SELECT pathname, views, sessions
FROM page_rollup
${cursorClause}
ORDER BY views DESC, sessions DESC, pathname ASC
LIMIT ?
`;
  const cursorBindings = cursor
    ? [
        cursor.views,
        cursor.views,
        cursor.sessions,
        cursor.views,
        cursor.sessions,
        cursor.pathname,
      ]
    : [];
  return (
    await queryD1All<Record<string, unknown>>(env, sql, [
      ...aggregate.bindings,
      ...cursorBindings,
      limit,
    ])
  ).map((row) => ({
    pathname: String(row.pathname ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
  }));
}
export function queryTopPagesFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
): Promise<PageRow[]> {
  return queryPageRows(env, siteId, window, filters, limit, null);
}
/** Keyset-paginated pages report. */
export async function queryPagesPageFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  cursor: PageAggregateCursor | null,
  audience: QueryAudience,
): Promise<PageResult<PageRow>> {
  const rows = await queryPageRows(
    env,
    siteId,
    window,
    filters,
    limit + 1,
    cursor,
  );
  const page = pageResult(rows, limit);
  const binding = await pageCursorBinding(
    "pages",
    siteId,
    window,
    filters,
    [],
    audience,
  );
  const nextCursor =
    page.hasMore && page.last
      ? await encodePageCursor(env, binding, {
          views: page.last.views,
          sessions: page.last.sessions,
          pathname: page.last.pathname,
        })
      : null;
  return {
    items: page.rows,
    pagination: {
      limit,
      returned: page.rows.length,
      hasMore: page.hasMore,
      nextCursor,
    },
  };
}
export async function decodePagesCursor(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  cursor: string | null,
  audience: QueryAudience,
): Promise<PageAggregateCursor | null> {
  const binding = await pageCursorBinding(
    "pages",
    siteId,
    window,
    filters,
    [],
    audience,
  );
  return decodePageCursor(env, binding, cursor, "pages", pageAggregateCursor);
}
export async function queryPageCardMetricsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  options?: {
    pathnames?: string[];
    limit?: number;
    cursor?: PageDashboardCursor | null;
    search?: string;
    sort?: PagesDashboardSortKey;
    direction?: SortDirection;
  },
): Promise<PageCardAggregateRow[]> {
  const source = filteredVisitsCte(siteId, window, filters);
  const requestedPathnames = Array.from(
    new Set(
      (options?.pathnames ?? [])
        .map((pathname) => String(pathname ?? "").trim())
        .filter((pathname) => pathname.length > 0),
    ),
  );
  const pathnameCondition =
    requestedPathnames.length > 0
      ? "AND TRIM(COALESCE(pathname, '')) IN (SELECT value FROM json_each(?))"
      : "";
  const hasLimit = typeof options?.limit === "number";
  const cursor = options?.cursor;
  const sort = options?.sort ?? "views";
  const direction = options?.direction ?? "desc";
  const sortColumns: Record<
    PagesDashboardSortKey,
    { primary: string; secondary: string }
  > = {
    views: { primary: "views", secondary: "sessions" },
    visitors: { primary: "visitors", secondary: "views" },
    sessions: { primary: "sessions", secondary: "views" },
    bounceRate: { primary: "bounceRate", secondary: "sessions" },
    pagesPerSession: { primary: "pagesPerSession", secondary: "views" },
    avgDurationMs: { primary: "avgDurationMs", secondary: "views" },
    scrollDepth: { primary: "scrollDepthRank", secondary: "views" },
  };
  const { primary, secondary } = sortColumns[sort];
  const operator = direction === "asc" ? ">" : "<";
  const searchClause = options?.search?.trim()
    ? `AND LOWER(pr.pathname) LIKE ? ESCAPE '\\'`
    : "";
  const cursorClause = cursor
    ? `AND (
        pr.${primary} ${operator} ?
        OR (pr.${primary} = ? AND pr.${secondary} ${operator} ?)
        OR (pr.${primary} = ? AND pr.${secondary} = ? AND pr.pathname > ?)
      )`
    : "";
  const sql = `
WITH
${source.sql},
page_visits AS MATERIALIZED (
  SELECT
    pathname,
    session_id AS sessionId,
    visitor_id AS visitorId,
    duration_ms AS durationMs,
    scroll_depth AS scrollDepth
  FROM filtered_visits
  WHERE TRIM(COALESCE(pathname, '')) != ''
  ${pathnameCondition}
),
path_rollup AS (
  SELECT
    pathname,
    count(*) AS views,
    count(DISTINCT CASE WHEN sessionId != '' THEN sessionId ELSE NULL END) AS sessions,
    count(DISTINCT CASE WHEN visitorId != '' THEN visitorId ELSE NULL END) AS visitors,
    COALESCE(sum(CASE WHEN durationMs IS NOT NULL AND durationMs >= 0 THEN durationMs ELSE 0 END), 0) AS totalDuration
  FROM page_visits
  GROUP BY pathname
),
path_scroll_depth AS (
  ${scrollDepthSql({
    from: "page_visits",
    visitor: "visitorId",
    depth: "scrollDepth",
    groupBy: { sql: "pathname", as: "pathname" },
  })}
),
path_session_rollup AS (
  SELECT
    pathname,
    sessionId,
    count(*) AS visitCount
  FROM page_visits
  WHERE sessionId != ''
  GROUP BY pathname, sessionId
),
path_bounce_rollup AS (
  SELECT
    pathname,
    count(*) AS bounces
  FROM path_session_rollup
  WHERE visitCount = 1
  GROUP BY pathname
),
path_metrics AS (
  SELECT
    pr.pathname AS pathname,
    pr.views AS views,
    pr.sessions AS sessions,
    pr.visitors AS visitors,
    COALESCE(pb.bounces, 0) AS bounces,
    pr.totalDuration AS totalDuration,
    0 AS durationViews,
    psd.scrollDepth AS scrollDepth,
    COALESCE(psd.scrollDepth, ${NO_SCROLL_DEPTH_RANK}) AS scrollDepthRank,
    CASE WHEN pr.sessions <= 0 THEN 0.0
      ELSE COALESCE(pb.bounces, 0) * 1.0 / pr.sessions END AS bounceRate,
    CASE WHEN pr.sessions <= 0 THEN 0.0
      ELSE pr.views * 1.0 / pr.sessions END AS pagesPerSession,
    CASE WHEN pr.sessions <= 0 THEN 0.0
      ELSE pr.totalDuration * 1.0 / pr.sessions END AS avgDurationMs
  FROM path_rollup pr
  LEFT JOIN path_bounce_rollup pb ON pb.pathname = pr.pathname
  LEFT JOIN path_scroll_depth psd ON psd.pathname = pr.pathname
)
SELECT
  pr.pathname AS pathname,
  pr.views AS views,
  pr.sessions AS sessions,
  pr.visitors AS visitors,
  pr.bounces AS bounces,
  pr.totalDuration AS totalDuration,
  pr.durationViews AS durationViews,
  pr.scrollDepth AS scrollDepth
FROM path_metrics pr
WHERE 1 = 1
${searchClause}
${cursorClause}
ORDER BY pr.${primary} ${direction}, pr.${secondary} ${direction}, pr.pathname ASC
${hasLimit ? "LIMIT ?" : ""}
`;
  const searchBindings = options?.search?.trim()
    ? [
        `%${options.search
          .trim()
          .toLowerCase()
          .replaceAll("\\", "\\\\")
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_")}%`,
      ]
    : [];
  return (
    await queryD1All<Record<string, unknown>>(env, sql, [
      ...source.bindings,
      ...(requestedPathnames.length > 0
        ? [JSON.stringify(requestedPathnames)]
        : []),
      ...searchBindings,
      ...(cursor
        ? [
            cursor.primary,
            cursor.primary,
            cursor.secondary,
            cursor.primary,
            cursor.secondary,
            cursor.pathname,
          ]
        : []),
      ...(hasLimit ? [options?.limit ?? 0] : []),
    ])
  ).map((row) => ({
    pathname: String(row.pathname ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
    bounces: Number(row.bounces ?? 0),
    totalDuration: Number(row.totalDuration ?? 0),
    durationViews: Number(row.durationViews ?? 0),
    scrollDepth: scrollDepthOf(row.scrollDepth),
  }));
}
export async function queryPageCardDetailsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  interval: Interval,
  filters: FilterDocument,
  pathnames: string[],
  titleLimit: number,
): Promise<{ titles: PageCardTitleRow[]; trend: PageCardTrendRow[] }> {
  const requestedPathnames = Array.from(
    new Set(
      pathnames
        .map((pathname) => String(pathname ?? "").trim())
        .filter((pathname) => pathname.length > 0),
    ),
  );
  if (requestedPathnames.length === 0) return { titles: [], trend: [] };

  const source = filteredVisitsCte(siteId, window, filters);
  const buckets = buildTimeBuckets(window, interval);
  const bucket = timeBucketCase(buckets, "startedAt");
  const sql = `
WITH
${source.sql},
page_visits AS MATERIALIZED (
  SELECT
    pathname,
    title,
    started_at AS startedAt,
    visitor_id AS visitorId
  FROM filtered_visits
  WHERE TRIM(COALESCE(pathname, '')) IN (SELECT value FROM json_each(?))
),
title_rollup AS (
  SELECT
    pathname,
    TRIM(COALESCE(title, '')) AS title,
    count(*) AS views
  FROM page_visits
  WHERE TRIM(COALESCE(title, '')) != ''
  GROUP BY pathname, TRIM(COALESCE(title, ''))
),
ranked_titles AS (
  SELECT
    pathname,
    title,
    views,
    ROW_NUMBER() OVER (PARTITION BY pathname ORDER BY views DESC, title ASC) AS titleRank
  FROM title_rollup
),
trend_rollup AS (
  SELECT
    pathname,
    ${bucket.sql} AS bucket,
    count(*) AS views,
    count(DISTINCT CASE WHEN visitorId != '' THEN visitorId ELSE NULL END) AS visitors
  FROM page_visits
  GROUP BY pathname, bucket
)
SELECT
  'title' AS rowKind,
  pathname,
  title,
  views,
  NULL AS bucket,
  NULL AS visitors,
  titleRank AS rowOrder
FROM ranked_titles
WHERE titleRank <= ?
UNION ALL
SELECT
  'trend' AS rowKind,
  pathname,
  NULL AS title,
  views,
  bucket,
  visitors,
  bucket AS rowOrder
FROM trend_rollup
ORDER BY rowKind ASC, pathname ASC, rowOrder ASC
`;
  const rows = await queryD1All<Record<string, unknown>>(env, sql, [
    ...source.bindings,
    JSON.stringify(requestedPathnames),
    ...bucket.bindings,
    titleLimit,
  ]);
  const titles: PageCardTitleRow[] = [];
  const trend: PageCardTrendRow[] = [];
  for (const row of rows) {
    if (row.rowKind === "title") {
      titles.push({
        pathname: String(row.pathname ?? ""),
        title: String(row.title ?? ""),
        views: Number(row.views ?? 0),
      });
      continue;
    }
    if (row.rowKind === "trend") {
      const trendBucket = Number(row.bucket ?? 0);
      trend.push({
        pathname: String(row.pathname ?? ""),
        bucket: trendBucket,
        timestampMs: timeBucketTimestamp(buckets, trendBucket),
        views: Number(row.views ?? 0),
        visitors: Number(row.visitors ?? 0),
      });
    }
  }
  return { titles, trend };
}
