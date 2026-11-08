import { createDatabaseRuntime } from "@/lib/db";
import {
  concat,
  parameter,
  type SqlFragment,
  text,
} from "@/lib/db/sql/fragment";
import {
  currentD1Operation,
  currentInvocationLogger,
} from "@/lib/edge/observability/logger";
import type { Env } from "@/lib/edge/types";

import type { FilterDocument, QueryWindow } from "./core-types";
import { type D1ReadDiagnostics, recordD1RowsRead } from "./diagnostics";
import {
  eventFilterSql,
  type FilterSqlScope,
  sitePk,
  visitFilterSql,
} from "./filter-compiler";
export interface BoundSql {
  readonly sql: string;
  readonly bindings: ReadonlyArray<string | number | null>;
}

export const VISIT_SOURCE_COLUMNS = `
    visit_id, site_pk, visitor_id, session_id, status, started_at, last_activity_at,
    ended_at, finalized_at, duration_ms, scroll_depth, duration_source, exit_reason,
    pathname, query_string, hash_fragment, hostname, title, referrer_url, referrer_host,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content, channel,
    is_eu, country, region, region_code, city, continent,
    timezone, browser, browser_version,
    os, os_version, device_type, screen_width, screen_height, language
  `;

/** A custom event's columns and, under the same names, its visit's. */
export const EVENT_SOURCE_COLUMNS = `
    ce.event_pk,
    ce.event_id,
    ce.site_pk,
    ce.visit_id,
    cen.name AS event_name,
    ce.occurred_at,
    ce.received_at,
    ce.sequence,
    v.visitor_id,
    v.session_id,
    v.pathname,
    v.query_string,
    v.hash_fragment,
    v.hostname,
    v.title,
    v.referrer_url,
    v.referrer_host,
    v.utm_source,
    v.utm_medium,
    v.utm_campaign,
    v.utm_term,
    v.utm_content,
    v.channel,
    v.duration_ms,
    v.scroll_depth,
    v.is_eu,
    v.country,
    v.region,
    v.region_code,
    v.city,
    v.continent,
    v.browser,
    v.browser_version,
    v.os,
    v.os_version,
    v.device_type,
    v.language,
    v.timezone,
    v.screen_width,
    v.screen_height`;

function scopeOf(siteId: string, window: QueryWindow): FilterSqlScope {
  return {
    siteId,
    startMs: window.startMs,
    endExclusiveMs: window.endExclusiveMs,
  };
}

function andPredicate(predicate: SqlFragment | null): SqlFragment {
  return predicate ? concat(text("\n    AND "), predicate) : text("");
}

/**
 * The site's page views in the window that match the filter, as the CTE
 * `name`: one scan of visits through its (site_pk, started_at) index.
 * SQLite reads only the columns its readers use. A CTE that several
 * aggregates read would be scanned once per reader, so such a reader
 * selects only the `columns` it needs and asks for it `materialized`.
 */
export function filteredVisitsCte(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  options: {
    readonly name?: string;
    /** Columns, or expressions over the page view `v`, with their bindings. */
    readonly columns?: string | SqlFragment;
    /** For a narrow set of columns that several aggregates read. */
    readonly materialized?: boolean;
  } = {},
): BoundSql {
  const columns = options.columns ?? VISIT_SOURCE_COLUMNS;
  const fragment = concat(
    text(`
${options.name ?? "filtered_visits"} AS${options.materialized ? " MATERIALIZED" : ""} (
  SELECT `),
    typeof columns === "string" ? text(columns) : columns,
    text(`
  FROM visits v
  WHERE v.site_pk = `),
    sitePk(siteId),
    text("\n    AND v.started_at >= "),
    parameter(window.startMs),
    text(" AND v.started_at < "),
    parameter(window.endExclusiveMs),
    andPredicate(visitFilterSql(filters, scopeOf(siteId, window))),
    text("\n)"),
  );
  return {
    sql: fragment.text,
    bindings: fragment.bindings as BoundSql["bindings"],
  };
}

/**
 * The site's custom events in the window that match the filter, as the CTE
 * `name`, each with its visit's page view columns. `eventName` keeps one
 * event name, read through the name's index. Visits are joined only when
 * the columns or the filter read them.
 */
export function filteredEventsCte(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  options: {
    readonly name?: string;
    readonly eventName?: string;
    readonly columns?: string;
    readonly materialized?: boolean;
  } = {},
): BoundSql {
  const columns = options.columns ?? EVENT_SOURCE_COLUMNS;
  const visitJoin =
    columns.includes("v.") || filters.conditions.length > 0
      ? `
  INNER JOIN visits v
    ON v.site_pk = ce.site_pk
   AND v.visit_id = ce.visit_id`
      : "";
  const fragment = concat(
    text(`
${options.name ?? "filtered_events"} AS${options.materialized ? " MATERIALIZED" : ""} (
  SELECT ${columns}
  FROM custom_events ce
  INNER JOIN custom_event_names cen
    ON cen.id = ce.event_name_id${visitJoin}
  WHERE ce.site_pk = `),
    sitePk(siteId),
    ...(options.eventName === undefined
      ? []
      : [
          text(
            "\n    AND ce.event_name_id = (SELECT id FROM custom_event_names WHERE site_pk = ",
          ),
          sitePk(siteId),
          text(" AND name = "),
          parameter(options.eventName),
          text(")"),
        ]),
    text("\n    AND ce.occurred_at >= "),
    parameter(window.startMs),
    text(" AND ce.occurred_at < "),
    parameter(window.endExclusiveMs),
    andPredicate(eventFilterSql(filters, scopeOf(siteId, window))),
    text("\n)"),
  );
  return {
    sql: fragment.text,
    bindings: fragment.bindings as BoundSql["bindings"],
  };
}

/**
 * `WITH filtered_events AS (...)`: the filtered custom events, optionally of
 * one name, for a statement to read.
 */
export function buildEventFilteredSourceCte(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  eventName?: string,
  options?: { readonly materialize?: boolean },
): { readonly cte: string; readonly bindings: BoundSql["bindings"] } {
  const source = filteredEventsCte(siteId, window, filters, {
    ...(eventName === undefined ? {} : { eventName }),
    materialized: options?.materialize ?? false,
  });
  return { cte: `\nWITH\n${source.sql}`, bindings: source.bindings };
}
export function visitSourceBindingsForSites(
  siteIds: string[],
  window: QueryWindow,
): Array<string | number> {
  return [...siteIds, window.startMs, window.endExclusiveMs];
}
export async function queryD1All<T extends object>(
  env: Env,
  sql: string,
  bindings: ReadonlyArray<string | number | null>,
  diagnostics?: D1ReadDiagnostics,
): Promise<T[]> {
  const logger = currentInvocationLogger();
  const operation = currentD1Operation();
  const startedAt = globalThis.performance?.now() ?? Date.now();
  const result = await createDatabaseRuntime(env.DB).all<T>({
    sql,
    bindings,
    tag: operation ?? "analytics.query.all",
  });
  const finishedAt = globalThis.performance?.now() ?? Date.now();
  recordD1RowsRead(diagnostics, result);
  if (logger && operation) {
    const rowsRead = result.meta?.rows_read;
    logger.recordD1Operation(operation, {
      durationMs: finishedAt - startedAt,
      ...(typeof rowsRead === "number" && Number.isFinite(rowsRead)
        ? { rowsRead: Math.max(0, Math.trunc(rowsRead)) }
        : {}),
      rowsReadAvailable:
        typeof rowsRead === "number" && Number.isFinite(rowsRead),
    });
  }
  // D1 normally always returns an array, but keep the shared source boundary
  // defensive when a test double or a transient adapter response omits results.
  // Providers should never leak an undefined collection into map/filter code.
  return Array.isArray(result.results) ? result.results : [];
}
