import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeIngestSqlSchema } from "@/lib/edge/ingest/schema";
import type { SqlBinding } from "@/lib/edge/ingest/sql";

const NOW = Date.UTC(2026, 4, 25, 12, 0, 0);

type SqlRow = Record<string, unknown>;

class SqliteSqlStorage {
  readonly db = new DatabaseSync(":memory:");
  readonly updateCalls: Array<{ query: string; changes: number }> = [];

  exec(
    query: string,
    ...bindings: SqlBinding[]
  ): {
    rowsWritten: number;
    toArray(): unknown[];
  } {
    const statement = this.db.prepare(query);
    const normalized = query.trim().toUpperCase();
    if (
      normalized.startsWith("SELECT") ||
      normalized.startsWith("PRAGMA") ||
      normalized.startsWith("WITH") ||
      normalized.startsWith("EXPLAIN")
    ) {
      return {
        rowsWritten: 0,
        toArray: () =>
          statement.all(...bindings).map((row) => ({ ...row }) as SqlRow),
      };
    }

    const changes = Number(statement.run(...bindings).changes ?? 0);
    if (/^UPDATE\s+buffered_/i.test(query.trim())) {
      this.updateCalls.push({ query, changes });
    }
    return { rowsWritten: changes, toArray: () => [] };
  }

  close(): void {
    this.db.close();
  }
}

function rows<T extends SqlRow = SqlRow>(
  sql: SqliteSqlStorage,
  query: string,
  ...bindings: SqlBinding[]
): T[] {
  return sql.exec(query, ...bindings).toArray() as T[];
}

/**
 * A buffer as the per-row deadline version left it: each row's flush and
 * lifecycle deadline, their indexes, the web vitals columns, per-session
 * page counts and the deadline bookkeeping.
 */
function createPerRowDeadlineSchema(sql: SqliteSqlStorage): void {
  sql.db.exec(`
    CREATE TABLE buffered_visits (
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
      hostname TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      perf_ttfb_ms REAL,
      perf_fcp_ms REAL,
      perf_lcp_ms REAL,
      perf_cls REAL,
      perf_inp_ms REAL,
      properties_json TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      flush_attempts INTEGER NOT NULL DEFAULT 0,
      last_flush_error TEXT,
      next_due_at INTEGER,
      flush_due_at INTEGER,
      buffer_revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX idx_buffered_visits_next_due
      ON buffered_visits(next_due_at, visit_id);
    CREATE INDEX idx_buffered_visits_dirty_flush_due
      ON buffered_visits(dirty, flush_due_at, flush_attempts);
    CREATE TABLE buffered_custom_events (
      event_id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      visit_id TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      received_at INTEGER NOT NULL,
      sequence INTEGER NOT NULL DEFAULT 0,
      event_name TEXT NOT NULL,
      event_data_json TEXT NOT NULL DEFAULT '{}',
      revenue_amount REAL,
      revenue_currency TEXT,
      dirty INTEGER NOT NULL DEFAULT 1,
      flush_attempts INTEGER NOT NULL DEFAULT 0,
      last_flush_error TEXT,
      next_due_at INTEGER,
      flush_due_at INTEGER,
      buffer_revision INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX idx_buffered_custom_events_next_due
      ON buffered_custom_events(next_due_at, event_id);
    CREATE INDEX idx_buffered_custom_events_dirty_flush_due
      ON buffered_custom_events(dirty, flush_due_at, created_at, flush_attempts);
    CREATE TABLE analytics_sessions (
      site_id TEXT NOT NULL,
      session_id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL,
      page_count INTEGER NOT NULL,
      entry_path TEXT NOT NULL,
      last_path TEXT NOT NULL,
      last_visit_id TEXT NOT NULL,
      next_due_at INTEGER NOT NULL
    );
    CREATE INDEX idx_analytics_sessions_next_due
      ON analytics_sessions(next_due_at, session_id);
    CREATE TABLE ingest_schema_metadata (
      metadata_key TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      metadata_value INTEGER
    );
    INSERT INTO ingest_schema_metadata VALUES
      ('buffered_visits_cleanup_due_at', 1, ${NOW});
    INSERT INTO buffered_visits (
      visit_id, site_id, visitor_id, session_id, status, started_at,
      last_activity_at, pathname, hostname, perf_ttfb_ms, dirty,
      flush_attempts, next_due_at, flush_due_at, created_at, updated_at
    ) VALUES
      ('dirty-complete', 'site-1', 'visitor-1', 'session-1', 'complete',
        ${NOW - 2_000}, ${NOW - 1_000}, '/complete', 'example.com', 120, 1,
        2, ${NOW + 240_000}, ${NOW + 240_000}, ${NOW}, ${NOW}),
      ('clean-open', 'site-1', 'visitor-2', 'session-2', 'open',
        ${NOW - 2_000}, ${NOW - 1_000}, '/open', 'example.com', NULL, 0,
        0, ${NOW + 1_000}, NULL, ${NOW}, ${NOW});
    INSERT INTO buffered_custom_events (
      event_id, site_id, visit_id, occurred_at, received_at, event_name,
      dirty, next_due_at, flush_due_at, created_at
    ) VALUES
      ('dirty-event', 'site-1', 'dirty-complete', ${NOW - 1_000}, ${NOW},
        'Dirty', 1, ${NOW + 60_000}, ${NOW + 60_000}, ${NOW});
  `);
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

function createLegacyCustomEventSchema(sql: SqliteSqlStorage): void {
  sql.db.exec(`
      CREATE TABLE buffered_custom_events (
        event_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visit_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        pathname TEXT NOT NULL,
        hostname TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        event_name TEXT NOT NULL,
        event_data_json TEXT NOT NULL DEFAULT '{}',
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        created_at INTEGER NOT NULL
      );
      INSERT INTO buffered_custom_events (
        event_id, site_id, visit_id, visitor_id, session_id,
        pathname, hostname, occurred_at, event_name, event_data_json,
        dirty, flush_attempts, created_at
      ) VALUES (
        'legacy-event', 'site-1', 'visit-1', 'visitor-1', 'session-1',
        '/legacy', 'example.com', ${NOW - 1_000}, 'Legacy', '{"ok":true}',
        1, 0, ${NOW}
      );
    `);
}

describe("initializeIngestSqlSchema", () => {
  it("upgrades a buffer kept under per-row deadlines and keeps its dirty rows", () => {
    const sql = new SqliteSqlStorage();
    createPerRowDeadlineSchema(sql);
    const columnsOf = (table: string) =>
      rows<{ name: string }>(sql, `PRAGMA table_info(${table})`).map(
        (column) => column.name,
      );

    initializeIngestSqlSchema(sql);
    initializeIngestSqlSchema(sql);

    for (const column of [
      "next_due_at",
      "flush_due_at",
      "perf_ttfb_ms",
      "perf_fcp_ms",
      "perf_lcp_ms",
      "perf_cls",
      "perf_inp_ms",
    ]) {
      expect(columnsOf("buffered_visits")).not.toContain(column);
    }
    for (const column of ["next_due_at", "flush_due_at", "buffer_revision"]) {
      expect(columnsOf("buffered_custom_events")).not.toContain(column);
    }
    expect(
      rows(
        sql,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('analytics_sessions', 'ingest_schema_metadata')",
      ),
    ).toEqual([]);
    expect(
      rows<{ name: string }>(
        sql,
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_buffered%' ORDER BY name",
      ).map((index) => index.name),
    ).toEqual([
      "idx_buffered_custom_events_dirty",
      "idx_buffered_custom_events_occurred",
      "idx_buffered_visits_dirty",
      "idx_buffered_visits_site_session_status_started",
      "idx_buffered_visits_site_visitor_status",
      "idx_buffered_visits_status_activity",
      "idx_buffered_visits_status_hidden_at",
    ]);
    // The rows waiting for D1 still wait for it, their failures counted.
    expect(
      rows(
        sql,
        "SELECT visit_id, dirty, flush_attempts FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      { visit_id: "clean-open", dirty: 0, flush_attempts: 0 },
      { visit_id: "dirty-complete", dirty: 1, flush_attempts: 2 },
    ]);
    expect(
      rows(sql, "SELECT event_id, dirty FROM buffered_custom_events"),
    ).toEqual([{ event_id: "dirty-event", dirty: 1 }]);
    sql.close();
  });

  it("drops the columns page views no longer store and keeps the buffered rows", () => {
    const sql = new SqliteSqlStorage();
    sql.db.exec(`
      CREATE TABLE buffered_visits (
        visit_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL,
        pathname TEXT NOT NULL,
        hostname TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        postal_code TEXT NOT NULL DEFAULT '',
        metro_code TEXT NOT NULL DEFAULT '',
        as_organization TEXT NOT NULL DEFAULT '',
        ua_raw TEXT NOT NULL DEFAULT '',
        user_id TEXT NOT NULL DEFAULT '',
        user_name TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      INSERT INTO buffered_visits (
        visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, pathname, hostname, latitude, longitude, postal_code,
        metro_code, as_organization, ua_raw, user_id, user_name, created_at,
        updated_at
      ) VALUES (
        'visit-1', 'site-1', 'visitor-1', 'session-1', 'open', ${NOW},
        ${NOW}, '/', 'example.com', 37.48522, -122.23635, '94105',
        '807', 'Example ISP', 'Mozilla/5.0', 'user-1', 'Ada', ${NOW}, ${NOW}
      );
      CREATE TABLE buffered_custom_events (
        event_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visit_id TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        received_at INTEGER NOT NULL,
        sequence INTEGER NOT NULL DEFAULT 0,
        event_name TEXT NOT NULL,
        event_data_json TEXT NOT NULL DEFAULT '{}',
        user_id TEXT NOT NULL DEFAULT '',
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        created_at INTEGER NOT NULL
      );
      INSERT INTO buffered_custom_events (
        event_id, site_id, visit_id, occurred_at, received_at, event_name,
        user_id, created_at
      ) VALUES (
        'event-1', 'site-1', 'visit-1', ${NOW}, ${NOW}, 'Signup',
        'user-1', ${NOW}
      );
    `);
    const columnsOf = (table: string) =>
      rows<{ name: string }>(sql, `PRAGMA table_info(${table})`).map(
        (column) => column.name,
      );

    initializeIngestSqlSchema(sql);
    initializeIngestSqlSchema(sql);

    for (const column of [
      "ua_raw",
      "postal_code",
      "metro_code",
      "as_organization",
      "user_id",
      "user_name",
    ]) {
      expect(columnsOf("buffered_visits")).not.toContain(column);
    }
    expect(columnsOf("buffered_custom_events")).not.toContain("user_id");
    // Its coordinates round as ingest now stores them, before anything reads
    // or flushes the row.
    expect(
      rows(
        sql,
        "SELECT visit_id, pathname, latitude, longitude FROM buffered_visits",
      ),
    ).toEqual([
      { visit_id: "visit-1", pathname: "/", latitude: 37.5, longitude: -122.2 },
    ]);
    expect(
      rows(sql, "SELECT event_id, event_name FROM buffered_custom_events"),
    ).toEqual([{ event_id: "event-1", event_name: "Signup" }]);
    sql.close();
  });

  it("preserves legacy custom event rows while adding current columns", () => {
    const sql = new SqliteSqlStorage();
    createLegacyCustomEventSchema(sql);

    initializeIngestSqlSchema(sql);

    expect(
      rows<{
        count: number;
        eventName: string;
        eventDataJson: string;
        receivedAt: number;
        sequence: number;
        dirty: number;
      }>(
        sql,
        `
          SELECT
            COUNT(*) OVER () AS count,
            event_name AS eventName,
            event_data_json AS eventDataJson,
            received_at AS receivedAt,
            sequence,
            dirty
          FROM buffered_custom_events
          WHERE event_id = 'legacy-event'
        `,
      ),
    ).toEqual([
      {
        count: 1,
        eventName: "Legacy",
        eventDataJson: '{"ok":true}',
        receivedAt: NOW - 1_000,
        sequence: 0,
        dirty: 1,
      },
    ]);
    expect(
      rows<{ name: string }>(
        sql,
        "PRAGMA table_info(buffered_custom_events)",
      ).map((column) => column.name),
    ).toEqual(
      expect.arrayContaining([
        "visitor_id",
        "session_id",
        "pathname",
        "hostname",
        "received_at",
        "sequence",
        "revenue_amount",
        "revenue_currency",
      ]),
    );
    sql.close();
  });

  it.each(["sql", "options"] as const)(
    "uses the %s transactionSync API for legacy migrations without raw SQL transactions",
    (apiLocation) => {
      const sql = new SqliteSqlStorage();
      createLegacyCustomEventSchema(sql);
      const originalExec = sql.exec.bind(sql);
      vi.spyOn(sql, "exec").mockImplementation((query, ...bindings) => {
        if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(query.trim())) {
          throw new Error(
            "Raw SQL transactions are forbidden by Durable Objects",
          );
        }
        return originalExec(query, ...bindings);
      });
      const transactionCalls = vi.fn();
      const transaction = <T>(closure: () => T): T => {
        transactionCalls();
        sql.db.exec("BEGIN");
        try {
          const result = closure();
          sql.db.exec("COMMIT");
          return result;
        } catch (error) {
          sql.db.exec("ROLLBACK");
          throw error;
        }
      };
      if (apiLocation === "sql")
        Object.assign(sql, { transactionSync: transaction });
      const options =
        apiLocation === "options"
          ? { transactionSync: transaction }
          : undefined;
      try {
        expect(() => initializeIngestSqlSchema(sql, options)).not.toThrow();
        expect(transactionCalls).toHaveBeenCalledTimes(1);
        expect(
          rows(
            sql,
            "SELECT event_id, visitor_id, session_id, pathname, hostname FROM buffered_custom_events",
          ),
        ).toEqual([
          {
            event_id: "legacy-event",
            visitor_id: "visitor-1",
            session_id: "session-1",
            pathname: "/legacy",
            hostname: "example.com",
          },
        ]);
        // Migrated once: a second start leaves the table as it is.
        initializeIngestSqlSchema(sql, options);
        expect(transactionCalls).toHaveBeenCalledTimes(1);
        expect(
          rows(sql, "SELECT COUNT(*) AS count FROM buffered_custom_events"),
        ).toEqual([{ count: 1 }]);
      } finally {
        sql.close();
      }
    },
  );

  it("rolls back a failed native legacy migration and allows a safe retry", () => {
    const sql = new SqliteSqlStorage();
    createLegacyCustomEventSchema(sql);
    const originalExec = sql.exec.bind(sql);
    const execSpy = vi
      .spyOn(sql, "exec")
      .mockImplementation((query, ...bindings) => {
        if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(query.trim())) {
          throw new Error(
            "Raw SQL transactions are forbidden by Durable Objects",
          );
        }
        if (
          query.includes("ALTER TABLE buffered_custom_events_migration RENAME")
        ) {
          throw new Error("injected rename failure");
        }
        return originalExec(query, ...bindings);
      });
    const options = {
      transactionSync<T>(closure: () => T): T {
        sql.db.exec("BEGIN");
        try {
          const result = closure();
          sql.db.exec("COMMIT");
          return result;
        } catch (error) {
          sql.db.exec("ROLLBACK");
          throw error;
        }
      },
    };
    try {
      expect(() => initializeIngestSqlSchema(sql, options)).toThrow(
        "injected rename failure",
      );
      expect(
        rows(sql, "SELECT event_id, pathname FROM buffered_custom_events"),
      ).toEqual([{ event_id: "legacy-event", pathname: "/legacy" }]);
      expect(
        rows(
          sql,
          "SELECT name FROM sqlite_master WHERE name IN ('buffered_custom_events_migration', 'buffered_custom_events_legacy')",
        ),
      ).toEqual([]);
      execSpy.mockRestore();
      initializeIngestSqlSchema(sql, options);
      expect(
        rows(sql, "SELECT event_id, pathname FROM buffered_custom_events"),
      ).toEqual([{ event_id: "legacy-event", pathname: "/legacy" }]);
    } finally {
      sql.close();
    }
  });
});
