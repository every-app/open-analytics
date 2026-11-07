import { propertyPath } from "@/lib/analytics/property-path";
import {
  type FilterDocument,
  type PropertyKey,
  type PropertyValue,
  type PropertyValueSortKey,
  type Sort,
} from "@/lib/edge/analytics/contract";
import { SITE_PK_FROM_SITE_ID_SQL } from "@/lib/edge/sites/identity-sql";
import type { Env } from "@/lib/edge/types";

import { queryD1All } from "./core-sources";
import type { QueryWindow } from "./core-types";
import { scopedDatasetFor } from "./scoped-dataset";

/** An event payload path's key, decoding its JSON pointer escapes. */
const PATH_KEY_SQL =
  "REPLACE(REPLACE(SUBSTR(path.path, 2), '~1', '/'), '~0', '~')";

type Binding = string | number;

interface PropertyRows {
  /** The statement's leading CTEs, ending in `property_rows`. */
  readonly ctes: string;
  readonly bindings: readonly Binding[];
}

/**
 * Every page view's property and every event's top-level string payload
 * value in the window, with whose they were: one key's, or all keys'.
 * Unfiltered, it reads the property and payload indexes for the window;
 * filtered, only the rows of the filters' page views and events.
 */
function propertyRows(
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  key: string | null,
): PropertyRows {
  const dataset = scopedDatasetFor(siteId, window, filters);
  if (!dataset && filters.root !== null) {
    throw new Error("scoped_dataset_required");
  }
  const visits = dataset?.visitRelation ?? "visits";
  const events =
    dataset?.eventRelation ??
    `(SELECT ce.event_pk, v.visitor_id, v.session_id
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
  SELECT ${PATH_KEY_SQL}, val.string_value, e.visitor_id, e.session_id, 0, 1
  FROM custom_event_json_paths path
  INNER JOIN custom_event_json_values val
    ON val.site_pk = path.site_pk AND val.path_id = path.id
  INNER JOIN ${events} e ON e.event_pk = val.event_pk
  WHERE path.site_pk = ${SITE_PK_FROM_SITE_ID_SQL}
    AND ${key === null ? "INSTR(SUBSTR(path.path, 2), '/') = 0" : "path.path = ?"}
    AND val.value_type = 1
    AND val.occurred_at >= ? AND val.occurred_at < ?
)`;
  return {
    ctes: dataset ? `${dataset.ctes.trim()},${ctes}` : ctes,
    bindings: [
      ...(dataset?.bindings.map((binding) => binding.value as Binding) ?? []),
      siteId,
      ...(key === null ? [] : [key]),
      ...range,
      siteId,
      ...(key === null ? [] : [propertyPath(key)]),
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
