import {
  type FilterDocument,
  type PropertyKey,
  type PropertyValue,
  type PropertyValueSortKey,
  type Sort,
} from "@/lib/edge/analytics/contract";
import { SITE_PK_FROM_SITE_ID_SQL } from "@/lib/edge/sites/identity-sql";
import type { Env } from "@/lib/edge/types";

import {
  filteredEventsCte,
  filteredVisitsCte,
  queryD1All,
} from "./core-sources";
import type { QueryWindow } from "./core-types";

type Binding = string | number;

interface PropertyRows {
  /** The statement's leading CTEs, ending in `property_rows`. */
  readonly ctes: string;
  readonly bindings: readonly Binding[];
}

/**
 * Every page view's and custom event's property in the window, with whose
 * they were: one key's, or all keys'. Unfiltered, it reads the property
 * indexes for the window; filtered, only the rows of the filtered page
 * views and events.
 */
function propertyRows(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  key: string | null,
): PropertyRows {
  const filtered = filters.conditions.length > 0;
  const filteredSources = filtered
    ? [
        filteredVisitsCte(siteId, window, filters, {
          name: "property_visits",
          columns: "visit_id, visitor_id, session_id",
        }),
        filteredEventsCte(siteId, window, filters, {
          name: "property_events",
          columns: "ce.event_pk, v.visitor_id, v.session_id",
        }),
      ]
    : [];
  const visits = filtered ? "property_visits" : "visits";
  const events = filtered
    ? "property_events"
    : `(SELECT ce.event_pk, v.visitor_id, v.session_id
      FROM custom_events ce
      INNER JOIN visits v ON v.visit_id = ce.visit_id)`;
  const range = [window.startMs, window.endExclusiveMs];
  const ctes = `
property_rows AS (
  SELECT p.key, p.value, v.visitor_id, v.session_id, 1 AS views, 0 AS events
  FROM visit_properties p
  INNER JOIN ${visits} v ON v.visit_id = p.visit_id
  WHERE p.site_pk = ${SITE_PK_FROM_SITE_ID_SQL}
    ${key === null ? "" : "AND p.key = ?"}
    AND p.started_at >= ? AND p.started_at < ?
  UNION ALL
  SELECT p.key, p.value, e.visitor_id, e.session_id, 0, 1
  FROM custom_event_properties p
  INNER JOIN ${events} e ON e.event_pk = p.event_pk
  WHERE p.site_pk = ${SITE_PK_FROM_SITE_ID_SQL}
    ${key === null ? "" : "AND p.key = ?"}
    AND p.occurred_at >= ? AND p.occurred_at < ?
)`;
  return {
    ctes: [...filteredSources.map((source) => source.sql), ctes].join(","),
    bindings: [
      ...filteredSources.flatMap((source) => source.bindings as Binding[]),
      siteId,
      ...(key === null ? [] : [key]),
      ...range,
      siteId,
      ...(key === null ? [] : [key]),
      ...range,
    ],
  };
}

/** The keys seen in the period, the most visitors first. */
export async function queryPropertyKeysFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
): Promise<PropertyKey[]> {
  const rows = propertyRows(siteId, window, filters, null);
  const results = await queryD1All<Record<string, unknown>>(
    env,
    `WITH ${rows.ctes}
SELECT key, COUNT(DISTINCT visitor_id) AS visitors
FROM property_rows
GROUP BY key
ORDER BY visitors DESC, key ASC
LIMIT ?`,
    [...rows.bindings, limit],
  );
  return results.map((row) => ({
    key: String(row.key),
    visitors: Number(row.visitors),
  }));
}

/** A key's values in the period, ordered by `sort`. */
export async function queryPropertyValuesFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  key: string,
  search: string,
  sort: Sort<PropertyValueSortKey>,
  limit: number,
): Promise<PropertyValue[]> {
  const rows = propertyRows(siteId, window, filters, key);
  const direction = sort.direction === "asc" ? "ASC" : "DESC";
  const results = await queryD1All<Record<string, unknown>>(
    env,
    `WITH ${rows.ctes}
SELECT
  value,
  COUNT(DISTINCT visitor_id) AS visitors,
  COUNT(DISTINCT session_id) AS sessions,
  SUM(views) AS views,
  SUM(events) AS events
FROM property_rows
${search ? "WHERE INSTR(LOWER(value), LOWER(?)) > 0" : ""}
GROUP BY value
ORDER BY ${sort.key} ${direction}, value ASC
LIMIT ?`,
    [...rows.bindings, ...(search ? [search] : []), limit],
  );
  return results.map((row) => ({
    value: String(row.value),
    visitors: Number(row.visitors),
    sessions: Number(row.sessions),
    views: Number(row.views),
    events: Number(row.events),
  }));
}
