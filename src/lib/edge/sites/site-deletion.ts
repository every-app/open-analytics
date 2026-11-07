import {
  compileD1Mutation,
  type CompiledMutation,
  type DatabaseRuntime,
  deleteFrom,
  eq,
  param,
  schema,
} from "@/lib/db";

/** Rows per delete statement, as retention deletes them. */
export const SITE_PURGE_BATCH_ROWS = 1000;

/**
 * The site itself, its settings, goals and funnels. Saved filters and
 * notification rules go with the site row; its page views, events and
 * rollups are purged in batches afterwards.
 */
export function siteDeletionMutations(siteId: string): CompiledMutation[] {
  return [
    compileD1Mutation(
      deleteFrom(schema.configs, (columns) =>
        eq(columns.config_key, param(`site:${siteId}`)),
      ),
      { tag: "admin.sites.delete_config" },
    ),
    compileD1Mutation(
      deleteFrom(schema.analysis_definitions, (columns) =>
        eq(columns.site_id, param(siteId)),
      ),
      { tag: "admin.sites.delete_analysis_definitions" },
    ),
    compileD1Mutation(
      deleteFrom(schema.sites, (columns) => eq(columns.id, param(siteId))),
      { tag: "admin.sites.delete" },
    ),
  ];
}

interface PurgeStep {
  readonly tag: string;
  /** Deletes at most one batch of the site's rows: binds site_pk, limit. */
  readonly sql: string;
}

/**
 * One batch of a site's rows from a table with a site_pk column, skipping
 * rows that `referenced`, a condition on the table's row, says other rows
 * still point at.
 */
function batchDelete(
  table: string,
  key: readonly string[],
  referenced?: string,
): string {
  const columns = key.join(", ");
  return `
    DELETE FROM ${table}
    WHERE ${key.length > 1 ? `(${columns})` : columns} IN (
      SELECT ${columns} FROM ${table}
      WHERE site_pk = ?1${referenced ? ` AND NOT (${referenced})` : ""}
      LIMIT ?2
    )`;
}

/** Rows of the site's event payloads with `column` equal to `id`. */
function payloadNodesWith(column: string, id: string): string {
  return `EXISTS (
    SELECT 1 FROM custom_events e
    JOIN custom_event_json_nodes n ON n.event_pk = e.event_pk
    WHERE e.site_pk = ?1 AND n.${column} = ${id}
  )`;
}

// Events and properties before their page views, and an event's payload
// rows before the event. Each delete skips rows that something still refers
// to: rows the ingest buffer flushed after an earlier step. So no statement
// cascades or breaks a foreign key, and a later run deletes what is left.
const PURGE_STEPS: readonly PurgeStep[] = [
  {
    tag: "admin.sites.purge_custom_event_json_values",
    sql: batchDelete("custom_event_json_values", ["event_pk", "node_id"]),
  },
  {
    tag: "admin.sites.purge_custom_event_json_nodes",
    sql: `
      DELETE FROM custom_event_json_nodes
      WHERE (event_pk, node_id) IN (
        SELECT n.event_pk, n.node_id FROM custom_event_json_nodes n
        JOIN custom_events e ON e.event_pk = n.event_pk
        WHERE e.site_pk = ?1
          AND NOT EXISTS (
            SELECT 1 FROM custom_event_json_values v
            WHERE v.event_pk = n.event_pk AND v.node_id = n.node_id
          )
        LIMIT ?2
      )`,
  },
  {
    tag: "admin.sites.purge_custom_events",
    sql: batchDelete(
      "custom_events",
      ["event_pk"],
      `EXISTS (
        SELECT 1 FROM custom_event_json_nodes n
        WHERE n.event_pk = custom_events.event_pk
      )`,
    ),
  },
  {
    tag: "admin.sites.purge_visit_properties",
    sql: batchDelete("visit_properties", ["visit_id", "key"]),
  },
  {
    tag: "admin.sites.purge_visits",
    sql: batchDelete(
      "visits",
      ["visit_id"],
      `EXISTS (SELECT 1 FROM custom_events e WHERE e.visit_id = visits.visit_id)
        OR EXISTS (
          SELECT 1 FROM visit_properties p WHERE p.visit_id = visits.visit_id
        )`,
    ),
  },
  {
    tag: "admin.sites.purge_hourly_rollups",
    sql: batchDelete("visit_hourly_rollups", ["site_pk", "hour_bucket"]),
  },
  {
    tag: "admin.sites.purge_daily_rollups",
    sql: batchDelete("visit_daily_rollups", ["site_pk", "day"]),
  },
  {
    tag: "admin.sites.purge_daily_dimension_rollups",
    sql: batchDelete("visit_daily_dimension_rollups", [
      "site_pk",
      "dimension",
      "day",
      "value",
    ]),
  },
  {
    tag: "admin.sites.purge_daily_geo_points",
    sql: batchDelete("visit_daily_geo_points", [
      "site_pk",
      "day",
      "latitude",
      "longitude",
      "country",
      "region",
      "region_code",
      "city",
    ]),
  },
  {
    tag: "admin.sites.purge_custom_event_names",
    sql: batchDelete(
      "custom_event_names",
      ["id"],
      `EXISTS (
        SELECT 1 FROM custom_events e
        WHERE e.site_pk = ?1 AND e.event_name_id = custom_event_names.id
      ) OR EXISTS (
        SELECT 1 FROM custom_event_json_values v
        WHERE v.site_pk = ?1 AND v.event_name_id = custom_event_names.id
      )`,
    ),
  },
  {
    tag: "admin.sites.purge_custom_event_json_keys",
    sql: batchDelete(
      "custom_event_json_keys",
      ["id"],
      payloadNodesWith("key_id", "custom_event_json_keys.id"),
    ),
  },
  {
    tag: "admin.sites.purge_custom_event_json_paths",
    sql: batchDelete(
      "custom_event_json_paths",
      ["id"],
      `${payloadNodesWith("path_id", "custom_event_json_paths.id")} OR EXISTS (
        SELECT 1 FROM custom_event_json_values v
        WHERE v.site_pk = ?1 AND v.path_id = custom_event_json_paths.id
      )`,
    ),
  },
  {
    tag: "admin.sites.purge_rollup_dirty_days",
    sql: batchDelete("visit_rollup_dirty_days", ["site_pk", "day"]),
  },
  {
    tag: "admin.sites.purge_rollup_state",
    sql: batchDelete("visit_rollup_state", ["site_pk"]),
  },
];

/**
 * Deletes a removed site's stored data in batches, up to `maxBatches`
 * statements. Returns how many it ran and whether it finished every step;
 * `deletedSitesWithData` still lists a site the ingest buffer wrote to
 * meanwhile, and a later run deletes what is left.
 */
export async function purgeSiteData(
  db: DatabaseRuntime,
  sitePk: number,
  maxBatches: number,
): Promise<{ batches: number; done: boolean }> {
  let batches = 0;
  for (const step of PURGE_STEPS) {
    while (true) {
      if (batches >= maxBatches) return { batches, done: false };
      batches += 1;
      const result = await db.run({
        sql: step.sql,
        bindings: [sitePk, SITE_PURGE_BATCH_ROWS],
        tag: step.tag,
      });
      if (Number(result.meta?.changes ?? 0) < SITE_PURGE_BATCH_ROWS) break;
    }
  }
  return { batches, done: true };
}

/**
 * The ids of sites that were deleted but still have stored data: a site
 * identity with no site row and with page views, events or rollups left.
 */
export async function deletedSitesWithData(
  db: DatabaseRuntime,
): Promise<number[]> {
  const result = await db.all<{ sitePk: number }>({
    sql: `
      SELECT si.site_pk AS sitePk
      FROM site_identities si
      WHERE NOT EXISTS (SELECT 1 FROM sites s WHERE s.id = si.site_id)
        AND (
          EXISTS (SELECT 1 FROM visits v WHERE v.site_pk = si.site_pk)
          OR EXISTS (SELECT 1 FROM custom_events e WHERE e.site_pk = si.site_pk)
          OR EXISTS (SELECT 1 FROM visit_hourly_rollups r WHERE r.site_pk = si.site_pk)
          OR EXISTS (SELECT 1 FROM visit_daily_dimension_rollups d WHERE d.site_pk = si.site_pk)
          OR EXISTS (SELECT 1 FROM visit_rollup_dirty_days dd WHERE dd.site_pk = si.site_pk)
          OR EXISTS (SELECT 1 FROM visit_rollup_state st WHERE st.site_pk = si.site_pk)
        )
      ORDER BY si.site_pk
    `,
    bindings: [],
    tag: "scheduled_tasks.retention.deleted_sites",
  });
  return result.results.map((row) => Number(row.sitePk));
}
