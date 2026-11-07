import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createDatabaseRuntime } from "@/lib/db";
import {
  createSqliteD1Database,
  type SqliteD1Trace,
} from "@/lib/db/__tests__/sqlite-d1";
import {
  deleteExpiredData,
  EXPIRED_DATA_MIN_QUERIES,
  RETENTION_BATCH_ROWS,
  runAnalyticsRetention,
} from "@/lib/edge/scheduled-tasks/analytics-retention";
import { BudgetedDatabase } from "@/lib/edge/scheduled-tasks/d1-query-budget";
import type { ScheduledTaskContext } from "@/lib/edge/scheduled-tasks/runner";
import type { Env } from "@/lib/edge/types";

const DAY_MS = 86_400_000;
const NOW = Date.UTC(2026, 9, 19, 6);
const TODAY = Math.floor(NOW / DAY_MS);

function seedSite(
  database: DatabaseSync,
  sitePk: number,
  rollup: { firstDay: number; lastDay: number; backfilled: boolean },
) {
  database.exec(
    "INSERT OR IGNORE INTO teams (id, name, slug) VALUES ('t', 'Team', 't')",
  );
  database
    .prepare("INSERT INTO site_identities (site_pk, site_id) VALUES (?, ?)")
    .run(sitePk, `s${sitePk}`);
  database
    .prepare(
      "INSERT INTO sites (id, team_id, name, domain) VALUES (?, 't', 'Site', 'example.com')",
    )
    .run(`s${sitePk}`);
  database
    .prepare(
      "INSERT INTO visit_rollup_state (site_pk, first_day, last_day, backfilled) VALUES (?, ?, ?, ?)",
    )
    .run(sitePk, rollup.firstDay, rollup.lastDay, rollup.backfilled ? 1 : 0);
  database
    .prepare(
      "INSERT INTO custom_event_names (id, site_pk, site_id, name, last_seen_at) VALUES (?, ?, ?, 'signup', 0)",
    )
    .run(sitePk, sitePk, `s${sitePk}`);
}

/** Page views (each with an event) on a day, and that day's rollup. */
function seedDay(
  database: DatabaseSync,
  sitePk: number,
  day: number,
  pageViews = 1,
) {
  const visit = database.prepare(
    `INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id, status,
       started_at, last_activity_at, pathname, hostname)
     VALUES (?, ?, ?, 'v', 'x', 'complete', ?, ?, '/', 'example.com')`,
  );
  const event = database.prepare(
    `INSERT INTO custom_events (event_id, site_pk, site_id, visit_id, event_name_id,
       occurred_at, received_at, node_count, value_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
  );
  for (let index = 0; index < pageViews; index += 1) {
    const id = `s${sitePk}-d${day}-${index}`;
    const at = day * DAY_MS + index;
    visit.run(id, sitePk, `s${sitePk}`, at, at);
    event.run(`${id}-event`, sitePk, `s${sitePk}`, id, sitePk, at, at);
  }
  database
    .prepare(
      `INSERT INTO visit_daily_rollups (site_pk, day, views, visitors, sessions,
         bounces, duration_ms_sum, duration_ms_count)
       VALUES (?, ?, ?, 1, 1, 0, 0, 0)`,
    )
    .run(sitePk, day, pageViews);
}

function count(database: DatabaseSync, sql: string): number {
  return Number((database.prepare(sql).get() as { n: number }).n);
}

/** The D1 queries the tests give a run: fewer than an invocation has. */
const RUN_QUERIES = 250;

function budgeted(d1: D1Database, queries = RUN_QUERIES): BudgetedDatabase {
  return new BudgetedDatabase(createDatabaseRuntime(d1), queries);
}

/** D1 queries made through a traced database, a batch counting as one. */
function d1Queries(trace: Required<SqliteD1Trace>): number {
  return (
    trace.preparedSql.length -
    trace.batchStatements.flat().length +
    trace.batchStatements.length
  );
}

/** `pageViews` page views of a site on the epoch's first day, long expired. */
function insertPageViews(
  database: DatabaseSync,
  sitePk: number,
  pageViews: number,
) {
  database.exec(`
    WITH RECURSIVE n(i) AS (
      SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${pageViews}
    )
    INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id,
      status, started_at, last_activity_at, pathname, hostname)
    SELECT 's${sitePk}-' || i, ${sitePk}, 's${sitePk}', 'v', 'x', 'complete',
      i, i, '/', 'example.com'
    FROM n;
  `);
}

/** An event with a payload of `nodes` nodes, each with a value. */
function insertPayloadEvent(
  database: DatabaseSync,
  event: { id: string; visitId: string; occurredAt: number; nodes: number },
) {
  database.exec(`
    INSERT OR IGNORE INTO custom_event_json_paths (id, site_pk, site_id, path, last_seen_at)
      VALUES (1, 1, 's1', '$.items', 0);
  `);
  const { event_pk: eventPk } = database
    .prepare(
      `INSERT INTO custom_events (event_id, site_pk, site_id, visit_id, event_name_id,
         occurred_at, received_at, node_count, value_count)
       VALUES (?, 1, 's1', ?, 1, ?, ?, ?, ?) RETURNING event_pk`,
    )
    .get(
      event.id,
      event.visitId,
      event.occurredAt,
      event.occurredAt,
      event.nodes,
      event.nodes,
    ) as { event_pk: number };
  database.exec(`
    WITH RECURSIVE node(id) AS (
      SELECT 1 UNION ALL SELECT id + 1 FROM node WHERE id < ${event.nodes}
    )
    INSERT INTO custom_event_json_nodes (event_pk, node_id, path_id, value_type, depth)
      SELECT ${eventPk}, node.id, 1, 1, 1 FROM node;
    INSERT INTO custom_event_json_values (event_pk, node_id, site_id,
      event_name_id, path_id, occurred_at, value_type, string_value, site_pk)
      SELECT event_pk, node_id, 's1', 1, 1, ${event.occurredAt}, 1, 'x', 1
      FROM custom_event_json_nodes WHERE event_pk = ${eventPk};
  `);
}

/**
 * A database that records the rows each statement changes, including the
 * rows its foreign keys cascade into.
 */
function recordRowsChanged(
  database: DatabaseSync,
  rowsChanged: number[],
): D1Database {
  const d1 = createSqliteD1Database(database);
  const totalChanges = () => count(database, "SELECT total_changes() AS n");
  return {
    ...d1,
    prepare(sql: string) {
      const statement = d1.prepare(sql);
      const recorded = {
        bind(...values: unknown[]) {
          statement.bind(...values);
          return recorded;
        },
        first: () => statement.first(),
        all: () => statement.all(),
        async run() {
          const before = totalChanges();
          const result = await statement.run();
          rowsChanged.push(totalChanges() - before);
          return result;
        },
      };
      return recorded as unknown as D1PreparedStatement;
    },
  } as D1Database;
}

function run(
  database: DatabaseSync,
  analyticsDetailDays: number | null = 30,
  trace?: SqliteD1Trace,
  maxQueries = RUN_QUERIES,
) {
  database
    .prepare(
      "INSERT OR REPLACE INTO configs (config_key, value_json) VALUES ('scheduled-task-retention', ?)",
    )
    .run(JSON.stringify({ analyticsDetailDays }));
  return runAnalyticsRetention(
    {
      env: { DB: createSqliteD1Database(database, trace) } as Env,
      logger: { info: vi.fn() },
    } as unknown as ScheduledTaskContext,
    maxQueries,
  );
}

describe("analytics retention", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    vi.useRealTimers();
  });

  it("deletes whole expired days of page views and events and keeps their rollups", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 60,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    seedDay(database, 1, TODAY - 40, 3);
    // The first retained day: 30 days before today, from its midnight.
    seedDay(database, 1, TODAY - 30, 2);
    seedDay(database, 1, TODAY - 2);

    const outcome = await run(database);

    expect(outcome.summary).toMatchObject({
      cutoffDay: TODAY - 30,
      visitsDeleted: 3,
      eventsDeleted: 3,
      complete: true,
    });
    expect(count(database, "SELECT COUNT(*) AS n FROM visits")).toBe(3);
    expect(count(database, "SELECT COUNT(*) AS n FROM custom_events")).toBe(3);
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visit_daily_rollups"),
    ).toBe(3);
  });

  it("keeps page views of days not rolled up yet", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    // Backfill still running: nothing is deleted.
    seedSite(database, 1, {
      firstDay: TODAY - 35,
      lastDay: TODAY - 1,
      backfilled: false,
    });
    seedDay(database, 1, TODAY - 40);
    // Rolled up only to a day before the cutoff: later days stay.
    seedSite(database, 2, {
      firstDay: TODAY - 60,
      lastDay: TODAY - 45,
      backfilled: true,
    });
    seedDay(database, 2, TODAY - 50);
    seedDay(database, 2, TODAY - 40);

    await run(database);

    expect(
      database.prepare("SELECT visit_id FROM visits ORDER BY visit_id").all(),
    ).toEqual([
      { visit_id: `s1-d${TODAY - 40}-0` },
      { visit_id: `s2-d${TODAY - 40}-0` },
    ]);
  });

  it("shares a run's deletes between sites by their backlog and finishes on later runs", async () => {
    database = createMigratedDatabase();
    for (const sitePk of [1, 2]) {
      seedSite(database, sitePk, {
        firstDay: TODAY - 400,
        lastDay: TODAY - 1,
        backfilled: true,
      });
    }
    // Site 1 has three times site 2's backlog: 9 rounds to 3.
    for (let offset = 0; offset < 9; offset += 1) {
      seedDay(database, 1, TODAY - 31 - offset, RETENTION_BATCH_ROWS);
    }
    for (let offset = 0; offset < 3; offset += 1) {
      seedDay(database, 2, TODAY - 31 - offset, RETENTION_BATCH_ROWS);
    }
    const d1 = createSqliteD1Database(database);
    const left = (table: string, sitePk: number) =>
      count(
        database!,
        `SELECT COUNT(*) AS n FROM ${table} WHERE site_pk = ${sitePk}`,
      );

    // 9 queries: the backlogs, then 6 rounds for site 1 and 2 for site 2.
    // A round deletes a batch of page views with their events.
    const first = await deleteExpiredData(budgeted(d1, 9), TODAY - 30);
    expect(first).toMatchObject({
      queries: 9,
      visitsDeleted: 8 * RETENTION_BATCH_ROWS,
      eventsDeleted: 8 * RETENTION_BATCH_ROWS,
      complete: false,
    });
    expect(left("visits", 1)).toBe(3 * RETENTION_BATCH_ROWS);
    expect(left("custom_events", 1)).toBe(3 * RETENTION_BATCH_ROWS);
    expect(left("visits", 2)).toBe(1 * RETENTION_BATCH_ROWS);

    const second = await deleteExpiredData(budgeted(d1, 9), TODAY - 30);
    expect(second).toMatchObject({ complete: true });
    expect(second.queries).toBeLessThanOrEqual(9);
    for (const table of ["visits", "custom_events"]) {
      expect(left(table, 1) + left(table, 2)).toBe(0);
    }
  });

  it("deletes a page view's events with it, whenever they occurred, in bounded statements", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 400,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    // A page view of the last expired day, whose event, with 2,500 payload
    // rows, came after midnight, on the first retained day.
    database
      .prepare(
        `INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id,
           status, started_at, last_activity_at, pathname, hostname)
         VALUES ('expired', 1, 's1', 'v', 'x', 'complete', ?, ?, '/', 'example.com')`,
      )
      .run((TODAY - 30) * DAY_MS - 1000, (TODAY - 30) * DAY_MS - 1000);
    insertPayloadEvent(database, {
      id: "late-event",
      visitId: "expired",
      occurredAt: (TODAY - 30) * DAY_MS + 60_000,
      nodes: 2.5 * RETENTION_BATCH_ROWS,
    });
    // A retained page view keeps its event.
    seedDay(database, 1, TODAY - 30);
    const rowsChanged: number[] = [];
    const db = budgeted(recordRowsChanged(database, rowsChanged));

    const deleted = await deleteExpiredData(db, TODAY - 30);

    expect(deleted).toMatchObject({
      eventsDeleted: 1,
      visitsDeleted: 1,
      complete: true,
      queries: db.queries,
    });
    expect(Math.max(...rowsChanged)).toBe(RETENTION_BATCH_ROWS);
    for (const table of [
      "custom_event_json_values",
      "custom_event_json_nodes",
    ]) {
      expect(count(database, `SELECT COUNT(*) AS n FROM ${table}`)).toBe(0);
    }
    expect(
      database
        .prepare(
          "SELECT visit_id FROM custom_events UNION ALL SELECT visit_id FROM visits",
        )
        .all(),
    ).toEqual([
      { visit_id: `s1-d${TODAY - 30}-0` },
      { visit_id: `s1-d${TODAY - 30}-0` },
    ]);
  });

  it("keeps the page views of a day marked for a rebuild during a run, and of the site's later days", async () => {
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 60,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    for (const day of [TODAY - 42, TODAY - 41, TODAY - 40]) {
      seedDay(database, 1, day);
    }
    // An ingest flush marks a day after the run has read the backlogs.
    const d1 = createSqliteD1Database(database);
    const prepare = d1.prepare.bind(d1);
    d1.prepare = (sql: string) => {
      const statement = prepare(sql);
      if (sql.includes("WITH backfilled")) {
        const all = statement.all.bind(statement);
        statement.all = (async () => {
          const result = await all();
          database!
            .prepare(
              "INSERT INTO visit_rollup_dirty_days (site_pk, day) VALUES (1, ?)",
            )
            .run(TODAY - 41);
          return result;
        }) as typeof statement.all;
      }
      return statement;
    };

    const deleted = await deleteExpiredData(budgeted(d1), TODAY - 30);

    expect(deleted).toMatchObject({ visitsDeleted: 1, complete: true });
    expect(
      database.prepare("SELECT visit_id FROM visits ORDER BY started_at").all(),
    ).toEqual([
      { visit_id: `s1-d${TODAY - 41}-0` },
      { visit_id: `s1-d${TODAY - 40}-0` },
    ]);
    expect(
      count(
        database,
        "SELECT retention_reached_day AS n FROM visit_rollup_state",
      ),
    ).toBe(TODAY - 42);
  });

  it("makes at most the D1 queries it is given, its settings read included, and says work remains", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 400,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    // More expired page views than a run's queries can delete.
    insertPageViews(database, 1, 300 * RETENTION_BATCH_ROWS);
    const trace = { preparedSql: [], bindings: [], batchStatements: [] };

    const outcome = await run(database, 30, trace);

    expect(d1Queries(trace)).toBe(RUN_QUERIES);
    expect(outcome.workRemains).toBe(true);
    expect(outcome.summary).toMatchObject({
      d1Queries: RUN_QUERIES,
      complete: false,
      workRemains: true,
    });
    // The settings, deleted sites and backlog reads, then a round each.
    expect((outcome.summary as { visitsDeleted: number }).visitsDeleted).toBe(
      (RUN_QUERIES - 3) * RETENTION_BATCH_ROWS,
    );
    // Seeds a large backlog: slow under coverage on a small CI runner.
  }, 60_000);

  it("keeps queries for expired data while a deleted site's purge takes the rest, and carries on next run", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    for (const sitePk of [1, 2]) {
      seedSite(database, sitePk, {
        firstDay: TODAY - 400,
        lastDay: TODAY - 1,
        backfilled: true,
      });
    }
    seedDay(database, 1, TODAY - 40, 3);
    // Deleted site 2 has more page views than a run's queries can purge.
    const deletedPageViews = 300 * RETENTION_BATCH_ROWS;
    insertPageViews(database, 2, deletedPageViews);
    database.exec("DELETE FROM sites WHERE id = 's2'");
    const trace = { preparedSql: [], bindings: [], batchStatements: [] };

    const first = await run(database, 30, trace);

    expect(d1Queries(trace)).toBeLessThanOrEqual(RUN_QUERIES);
    expect(first.workRemains).toBe(true);
    expect(first.summary).toMatchObject({
      deletedSitesPurged: 0,
      purgeComplete: false,
      purgeQueries: RUN_QUERIES - 1 - EXPIRED_DATA_MIN_QUERIES,
      // One round deletes site 1's page views; the next confirms it.
      visitsDeleted: 3,
      complete: false,
    });
    const purged =
      deletedPageViews -
      count(database, "SELECT COUNT(*) AS n FROM visits WHERE site_pk = 2");
    expect(purged).toBeGreaterThan(200 * RETENTION_BATCH_ROWS);

    const second = await run(database, 30);

    expect(second.workRemains).toBe(false);
    expect(second.summary).toMatchObject({
      deletedSitesPurged: 1,
      purgeComplete: true,
      complete: true,
    });
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visits WHERE site_pk = 2"),
    ).toBe(0);
    // Seeds a large backlog: slow under coverage on a small CI runner.
  }, 60_000);

  it("finishes deleting the data of removed sites", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 3,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    seedSite(database, 2, {
      firstDay: TODAY - 3,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    seedDay(database, 1, TODAY - 2, 2);
    seedDay(database, 2, TODAY - 2, 2);
    database.prepare("DELETE FROM sites WHERE id = 's2'").run();

    const outcome = await run(database, 396);

    expect(outcome.summary).toMatchObject({ deletedSitesPurged: 1 });
    expect(
      database
        .prepare("SELECT DISTINCT site_pk FROM visits ORDER BY site_pk")
        .all(),
    ).toEqual([{ site_pk: 1 }]);
    expect(
      database
        .prepare("SELECT site_pk FROM visit_rollup_state ORDER BY site_pk")
        .all(),
    ).toEqual([{ site_pk: 1 }]);
    expect(
      count(
        database,
        "SELECT COUNT(*) AS n FROM visit_daily_rollups WHERE site_pk = 2",
      ),
    ).toBe(0);
  });

  it("keeps a large expired backlog draining run after run, each within its queries, until it's gone", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, 1, {
      firstDay: TODAY - 400,
      lastDay: TODAY - 1,
      backfilled: true,
    });
    insertPageViews(database, 1, 12 * RETENTION_BATCH_ROWS);
    // The settings, deleted sites and backlog reads, then 3 rounds a run.
    const maxQueries = 6;
    const runs: Array<{ queries: number; deleted: number; more: boolean }> = [];
    for (let index = 0; index < 10; index += 1) {
      const trace = { preparedSql: [], bindings: [], batchStatements: [] };
      const outcome = await run(database, 30, trace, maxQueries);
      runs.push({
        queries: d1Queries(trace),
        deleted: (outcome.summary as { visitsDeleted: number }).visitsDeleted,
        more: outcome.workRemains === true,
      });
      if (!outcome.workRemains) break;
    }

    expect(runs).toEqual([
      { queries: 6, deleted: 3 * RETENTION_BATCH_ROWS, more: true },
      { queries: 6, deleted: 3 * RETENTION_BATCH_ROWS, more: true },
      { queries: 6, deleted: 3 * RETENTION_BATCH_ROWS, more: true },
      { queries: 6, deleted: 3 * RETENTION_BATCH_ROWS, more: true },
      // Nothing expired is left: the backlog read finds no site.
      { queries: 3, deleted: 0, more: false },
    ]);
    expect(count(database, "SELECT COUNT(*) AS n FROM visits")).toBe(0);
  });

  it("keeps page views and events forever when set to, and still purges removed sites", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    for (const sitePk of [1, 2]) {
      seedSite(database, sitePk, {
        firstDay: TODAY - 4000,
        lastDay: TODAY - 1,
        backfilled: true,
      });
      seedDay(database, sitePk, TODAY - 3999, 2);
    }
    database.prepare("DELETE FROM sites WHERE id = 's2'").run();

    const outcome = await run(database, null);

    expect(outcome.workRemains).toBe(false);
    expect(outcome.summary).toMatchObject({
      analyticsDetailDays: null,
      cutoffDay: null,
      deletedSitesPurged: 1,
    });
    expect(outcome.summary).not.toHaveProperty("visitsDeleted");
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visits WHERE site_pk = 1"),
    ).toBe(2);
    expect(
      count(
        database,
        "SELECT COUNT(*) AS n FROM custom_events WHERE site_pk = 1",
      ),
    ).toBe(2);
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visits WHERE site_pk = 2"),
    ).toBe(0);
  });
});
