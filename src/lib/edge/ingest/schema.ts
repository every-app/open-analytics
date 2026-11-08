import { classifyTrafficChannel } from "@/lib/analytics/traffic-channel-rules";

import type { SqlBinding } from "./sql";
import { CREATE_BUFFERED_CUSTOM_EVENTS_SQL } from "./sql";

interface DurableObjectSqlStorage {
  exec(
    query: string,
    ...bindings: SqlBinding[]
  ): {
    toArray(): unknown[];
  };
  /**
   * Durable Object SQLite exposes transactionSync on the storage object.  The
   * local SQL test doubles can provide the same method directly, while older
   * doubles may omit it and use the non-transactional compatibility path.
   */
  transactionSync?<T>(closure: () => T): T;
}

export interface IngestSchemaOptions {
  transactionSync?<T>(closure: () => T): T;
}

function transactionSync<T>(
  sql: DurableObjectSqlStorage,
  closure: () => T,
  options?: IngestSchemaOptions,
): T {
  if (typeof sql.transactionSync === "function") {
    return sql.transactionSync(closure);
  }
  if (typeof options?.transactionSync === "function") {
    return options.transactionSync(closure);
  }
  return closure();
}

interface TableColumnInfo {
  name?: string;
  notnull?: number;
  dflt_value?: unknown;
}

function tableColumns(
  sql: DurableObjectSqlStorage,
  tableName: string,
): TableColumnInfo[] {
  return sql
    .exec(`PRAGMA table_info(${tableName})`)
    .toArray() as TableColumnInfo[];
}

function tableColumnNames(
  sql: DurableObjectSqlStorage,
  tableName: string,
): Set<string> {
  return new Set(tableColumns(sql, tableName).map((row) => row.name ?? ""));
}

function ensureColumn(
  sql: DurableObjectSqlStorage,
  tableName: string,
  columnName: string,
  columnType: string,
): void {
  if (tableColumnNames(sql, tableName).has(columnName)) return;
  sql.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
}

function dropColumnIfExists(
  sql: DurableObjectSqlStorage,
  tableName: string,
  columnName: string,
): void {
  if (!tableColumnNames(sql, tableName).has(columnName)) return;
  sql.exec(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
}

/**
 * Columns a page view no longer stores: the raw user agent, postal and metro
 * code and the network organization, as Plausible keeps none of them, the
 * deleted identify() API's user and the web vitals nothing reads. Also the
 * per-row flush and lifecycle deadlines: a row is now just dirty until the
 * alarm writes it. Dropped from existing Durable Objects so buffered values
 * don't linger.
 */
const DROPPED_BUFFERED_VISIT_COLUMNS = [
  "ua_raw",
  "postal_code",
  "metro_code",
  "as_organization",
  "user_id",
  "user_name",
  "perf_ttfb_ms",
  "perf_fcp_ms",
  "perf_lcp_ms",
  "perf_cls",
  "perf_inp_ms",
  "next_due_at",
  "flush_due_at",
] as const;
const DROPPED_BUFFERED_CUSTOM_EVENT_COLUMNS = [
  "user_id",
  "next_due_at",
  "flush_due_at",
  "buffer_revision",
] as const;

/**
 * Indexes of earlier versions. The deadline indexes go first, as SQLite
 * can't drop an indexed column.
 */
const DROPPED_INDEXES = [
  "idx_buffered_visits_dirty_updated",
  "idx_buffered_visits_status_last_activity",
  "idx_buffered_visits_site_visit_status",
  "idx_buffered_visits_started_at",
  "idx_buffered_visits_ended_at",
  "idx_buffered_visits_next_due",
  "idx_buffered_visits_dirty_flush_due",
  "idx_buffered_custom_events_next_due",
  "idx_buffered_custom_events_dirty_flush_due",
  "idx_buffered_custom_events_dirty_occurred",
  "idx_analytics_sessions_next_due",
] as const;

/**
 * Tables of earlier versions: per-session page counts nothing read, and the
 * bookkeeping of the per-row deadlines.
 */
const DROPPED_TABLES = [
  "analytics_sessions",
  "ingest_schema_metadata",
] as const;

const LEGACY_EVENT_CONTEXT_COLUMNS = [
  "visitor_id",
  "session_id",
  "pathname",
  "hostname",
] as const;

function hasIncompatibleLegacyEventContext(
  sql: DurableObjectSqlStorage,
): boolean {
  const columns = tableColumns(sql, "buffered_custom_events");
  return LEGACY_EVENT_CONTEXT_COLUMNS.some((columnName) => {
    const column = columns.find((candidate) => candidate.name === columnName);
    return column?.notnull === 1 && column.dflt_value === null;
  });
}

function migrateLegacyBufferedCustomEvents(
  sql: DurableObjectSqlStorage,
  options?: IngestSchemaOptions,
): void {
  const columnNames = tableColumnNames(sql, "buffered_custom_events");
  const value = (columnName: string, fallback: string): string =>
    columnNames.has(columnName) ? columnName : fallback;
  const coalesce = (columnName: string, fallback: string): string =>
    columnNames.has(columnName)
      ? `COALESCE(${columnName}, ${fallback})`
      : fallback;

  const migrate = () => {
    sql.exec(`
        CREATE TABLE buffered_custom_events_migration (
          event_id TEXT PRIMARY KEY,
          site_id TEXT NOT NULL,
          visit_id TEXT NOT NULL,
          occurred_at INTEGER NOT NULL,
          received_at INTEGER NOT NULL,
          sequence INTEGER NOT NULL DEFAULT 0,
          event_name TEXT NOT NULL,
          event_data_json TEXT NOT NULL DEFAULT '{}',
          dirty INTEGER NOT NULL DEFAULT 1,
          flush_attempts INTEGER NOT NULL DEFAULT 0,
          last_flush_error TEXT,
          created_at INTEGER NOT NULL,
          visitor_id TEXT,
          session_id TEXT,
          pathname TEXT,
          hostname TEXT
        )
      `);
    sql.exec(`
        INSERT INTO buffered_custom_events_migration (
          event_id, site_id, visit_id, occurred_at, received_at, sequence,
          event_name, event_data_json, dirty, flush_attempts,
          last_flush_error, created_at, visitor_id, session_id, pathname,
          hostname
        )
        SELECT
          event_id,
          site_id,
          visit_id,
          occurred_at,
          ${coalesce("received_at", "occurred_at")},
          ${coalesce("sequence", "0")},
          event_name,
          event_data_json,
          dirty,
          flush_attempts,
          last_flush_error,
          created_at,
          ${value("visitor_id", "NULL")},
          ${value("session_id", "NULL")},
          ${value("pathname", "NULL")},
          ${value("hostname", "NULL")}
        FROM buffered_custom_events
      `);
    sql.exec(
      "ALTER TABLE buffered_custom_events RENAME TO buffered_custom_events_legacy",
    );
    // Its indexes go with it and are created again on the new table.
    sql.exec("DROP TABLE buffered_custom_events_legacy");
    sql.exec(
      "ALTER TABLE buffered_custom_events_migration RENAME TO buffered_custom_events",
    );
  };

  // Durable Object SQLite rejects SQL BEGIN/COMMIT. Use its native API so
  // schema changes and row copies roll back together if any step fails.
  if (
    typeof sql.transactionSync === "function" ||
    typeof options?.transactionSync === "function"
  ) {
    transactionSync(sql, migrate, options);
    return;
  }

  // Standalone SQLite callers without the Durable Object storage API.
  sql.exec("BEGIN");
  try {
    migrate();
    sql.exec("COMMIT");
  } catch (error) {
    try {
      sql.exec("ROLLBACK");
    } catch {
      // Preserve the migration error if rollback is unavailable.
    }
    throw error;
  }
}

/**
 * Page views buffered before ingest classified channels get theirs, and are
 * written to D1 again: the previous Worker may have written one after the
 * migration that added the column, which left it without a channel.
 */
function classifyBufferedVisitChannels(sql: DurableObjectSqlStorage): void {
  const rows = sql
    .exec(
      `
        SELECT
          visit_id AS visitId,
          referrer_host AS referrerHost,
          utm_source AS utmSource,
          utm_medium AS utmMedium,
          utm_campaign AS utmCampaign
        FROM buffered_visits
        WHERE channel IS NULL
      `,
    )
    .toArray() as Array<{
    visitId: string;
    referrerHost: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
  }>;
  for (const row of rows) {
    sql.exec(
      `
        UPDATE buffered_visits
        SET channel = ?, dirty = 1
        WHERE visit_id = ?
      `,
      classifyTrafficChannel(row),
      row.visitId,
    );
  }
}

export function initializeIngestSqlSchema(
  sql: DurableObjectSqlStorage,
  options?: IngestSchemaOptions,
): void {
  sql.exec(`
      CREATE TABLE IF NOT EXISTS buffered_visits (
        visit_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL,
        hidden_at INTEGER,
        hidden_ms INTEGER NOT NULL DEFAULT 0,
        ended_at INTEGER,
        finalized_at INTEGER,
        duration_ms INTEGER,
        scroll_depth INTEGER,
        duration_source TEXT,
        exit_reason TEXT,
        pathname TEXT NOT NULL,
        query_string TEXT NOT NULL DEFAULT '',
        hash_fragment TEXT NOT NULL DEFAULT '',
        hostname TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        referrer_url TEXT NOT NULL DEFAULT '',
        referrer_host TEXT NOT NULL DEFAULT '',
        utm_source TEXT NOT NULL DEFAULT '',
        utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT '',
        utm_term TEXT NOT NULL DEFAULT '',
        utm_content TEXT NOT NULL DEFAULT '',
        channel TEXT NOT NULL,
        is_eu INTEGER NOT NULL DEFAULT 0,
        country TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        region_code TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        continent TEXT NOT NULL DEFAULT '',
        latitude REAL,
        longitude REAL,
        timezone TEXT NOT NULL DEFAULT '',
        browser TEXT NOT NULL DEFAULT '',
        browser_version TEXT NOT NULL DEFAULT '',
        os TEXT NOT NULL DEFAULT '',
        os_version TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT '',
        screen_width INTEGER,
        screen_height INTEGER,
        language TEXT NOT NULL DEFAULT '',
        properties_json TEXT,
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        buffer_revision INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  ensureColumn(sql, "buffered_visits", "hidden_at", "INTEGER");
  ensureColumn(sql, "buffered_visits", "properties_json", "TEXT");
  ensureColumn(
    sql,
    "buffered_visits",
    "hidden_ms",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(sql, "buffered_visits", "scroll_depth", "INTEGER");
  ensureColumn(
    sql,
    "buffered_visits",
    "buffer_revision",
    "INTEGER NOT NULL DEFAULT 1",
  );
  ensureColumn(sql, "buffered_visits", "channel", "TEXT");
  classifyBufferedVisitChannels(sql);
  sql.exec(CREATE_BUFFERED_CUSTOM_EVENTS_SQL);

  // Keep legacy event rows in place.  A legacy context column without a
  // default would reject current inserts, so rebuild that shape atomically;
  // all rows and legacy context values are copied before the old table goes
  // away.  Other old shapes can be migrated additively.
  if (hasIncompatibleLegacyEventContext(sql)) {
    migrateLegacyBufferedCustomEvents(sql, options);
  }
  const eventColumnNames = tableColumnNames(sql, "buffered_custom_events");
  if (!eventColumnNames.has("received_at")) {
    ensureColumn(
      sql,
      "buffered_custom_events",
      "received_at",
      "INTEGER NOT NULL DEFAULT 0",
    );
    sql.exec(`
        UPDATE buffered_custom_events
        SET received_at = occurred_at
        WHERE received_at = 0 AND occurred_at <> 0
      `);
  }
  ensureColumn(
    sql,
    "buffered_custom_events",
    "sequence",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(sql, "buffered_custom_events", "revenue_amount", "REAL");
  ensureColumn(sql, "buffered_custom_events", "revenue_currency", "TEXT");

  for (const indexName of DROPPED_INDEXES) {
    sql.exec(`DROP INDEX IF EXISTS ${indexName}`);
  }
  for (const columnName of DROPPED_BUFFERED_VISIT_COLUMNS) {
    dropColumnIfExists(sql, "buffered_visits", columnName);
  }
  for (const columnName of DROPPED_BUFFERED_CUSTOM_EVENT_COLUMNS) {
    dropColumnIfExists(sql, "buffered_custom_events", columnName);
  }
  for (const tableName of DROPPED_TABLES) {
    sql.exec(`DROP TABLE IF EXISTS ${tableName}`);
  }
  // Page views buffered before ingest rounded coordinates round here, so
  // neither the realtime view nor a later flush carries finer ones.
  sql.exec(`
      UPDATE buffered_visits
      SET latitude = ROUND(latitude, 1), longitude = ROUND(longitude, 1)
      WHERE latitude <> ROUND(latitude, 1) OR longitude <> ROUND(longitude, 1)
    `);

  // What the alarm writes to D1, oldest first, with rows that failed before
  // last.
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_visits_dirty
      ON buffered_visits(dirty, flush_attempts, started_at)
    `);
  // Visit timeouts, the active visits of the realtime view and the finished
  // ones cleanup deletes.
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_visits_status_activity
      ON buffered_visits(status, last_activity_at)
    `);
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_visits_status_hidden_at
      ON buffered_visits(status, hidden_at)
    `);
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_visits_site_session_status_started
      ON buffered_visits(site_id, session_id, status, started_at)
    `);
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_visits_site_visitor_status
      ON buffered_visits(site_id, visitor_id, status)
    `);
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_custom_events_dirty
      ON buffered_custom_events(dirty, flush_attempts, occurred_at)
    `);
  sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_buffered_custom_events_occurred
      ON buffered_custom_events(occurred_at)
    `);
  sql.exec(`
      CREATE TABLE IF NOT EXISTS visitor_salts (
        day TEXT PRIMARY KEY,
        salt TEXT NOT NULL
      )
    `);
  // The site's key in D1. It never changes, so it is looked up once.
  sql.exec(`
      CREATE TABLE IF NOT EXISTS site_pks (
        site_id TEXT PRIMARY KEY,
        site_pk INTEGER NOT NULL
      )
    `);
}
