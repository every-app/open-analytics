import type {
  FilterDocument,
  OverviewTableMetric,
  OverviewTableSortBy,
  QueryAudience,
  SortDirection,
} from "@/lib/edge/analytics/contract";
import {
  analyticsFilterRegistry,
  effectiveScopeForPagination,
  filterFingerprint,
} from "@/lib/edge/analytics/contract";
import type { Env } from "@/lib/edge/types";
import {
  decodePageCursor,
  encodePageCursor,
  hasExactKeys,
  pageResult,
  paginationBindingForWindow,
} from "@/lib/pagination";

import { queryD1All } from "./core";
import type { DimensionRow, QueryWindow } from "./core-types";
import type { D1ReadDiagnostics } from "./diagnostics";
import { dimensionRowsSql, sessionPathRowsSql } from "./dimensions";
import type { BoundSql } from "./rollup-breakdowns";

export interface ComparisonDimensionCursor {
  readonly sortClass: number;
  readonly primary: number;
  readonly secondary: number;
  readonly key: string;
}

interface ComparisonDimensionOptions {
  readonly metric: OverviewTableMetric;
  readonly sortBy: OverviewTableSortBy;
  readonly direction: SortDirection;
  readonly search?: string;
  /** The key of the rows with no value, which are otherwise left out. */
  readonly emptyKey?: string;
}

interface MetricChange {
  readonly absolute: number;
  readonly relative: number | null;
}

interface ComparisonDimensionPage {
  readonly items: readonly (DimensionRow & {
    readonly key: string;
    readonly reference: {
      readonly views: number;
      readonly sessions: number;
      readonly visitors: number;
    };
    readonly change: {
      readonly views: MetricChange;
      readonly sessions: MetricChange;
      readonly visitors: MetricChange;
    };
  })[];
  readonly pagination: {
    readonly limit: number;
    readonly returned: number;
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
  };
}

/** A card's rows (value, views, sessions, visitors) in a period. */
type CardRows = (
  window: QueryWindow,
  filters: FilterDocument,
) => Promise<BoundSql>;

function decodeComparisonCursor(
  value: unknown,
): ComparisonDimensionCursor | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return hasExactKeys(candidate, [
    "sortClass",
    "primary",
    "secondary",
    "key",
  ]) &&
    typeof candidate.sortClass === "number" &&
    Number.isFinite(candidate.sortClass) &&
    typeof candidate.primary === "number" &&
    Number.isFinite(candidate.primary) &&
    typeof candidate.secondary === "number" &&
    Number.isFinite(candidate.secondary) &&
    typeof candidate.key === "string"
    ? (candidate as unknown as ComparisonDimensionCursor)
    : null;
}

function relativeSql(current: string, reference: string): string {
  return `CASE WHEN ${reference} = 0 THEN CASE WHEN ${current} = 0 THEN 0.0 ELSE NULL END ELSE (${current} - ${reference}) * 1.0 / ${reference} END`;
}

function comparisonOrdering(
  metric: OverviewTableMetric,
  sortBy: OverviewTableSortBy,
  direction: SortDirection,
): { expression: string; cursorPredicate: string } {
  const metricColumn =
    metric === "visitors"
      ? "visitors"
      : metric === "sessions"
        ? "sessions"
        : "views";
  const source =
    sortBy === "reference"
      ? `reference_${metricColumn}`
      : sortBy === "change"
        ? "change_relative"
        : `current_${metricColumn}`;
  if (sortBy !== "change") {
    const secondary =
      sortBy === "reference"
        ? `current_${metricColumn}`
        : `reference_${metricColumn}`;
    const operator = direction === "asc" ? ">" : "<";
    return {
      expression: `${source} ${direction}, ${secondary} ${direction}, key ASC`,
      cursorPredicate: `(
        ${source} ${operator} ?
        OR (${source} = ? AND ${secondary} ${operator} ?)
        OR (${source} = ? AND ${secondary} = ? AND key > ?)
      )`,
    };
  }

  const classDirection = direction === "asc" ? "asc" : "desc";
  const classOperator = direction === "asc" ? ">" : "<";
  const valueOperator = direction === "asc" ? ">" : "<";
  return {
    expression: `change_class ${classDirection}, change_relative ${classDirection}, key ASC`,
    cursorPredicate: `(
      change_class ${classOperator} ?
      OR (change_class = ? AND (
        change_relative ${valueOperator} ?
        OR (change_relative = ? AND key > ?)
      ))
    )`,
  };
}

function comparisonCursorBinding(
  siteId: string,
  current: QueryWindow,
  currentFilters: FilterDocument,
  reference: QueryWindow,
  referenceFilters: FilterDocument,
  selectExpr: string,
  search: string | undefined,
  audience: QueryAudience,
  metric: OverviewTableMetric,
  sortBy: OverviewTableSortBy,
  direction: SortDirection,
): Promise<string> {
  return paginationBindingForWindow(current, [
    "analytics-overview-table-comparison-v1",
    audience,
    siteId,
    current.startMs,
    current.endExclusiveMs,
    current.timeZone,
    reference.startMs,
    reference.endExclusiveMs,
    reference.timeZone,
    filterFingerprint(currentFilters, analyticsFilterRegistry),
    effectiveScopeForPagination(currentFilters),
    filterFingerprint(referenceFilters, analyticsFilterRegistry),
    effectiveScopeForPagination(referenceFilters),
    selectExpr,
    search?.trim().toLowerCase() ?? "",
    metric,
    sortBy,
    direction,
  ]);
}

export async function decodeComparisonDimensionCursor(
  env: Env,
  siteId: string,
  current: QueryWindow,
  currentFilters: FilterDocument,
  reference: QueryWindow,
  referenceFilters: FilterDocument,
  selectExpr: string,
  search: string | undefined,
  cursor: string | null | undefined,
  audience: QueryAudience,
  metric: OverviewTableMetric,
  sortBy: OverviewTableSortBy,
  direction: SortDirection,
): Promise<ComparisonDimensionCursor | null> {
  return decodePageCursor(
    env,
    await comparisonCursorBinding(
      siteId,
      current,
      currentFilters,
      reference,
      referenceFilters,
      selectExpr,
      search,
      audience,
      metric,
      sortBy,
      direction,
    ),
    cursor,
    "overview-table-comparison",
    decodeComparisonCursor,
  );
}

/**
 * A page of a card's rows in the current period beside the reference
 * period. Each side reads its rows as the card does, so an unfiltered side
 * reads the rolled-up days and only the raw page views around them.
 */
async function queryComparisonPageFromD1(
  env: Env,
  siteId: string,
  current: QueryWindow,
  currentFilters: FilterDocument,
  reference: QueryWindow,
  referenceFilters: FilterDocument,
  limit: number,
  card: string,
  cardRows: CardRows,
  options: ComparisonDimensionOptions,
  cursor: ComparisonDimensionCursor | null,
  audience: QueryAudience,
  diagnostics?: D1ReadDiagnostics,
): Promise<ComparisonDimensionPage> {
  const [currentRows, referenceRows] = await Promise.all([
    cardRows(current, currentFilters),
    cardRows(reference, referenceFilters),
  ]);
  const searchClause = options.search?.trim()
    ? "AND LOWER(key) LIKE ? ESCAPE '\\'"
    : "";
  const ordering = comparisonOrdering(
    options.metric,
    options.sortBy,
    options.direction,
  );
  const cursorClause = cursor ? `AND ${ordering.cursorPredicate}` : "";
  const metricCurrent = `current_${options.metric}`;
  const metricReference = `reference_${options.metric}`;
  const changeRelative = relativeSql(metricCurrent, metricReference);
  const changeClass = `CASE WHEN ${metricReference} = 0 AND ${metricCurrent} > 0 THEN 1 ELSE 0 END`;
  const key = options.emptyKey
    ? "CASE WHEN keys.value = '' THEN ? ELSE keys.value END"
    : "keys.value";
  const sql = `
WITH
current_rollup AS (
${currentRows.sql}
),
reference_rollup AS (
${referenceRows.sql}
),
joined AS (
  SELECT
    ${key} AS key,
    COALESCE(c.views, 0) AS current_views,
    COALESCE(c.sessions, 0) AS current_sessions,
    COALESCE(c.visitors, 0) AS current_visitors,
    COALESCE(r.views, 0) AS reference_views,
    COALESCE(r.sessions, 0) AS reference_sessions,
    COALESCE(r.visitors, 0) AS reference_visitors
  FROM (
    SELECT value FROM current_rollup
    UNION
    SELECT value FROM reference_rollup
  ) keys
  LEFT JOIN current_rollup c ON c.value = keys.value
  LEFT JOIN reference_rollup r ON r.value = keys.value
),
projected AS (
  SELECT *,
    ${changeRelative} AS change_relative,
    ${changeClass} AS change_class
  FROM joined
)
SELECT * FROM projected
WHERE key != ''
${searchClause}
${cursorClause}
ORDER BY ${ordering.expression}
LIMIT ?
`;
  const searchBindings = options.search?.trim()
    ? [
        `%${options.search
          .trim()
          .toLowerCase()
          .replaceAll("\\", "\\\\")
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_")}%`,
      ]
    : [];
  const cursorBindings = cursor
    ? options.sortBy === "change"
      ? [
          cursor.sortClass,
          cursor.sortClass,
          cursor.primary,
          cursor.primary,
          cursor.key,
        ]
      : [
          cursor.primary,
          cursor.primary,
          cursor.secondary,
          cursor.primary,
          cursor.secondary,
          cursor.key,
        ]
    : [];
  const rows = await queryD1All<Record<string, unknown>>(
    env,
    sql,
    [
      ...currentRows.bindings,
      ...referenceRows.bindings,
      ...(options.emptyKey ? [options.emptyKey] : []),
      ...searchBindings,
      ...cursorBindings,
      limit + 1,
    ],
    diagnostics,
  );
  const mapped = rows.map((row) => {
    const number = (name: string) => Number(row[name] ?? 0);
    const currentViews = number("current_views");
    const currentSessions = number("current_sessions");
    const currentVisitors = number("current_visitors");
    const referenceViews = number("reference_views");
    const referenceSessions = number("reference_sessions");
    const referenceVisitors = number("reference_visitors");
    const delta = (a: number, b: number) => ({
      absolute: a - b,
      relative: b === 0 ? (a === 0 ? 0 : null) : (a - b) / b,
    });
    return {
      key: String(row.key ?? ""),
      value: String(row.key ?? ""),
      views: currentViews,
      sessions: currentSessions,
      visitors: currentVisitors,
      reference: {
        views: referenceViews,
        sessions: referenceSessions,
        visitors: referenceVisitors,
      },
      change: {
        views: delta(currentViews, referenceViews),
        sessions: delta(currentSessions, referenceSessions),
        visitors: delta(currentVisitors, referenceVisitors),
      },
    };
  });
  const page = pageResult(mapped, limit);
  const binding = await comparisonCursorBinding(
    siteId,
    current,
    currentFilters,
    reference,
    referenceFilters,
    card,
    options.search,
    audience,
    options.metric,
    options.sortBy,
    options.direction,
  );
  const nextCursor =
    page.hasMore && page.last
      ? await encodePageCursor(env, binding, {
          sortClass:
            options.sortBy === "change" &&
            page.last.reference[options.metric] === 0 &&
            page.last[options.metric] > 0
              ? 1
              : 0,
          primary:
            options.sortBy === "reference"
              ? page.last.reference[options.metric]
              : options.sortBy === "change"
                ? (page.last.change[options.metric].relative ?? 0)
                : page.last[options.metric],
          secondary:
            options.sortBy === "current"
              ? page.last.reference[options.metric]
              : options.sortBy === "reference"
                ? page.last[options.metric]
                : 0,
          key: page.last.key,
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

export function queryComparisonDimensionPageFromD1(
  env: Env,
  siteId: string,
  current: QueryWindow,
  currentFilters: FilterDocument,
  reference: QueryWindow,
  referenceFilters: FilterDocument,
  limit: number,
  selectExpr: string,
  options: ComparisonDimensionOptions,
  cursor: ComparisonDimensionCursor | null,
  audience: QueryAudience,
  diagnostics?: D1ReadDiagnostics,
): Promise<ComparisonDimensionPage> {
  return queryComparisonPageFromD1(
    env,
    siteId,
    current,
    currentFilters,
    reference,
    referenceFilters,
    limit,
    selectExpr,
    (window, filters) =>
      dimensionRowsSql(env, siteId, window, filters, selectExpr, diagnostics),
    options,
    cursor,
    audience,
    diagnostics,
  );
}

/** Comparison variant for session entry/exit, where each session contributes
 * only its first/last page rather than every page view. */
export function queryComparisonSessionPathPageFromD1(
  env: Env,
  siteId: string,
  current: QueryWindow,
  currentFilters: FilterDocument,
  reference: QueryWindow,
  referenceFilters: FilterDocument,
  limit: number,
  kind: "entry" | "exit",
  options: ComparisonDimensionOptions,
  cursor: ComparisonDimensionCursor | null,
  audience: QueryAudience,
  diagnostics?: D1ReadDiagnostics,
): Promise<ComparisonDimensionPage> {
  return queryComparisonPageFromD1(
    env,
    siteId,
    current,
    currentFilters,
    reference,
    referenceFilters,
    limit,
    `session.${kind}`,
    (window, filters) =>
      sessionPathRowsSql(env, siteId, window, filters, kind, diagnostics),
    options,
    cursor,
    audience,
    diagnostics,
  );
}
