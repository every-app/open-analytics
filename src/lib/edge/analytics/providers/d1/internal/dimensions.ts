import {
  analyticsFilterRegistry,
  filterFingerprint,
  type QueryAudience,
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
  DimensionRow,
  FilterDocument,
  QueryWindow,
  ReferrerRow,
} from "./core";
import { type BoundSql, filteredVisitsCte, queryD1All } from "./core";
import type { D1ReadDiagnostics } from "./diagnostics";
import { dailyDimensionRows, rollupEdgeSource } from "./rollup-breakdowns";
import {
  rollupDimensionForExpression,
  sessionRollupDimension,
} from "./rollup-dimensions";

export interface DimensionAggregateCursor {
  /** The first two values are the concrete ORDER BY metrics. */
  readonly primary: number;
  readonly secondary: number;
  readonly value: string;
}

export interface SessionPathDimensionCursor {
  readonly views: number;
  readonly value: string;
  /** Present on cursors created for visitor-sorted session paths. */
  readonly visitors?: number;
}

export type DimensionPageSortKey = "views" | "sessions" | "visitors";

function dimensionSortKey(
  value: DimensionPageSortKey | undefined,
): DimensionPageSortKey {
  return value === "visitors" || value === "sessions" ? value : "views";
}

function dimensionSortDirection(
  value: "asc" | "desc" | undefined,
): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function dimensionSortColumns(sortBy: DimensionPageSortKey): {
  primary: DimensionPageSortKey;
  secondary: DimensionPageSortKey;
} {
  if (sortBy === "visitors") return { primary: "visitors", secondary: "views" };
  if (sortBy === "sessions") return { primary: "sessions", secondary: "views" };
  return { primary: "views", secondary: "sessions" };
}

function dimensionCursor(value: unknown): DimensionAggregateCursor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return hasExactKeys(candidate, ["primary", "secondary", "value"]) &&
    typeof candidate.primary === "number" &&
    Number.isFinite(candidate.primary) &&
    typeof candidate.secondary === "number" &&
    Number.isFinite(candidate.secondary) &&
    typeof candidate.value === "string"
    ? (candidate as unknown as DimensionAggregateCursor)
    : null;
}

function sessionPathDimensionCursor(
  value: unknown,
): SessionPathDimensionCursor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    hasExactKeys(candidate, ["views", "value"]) &&
    typeof candidate.views === "number" &&
    Number.isFinite(candidate.views) &&
    typeof candidate.value === "string"
  ) {
    return candidate as unknown as SessionPathDimensionCursor;
  }
  return hasExactKeys(candidate, ["views", "visitors", "value"]) &&
    typeof candidate.views === "number" &&
    Number.isFinite(candidate.views) &&
    typeof candidate.visitors === "number" &&
    Number.isFinite(candidate.visitors) &&
    typeof candidate.value === "string"
    ? (candidate as unknown as SessionPathDimensionCursor)
    : null;
}

export type SessionPathKind = "entry" | "exit";

function dimensionCursorBinding(
  operation: string,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  selectExpr: string,
  search?: string,
  audience: QueryAudience = "private-dashboard",
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<string> {
  return paginationBindingForWindow(window, [
    `analytics-${operation}-v1`,
    audience,
    siteId,
    window.startMs,
    window.endExclusiveMs,
    window.timeZone,
    filterFingerprint(filters, analyticsFilterRegistry),
    selectExpr,
    search?.trim().toLowerCase() ?? "",
    sortBy,
    sortDirection,
  ]);
}

function searchBinding(search: string): string {
  return `%${search
    .trim()
    .toLowerCase()
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")}%`;
}

/**
 * The `dimension_rollup` CTE (value, views, sessions, visitors) for a
 * grouping expression. Unfiltered reads of a rolled-up card dimension add
 * the rolled-up days to a raw grouping of the window's edges.
 */
async function dimensionAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  selectExpr: string,
  diagnostics?: D1ReadDiagnostics,
): Promise<BoundSql> {
  const grouping = (relation: string) => `
  SELECT
    COALESCE(${selectExpr}, '') AS value,
    count(*) AS views,
    count(DISTINCT session_id) AS sessions,
    count(DISTINCT visitor_id) AS visitors
  FROM ${relation}
  GROUP BY value`;
  const dimension = rollupDimensionForExpression(selectExpr);
  const rollup = dimension
    ? await rollupEdgeSource(env, siteId, window, filters, diagnostics)
    : null;
  if (dimension && rollup) {
    const daily = dailyDimensionRows(siteId, dimension, rollup.split);
    return {
      sql: `${rollup.visitSource.sql},
dimension_rollup AS (
  SELECT value, SUM(views) AS views, SUM(sessions) AS sessions, SUM(visitors) AS visitors
  FROM (${grouping("visit_source")}
    UNION ALL
    ${daily.sql}
  )
  GROUP BY value
)`,
      bindings: [...rollup.visitSource.bindings, ...daily.bindings],
    };
  }
  const source = filteredVisitsCte(siteId, window, filters);
  return {
    sql: `${source.sql},
dimension_rollup AS (${grouping("filtered_visits")}
)`,
    bindings: source.bindings,
  };
}

/** A card's rows (value, views, sessions, visitors) as a statement of their own. */
export async function dimensionRowsSql(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  selectExpr: string,
  diagnostics?: D1ReadDiagnostics,
): Promise<BoundSql> {
  const aggregate = await dimensionAggregate(
    env,
    siteId,
    window,
    filters,
    selectExpr,
    diagnostics,
  );
  return {
    sql: `WITH
${aggregate.sql}
SELECT value, views, sessions, visitors FROM dimension_rollup`,
    bindings: aggregate.bindings,
  };
}

export async function queryDimensionFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  selectExpr: string,
  options?: {
    excludeEmpty?: boolean;
    search?: string;
    sortBy?: DimensionPageSortKey;
    sortDirection?: "asc" | "desc";
  },
  diagnostics?: D1ReadDiagnostics,
): Promise<DimensionRow[]> {
  const sortBy = dimensionSortKey(options?.sortBy);
  const sortDirection = dimensionSortDirection(options?.sortDirection);
  const { primary, secondary } = dimensionSortColumns(sortBy);
  const limitClause = limit > 0 ? "\nLIMIT ?" : "";
  const aggregate = await dimensionAggregate(
    env,
    siteId,
    window,
    filters,
    selectExpr,
    diagnostics,
  );
  const sql = `
WITH
${aggregate.sql}
SELECT value, views, sessions, visitors
FROM dimension_rollup
${options?.excludeEmpty ? "WHERE TRIM(value) != ''" : ""}
${options?.search ? `${options?.excludeEmpty ? "AND" : "WHERE"} LOWER(value) LIKE ? ESCAPE '\\'` : ""}
ORDER BY ${primary} ${sortDirection}, ${secondary} ${sortDirection}, value ASC
${limitClause}
`;
  return (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      [
        ...aggregate.bindings,
        ...(options?.search ? [searchBinding(options.search)] : []),
        ...(limit > 0 ? [limit] : []),
      ],
      diagnostics,
    )
  ).map((row) => ({
    value: String(row.value ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
}

/** Keyset-paginated variant for browsable dimension values. */
export async function queryDimensionPageFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  selectExpr: string,
  options?: {
    excludeEmpty?: boolean;
    search?: string;
    sortBy?: DimensionPageSortKey;
    sortDirection?: "asc" | "desc";
  },
  cursor?: DimensionAggregateCursor | null,
  diagnostics?: D1ReadDiagnostics,
  audience: QueryAudience = "private-dashboard",
): Promise<PageResult<DimensionRow>> {
  const sortBy = dimensionSortKey(options?.sortBy);
  const sortDirection = dimensionSortDirection(options?.sortDirection);
  const { primary, secondary } = dimensionSortColumns(sortBy);
  const operator = sortDirection === "asc" ? ">" : "<";
  const cursorClause = cursor
    ? `
AND (
  ${primary} ${operator} ?
  OR (${primary} = ? AND ${secondary} ${operator} ?)
  OR (${primary} = ? AND ${secondary} = ? AND value > ?)
)`
    : "";
  const aggregate = await dimensionAggregate(
    env,
    siteId,
    window,
    filters,
    selectExpr,
    diagnostics,
  );
  const sql = `
WITH
${aggregate.sql}
SELECT value, views, sessions, visitors
FROM dimension_rollup
WHERE 1 = 1
${options?.excludeEmpty ? "AND TRIM(value) != ''" : ""}
${options?.search ? "AND LOWER(value) LIKE ? ESCAPE '\\'" : ""}
${cursorClause}
ORDER BY views DESC, sessions DESC, value ASC
LIMIT ?
`;
  const orderedSql = sql.replace(
    "ORDER BY views DESC, sessions DESC, value ASC",
    `ORDER BY ${primary} ${sortDirection}, ${secondary} ${sortDirection}, value ASC`,
  );
  const cursorBindings = cursor
    ? [
        cursor.primary,
        cursor.primary,
        cursor.secondary,
        cursor.primary,
        cursor.secondary,
        cursor.value,
      ]
    : [];
  const rows = await queryD1All<Record<string, unknown>>(
    env,
    orderedSql,
    [
      ...aggregate.bindings,
      ...(options?.search ? [searchBinding(options.search)] : []),
      ...cursorBindings,
      limit + 1,
    ],
    diagnostics,
  );
  const mapped = rows.map((row) => ({
    value: String(row.value ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
  const page = pageResult(mapped, limit);
  const binding = await dimensionCursorBinding(
    "dimensions",
    siteId,
    window,
    filters,
    selectExpr,
    options?.search,
    audience,
    sortBy,
    sortDirection,
  );
  const nextCursor =
    page.hasMore && page.last
      ? await encodePageCursor(env, binding, {
          primary: page.last[primary],
          secondary: page.last[secondary],
          value: page.last.value,
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

export async function decodeDimensionCursor(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  selectExpr: string,
  search?: string,
  cursor?: string | null,
  audience: QueryAudience = "private-dashboard",
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<DimensionAggregateCursor | null> {
  return decodePageCursor<DimensionAggregateCursor>(
    env,
    await dimensionCursorBinding(
      "dimensions",
      siteId,
      window,
      filters,
      selectExpr,
      search,
      audience,
      sortBy,
      sortDirection,
    ),
    cursor,
    "dimensions",
    dimensionCursor,
  );
}

/**
 * CTEs that rank the page views of `relation` within their sessions, ending
 * in `raw_session_paths` (value, views, sessions, visitors): visits by entry
 * or exit page.
 */
export function sessionPathGroupingCtes(
  relation: string,
  kind: SessionPathKind,
): string {
  const boundaryRank = kind === "entry" ? "first_rank" : "latest_rank";
  return `
ranked_session_visits AS (
  SELECT
    vs.session_id,
    vs.visitor_id,
    TRIM(COALESCE(vs.pathname, '')) AS pathname,
    ROW_NUMBER() OVER (
      PARTITION BY vs.session_id
      ORDER BY vs.started_at ASC, vs.visit_id ASC
    ) AS first_rank,
    ROW_NUMBER() OVER (
      PARTITION BY vs.session_id
      ORDER BY vs.started_at DESC, vs.visit_id DESC
    ) AS latest_rank
  FROM ${relation} vs
  WHERE TRIM(COALESCE(vs.pathname, '')) != ''
),
session_edges AS (
  SELECT
    session_id,
    MAX(CASE WHEN first_rank = 1 THEN visitor_id END) AS visitor_id,
    MAX(CASE WHEN ${boundaryRank} = 1 THEN pathname END) AS value
  FROM ranked_session_visits
  GROUP BY session_id
),
raw_session_paths AS (
  SELECT
    value,
    count(*) AS views,
    count(*) AS sessions,
    count(DISTINCT visitor_id) AS visitors
  FROM session_edges
  WHERE TRIM(value) != ''
  GROUP BY value
)`;
}

/**
 * The `session_path_rollup` CTE (value, views, sessions, visitors): visits
 * by entry or exit page. Unfiltered reads of a site with rolled-up days add
 * those days to the raw grouping of the window's edges.
 */
async function sessionPathAggregate(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  kind: SessionPathKind,
  diagnostics?: D1ReadDiagnostics,
): Promise<BoundSql> {
  const rollup = await rollupEdgeSource(
    env,
    siteId,
    window,
    filters,
    diagnostics,
  );
  if (rollup) {
    const daily = dailyDimensionRows(
      siteId,
      sessionRollupDimension(kind),
      rollup.split,
    );
    return {
      sql: `${rollup.visitSource.sql},
${sessionPathGroupingCtes("visit_source", kind)},
session_path_rollup AS (
  SELECT value, SUM(views) AS views, SUM(sessions) AS sessions, SUM(visitors) AS visitors
  FROM (
    SELECT value, views, sessions, visitors FROM raw_session_paths
    UNION ALL
    ${daily.sql}
  )
  GROUP BY value
)`,
      bindings: [...rollup.visitSource.bindings, ...daily.bindings],
    };
  }
  const source = filteredVisitsCte(siteId, window, filters, {
    columns: "visitor_id, session_id, started_at, visit_id, pathname",
  });
  return {
    sql: `${source.sql},
${sessionPathGroupingCtes("filtered_visits", kind)},
session_path_rollup AS (
  SELECT value, views, sessions, visitors FROM raw_session_paths
)`,
    bindings: source.bindings,
  };
}

/** Visits by entry or exit page (value, views, sessions, visitors) as a statement of their own. */
export async function sessionPathRowsSql(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  kind: SessionPathKind,
  diagnostics?: D1ReadDiagnostics,
): Promise<BoundSql> {
  const aggregate = await sessionPathAggregate(
    env,
    siteId,
    window,
    filters,
    kind,
    diagnostics,
  );
  return {
    sql: `WITH
${aggregate.sql}
SELECT value, views, sessions, visitors FROM session_path_rollup`,
    bindings: aggregate.bindings,
  };
}

export async function querySessionPathDimensionFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  kind: "entry" | "exit",
  diagnostics?: D1ReadDiagnostics,
  search?: string,
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<DimensionRow[]> {
  const effectiveSortBy = dimensionSortKey(sortBy);
  const effectiveSortDirection = sortDirection === "asc" ? "asc" : "desc";
  const primary = effectiveSortBy;
  const secondary = effectiveSortBy === "visitors" ? "views" : null;
  const limitClause = limit > 0 ? "\nLIMIT ?" : "";
  const aggregate = await sessionPathAggregate(
    env,
    siteId,
    window,
    filters,
    kind,
    diagnostics,
  );
  const sql = `
WITH
${aggregate.sql}
SELECT value, views, sessions, visitors
FROM session_path_rollup
${search ? "WHERE LOWER(value) LIKE ? ESCAPE '\\'" : ""}
ORDER BY ${primary} ${effectiveSortDirection}, ${secondary ? `${secondary} ${effectiveSortDirection}, ` : ""}value ASC
${limitClause}
`;
  return (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      [
        ...aggregate.bindings,
        ...(search ? [searchBinding(search)] : []),
        ...(limit > 0 ? [limit] : []),
      ],
      diagnostics,
    )
  ).map((row) => ({
    value: String(row.value ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
}

export async function querySessionPathDimensionPageFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  kind: SessionPathKind,
  diagnostics?: D1ReadDiagnostics,
  search?: string,
  cursor?: SessionPathDimensionCursor | null,
  audience: QueryAudience = "private-dashboard",
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<PageResult<DimensionRow>> {
  const effectiveSortBy = dimensionSortKey(sortBy);
  const effectiveSortDirection = sortDirection === "asc" ? "asc" : "desc";
  const searchClause = search ? "AND LOWER(value) LIKE ? ESCAPE '\\'" : "";
  const operator = effectiveSortDirection === "asc" ? ">" : "<";
  const cursorClause = cursor
    ? effectiveSortBy === "visitors"
      ? `
AND (
  visitors ${operator} ?
  OR (visitors = ? AND views ${operator} ?)
  OR (visitors = ? AND views = ? AND value > ?)
)`
      : `AND (${effectiveSortBy} ${operator} ? OR (${effectiveSortBy} = ? AND value > ?))`
    : "";
  const orderBy =
    effectiveSortBy === "visitors"
      ? `ORDER BY visitors ${effectiveSortDirection}, views ${effectiveSortDirection}, value ASC`
      : `ORDER BY ${effectiveSortBy} ${effectiveSortDirection}, value ASC`;
  const aggregate = await sessionPathAggregate(
    env,
    siteId,
    window,
    filters,
    kind,
    diagnostics,
  );
  const sql = `
WITH
${aggregate.sql}
SELECT
  value,
  views,
  sessions,
  visitors
FROM session_path_rollup
WHERE 1 = 1
${searchClause}
${cursorClause}
${orderBy}
LIMIT ?
`;
  const cursorBindings = cursor
    ? effectiveSortBy === "visitors"
      ? [
          cursor.visitors ?? cursor.views,
          cursor.visitors ?? cursor.views,
          cursor.views,
          cursor.visitors ?? cursor.views,
          cursor.views,
          cursor.value,
        ]
      : [cursor.views, cursor.views, cursor.value]
    : [];
  const rows = await queryD1All<Record<string, unknown>>(
    env,
    sql,
    [
      ...aggregate.bindings,
      ...(search ? [searchBinding(search)] : []),
      ...cursorBindings,
      limit + 1,
    ],
    diagnostics,
  );
  const mapped = rows.map((row) => ({
    value: String(row.value ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
  const page = pageResult(mapped, limit);
  const binding = await paginationBindingForWindow(window, [
    `analytics-session-${kind}-v1`,
    siteId,
    window.startMs,
    window.endExclusiveMs,
    window.timeZone,
    filterFingerprint(filters, analyticsFilterRegistry),
    search?.trim().toLowerCase() ?? "",
    audience,
    effectiveSortBy,
    effectiveSortDirection,
  ]);
  const nextCursor =
    page.hasMore && page.last
      ? await encodePageCursor(
          env,
          binding,
          effectiveSortBy === "visitors"
            ? {
                views: page.last.views,
                visitors: page.last.visitors,
                value: page.last.value,
              }
            : { views: page.last.views, value: page.last.value },
        )
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

export async function decodeSessionPathDimensionCursor(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  kind: SessionPathKind,
  search?: string,
  cursor?: string | null,
  audience: QueryAudience = "private-dashboard",
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<SessionPathDimensionCursor | null> {
  const effectiveSortBy = dimensionSortKey(sortBy);
  const effectiveSortDirection = sortDirection === "asc" ? "asc" : "desc";
  const decoded = await decodePageCursor<SessionPathDimensionCursor>(
    env,
    await paginationBindingForWindow(window, [
      `analytics-session-${kind}-v1`,
      siteId,
      window.startMs,
      window.endExclusiveMs,
      window.timeZone,
      filterFingerprint(filters, analyticsFilterRegistry),
      search?.trim().toLowerCase() ?? "",
      audience,
      effectiveSortBy,
      effectiveSortDirection,
    ]),
    cursor,
    "session-dimension",
    sessionPathDimensionCursor,
  );
  return effectiveSortBy === "visitors" &&
    decoded &&
    decoded.visitors === undefined
    ? null
    : decoded;
}

export async function querySessionBoundaryDimensionFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  kind: "entry" | "exit",
  diagnostics?: D1ReadDiagnostics,
  search?: string,
  sortBy: DimensionPageSortKey = "views",
  sortDirection: "asc" | "desc" = "desc",
): Promise<DimensionRow[]> {
  return querySessionPathDimensionFromD1(
    env,
    siteId,
    window,
    filters,
    limit,
    kind,
    diagnostics,
    search,
    sortBy,
    sortDirection,
  );
}

export async function queryReferrersFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
  includeFullUrl: boolean,
  diagnostics?: D1ReadDiagnostics,
  search?: string,
): Promise<ReferrerRow[]> {
  const source = filteredVisitsCte(siteId, window, filters);
  const keyExpr = includeFullUrl ? "referrer_url" : "referrer_host";
  const sql = `
WITH
${source.sql}
SELECT
  COALESCE(${keyExpr}, '') AS referrer,
  count(*) AS views,
  count(DISTINCT session_id) AS sessions,
  count(DISTINCT visitor_id) AS visitors
FROM filtered_visits
GROUP BY referrer
${search ? "HAVING LOWER(referrer) LIKE ? ESCAPE '\\'" : ""}
ORDER BY views DESC, sessions DESC, referrer ASC
LIMIT ?
`;
  return (
    await queryD1All<Record<string, unknown>>(
      env,
      sql,
      [
        ...source.bindings,
        ...(search
          ? [
              `%${search
                .trim()
                .toLowerCase()
                .replaceAll("\\", "\\\\")
                .replaceAll("%", "\\%")
                .replaceAll("_", "\\_")}%`,
            ]
          : []),
        limit,
      ],
      diagnostics,
    )
  ).map((row) => ({
    referrer: String(row.referrer ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
}
