import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import {
  createRollupTestEnv,
  DAY_MS,
  insertVisits,
  seedSites,
  syntheticVisits,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { VISIT_TIMEOUT_MS } from "@/lib/edge/ingest/constants";
import {
  latestCompleteDay,
  ROLLUP_LAG_MS,
  runVisitRollups,
} from "@/lib/edge/scheduled-tasks/visit-rollups";
import type { Env } from "@/lib/edge/types";

const HOUR_MS = 3_600_000;
const NOW = Date.UTC(2026, 10, 6, 13);
const LATEST_DAY = Math.floor(NOW / DAY_MS) - 1;
/** The D1 queries the tests give a run: fewer than an invocation has. */
const RUN_QUERIES = 250;

type Row = Record<string, unknown>;

function state(database: DatabaseSync): Row[] {
  return database
    .prepare(
      "SELECT site_pk, first_day, last_day, backfilled FROM visit_rollup_state ORDER BY site_pk",
    )
    .all() as Row[];
}

function count(database: DatabaseSync, sql: string): number {
  return Number((database.prepare(sql).get() as { n: number }).n);
}

function insertVisit(
  database: DatabaseSync,
  visit: {
    id: string;
    sitePk?: number;
    startedAt: number;
    status?: string;
    lastActivityAt?: number;
    durationMs?: number | null;
    visitorId?: string;
    sessionId?: string;
  },
): void {
  database
    .prepare(
      `INSERT INTO visits (visit_id, site_pk, visitor_id, session_id,
         status, started_at, last_activity_at, duration_ms, pathname, hostname,
         channel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '/', 'example.com', 'direct')`,
    )
    .run(
      visit.id,
      visit.sitePk ?? 1,
      visit.visitorId ?? `visitor-${visit.id}`,
      visit.sessionId ?? `session-${visit.id}`,
      visit.status ?? "complete",
      visit.startedAt,
      visit.lastActivityAt ?? visit.startedAt,
      visit.durationMs === undefined ? 1000 : visit.durationMs,
    );
}

describe("visit rollups", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it("names the last day whose page views can no longer change", () => {
    expect(latestCompleteDay(Date.UTC(2026, 10, 6, 12))).toBe(
      Math.floor(Date.UTC(2026, 10, 5) / DAY_MS),
    );
    expect(latestCompleteDay(Date.UTC(2026, 10, 6, 12) - 1)).toBe(
      Math.floor(Date.UTC(2026, 10, 4) / DAY_MS),
    );
    expect(ROLLUP_LAG_MS).toBe(12 * HOUR_MS);
  });

  it("rolls up hours, days, card dimensions and map points from a day's page views", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const dayStart = LATEST_DAY * DAY_MS;
    // One visitor seen at 01:10 and 03:20 in one visit, another at 03:40.
    insertVisit(database, {
      id: "a1",
      startedAt: dayStart + HOUR_MS + 10 * 60_000,
      visitorId: "alice",
      sessionId: "alice-1",
    });
    insertVisit(database, {
      id: "a2",
      startedAt: dayStart + 3 * HOUR_MS + 20 * 60_000,
      visitorId: "alice",
      sessionId: "alice-1",
    });
    insertVisit(database, {
      id: "b1",
      startedAt: dayStart + 3 * HOUR_MS + 40 * 60_000,
      visitorId: "bob",
      sessionId: "bob-1",
    });

    const outcome = await runVisitRollups(created.env, NOW);

    expect(outcome.status).toBe("success");
    expect(
      database
        .prepare(
          `SELECT hour_bucket - ? AS hour, views, visitors, first_visitors,
             last_visitors, sessions, bounces, duration_ms_sum, duration_ms_count
           FROM visit_hourly_rollups ORDER BY hour_bucket`,
        )
        .all(LATEST_DAY * 24),
    ).toEqual([
      {
        hour: 1,
        views: 1,
        visitors: 1,
        first_visitors: 1,
        last_visitors: 0,
        sessions: 1,
        bounces: 0,
        duration_ms_sum: 1000,
        duration_ms_count: 1,
      },
      {
        hour: 3,
        views: 2,
        visitors: 2,
        first_visitors: 1,
        last_visitors: 2,
        sessions: 1,
        bounces: 1,
        duration_ms_sum: 2000,
        duration_ms_count: 2,
      },
    ]);
    expect(database.prepare("SELECT * FROM visit_daily_rollups").all()).toEqual(
      [
        {
          site_pk: 1,
          day: LATEST_DAY,
          views: 3,
          visitors: 2,
          sessions: 2,
          bounces: 1,
          duration_ms_sum: 3000,
          duration_ms_count: 3,
        },
      ],
    );
    expect(
      database
        .prepare(
          `SELECT dimension, value, views, sessions, visitors
           FROM visit_daily_dimension_rollups
           WHERE dimension IN ('page.path', 'page.entry', 'source.channel')
           ORDER BY dimension, value`,
        )
        .all(),
    ).toEqual([
      {
        dimension: "page.entry",
        value: "/",
        views: 2,
        sessions: 2,
        visitors: 2,
      },
      {
        dimension: "page.path",
        value: "/",
        views: 3,
        sessions: 2,
        visitors: 2,
      },
      {
        dimension: "source.channel",
        value: "direct",
        views: 3,
        sessions: 2,
        visitors: 2,
      },
    ]);
    expect(state(database)).toEqual([
      {
        site_pk: 1,
        first_day: LATEST_DAY,
        last_day: LATEST_DAY,
        backfilled: 1,
      },
    ]);
  });

  it("backfills within the run's D1 queries and resumes where it stopped", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const days = 400;
    for (let day = 0; day < days; day += 1) {
      insertVisit(database, {
        id: `v${day}`,
        startedAt: (LATEST_DAY - day) * DAY_MS + HOUR_MS,
      });
    }

    const first = await runVisitRollups(created.env, NOW, {
      maxQueries: RUN_QUERIES,
    });
    const firstQueries = created.d1Queries();
    expect(firstQueries).toBeLessThanOrEqual(RUN_QUERIES);
    expect(first.workRemains).toBe(true);
    expect(first.summary).toMatchObject({
      d1Queries: firstQueries,
      sitesBackfilled: 0,
      workRemains: true,
    });
    // One query a day: the batch that rolls it up and records it.
    const firstDays = Number(first.summary?.daysBackfilled);
    expect(firstDays).toBeGreaterThanOrEqual(RUN_QUERIES - 10);
    expect(state(database)).toEqual([
      {
        site_pk: 1,
        first_day: LATEST_DAY - firstDays + 1,
        last_day: LATEST_DAY,
        backfilled: 0,
      },
    ]);

    const second = await runVisitRollups(created.env, NOW, {
      maxQueries: RUN_QUERIES,
    });
    expect(created.d1Queries() - firstQueries).toBeLessThanOrEqual(RUN_QUERIES);
    expect(second.workRemains).toBe(false);
    expect(second.summary).toMatchObject({
      daysBackfilled: days - firstDays,
      sitesBackfilled: 1,
    });
    expect(state(database)[0]).toMatchObject({
      first_day: LATEST_DAY - days + 1,
      backfilled: 1,
    });
    expect(
      count(database, "SELECT SUM(views) AS n FROM visit_daily_rollups"),
    ).toBe(days);

    // A day later only the new day is rolled up.
    insertVisit(database, { id: "new", startedAt: (LATEST_DAY + 1) * DAY_MS });
    const third = await runVisitRollups(created.env, NOW + DAY_MS);
    expect(third.summary).toMatchObject({ daysRolledUp: 1, daysBackfilled: 0 });
    expect(state(database)[0]).toMatchObject({ last_day: LATEST_DAY + 1 });
  });

  it("keeps a backfill far larger than a run going, run after run, each within its queries", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [
      { siteId: "site-1", sitePk: 1 },
      { siteId: "site-2", sitePk: 2 },
    ]);
    const days = 60;
    for (const sitePk of [1, 2]) {
      for (let day = 0; day < days; day += 1) {
        insertVisit(database, {
          id: `s${sitePk}-v${day}`,
          sitePk,
          startedAt: (LATEST_DAY - day) * DAY_MS + HOUR_MS,
        });
      }
    }
    const maxQueries = 25;
    const runs: Array<{ queries: number; days: number; more: boolean }> = [];
    for (let index = 0; index < 20; index += 1) {
      const before = created.d1Queries();
      const outcome = await runVisitRollups(created.env, NOW, { maxQueries });
      runs.push({
        queries: created.d1Queries() - before,
        days: Number(outcome.summary?.daysBackfilled),
        more: outcome.workRemains === true,
      });
      if (!outcome.workRemains) break;
    }

    // Every run but the last stops at its queries with work left; the next
    // goes on, and none rolls up a day twice.
    expect(runs.length).toBeGreaterThan(4);
    for (const run of runs) expect(run.queries).toBeLessThanOrEqual(maxQueries);
    expect(runs.slice(0, -1).every((run) => run.more && run.days > 0)).toBe(
      true,
    );
    expect(runs.at(-1)?.more).toBe(false);
    expect(runs.reduce((sum, run) => sum + run.days, 0)).toBe(2 * days);
    expect(state(database)).toEqual(
      [1, 2].map((sitePk) => ({
        site_pk: sitePk,
        first_day: LATEST_DAY - days + 1,
        last_day: LATEST_DAY,
        backfilled: 1,
      })),
    );
    expect(
      count(database, "SELECT SUM(views) AS n FROM visit_daily_rollups"),
    ).toBe(2 * days);
  });

  it("rolls up a day with unfinished page views and leaves them to the ingest buffer", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const lateEvening = LATEST_DAY * DAY_MS + 23 * HOUR_MS;
    insertVisit(database, { id: "closed", startedAt: lateEvening - HOUR_MS });
    // Idle past the visit timeout: only the ingest buffer finishes them.
    insertVisit(database, {
      id: "open",
      startedAt: lateEvening,
      status: "open",
      lastActivityAt: NOW - VISIT_TIMEOUT_MS - 1,
      durationMs: null,
    });
    insertVisit(database, {
      id: "hidden",
      startedAt: lateEvening + 1,
      status: "hidden_pending",
      lastActivityAt: NOW - VISIT_TIMEOUT_MS - 1,
      durationMs: null,
    });
    const before = database
      .prepare("SELECT * FROM visits ORDER BY visit_id")
      .all();

    const outcome = await runVisitRollups(created.env, NOW);

    expect(outcome.summary).toMatchObject({ daysBackfilled: 1 });
    expect(
      database
        .prepare(
          "SELECT views, duration_ms_sum, duration_ms_count FROM visit_daily_rollups",
        )
        .get(),
    ).toEqual({ views: 3, duration_ms_sum: 1000, duration_ms_count: 1 });
    expect(
      database.prepare("SELECT * FROM visits ORDER BY visit_id").all(),
    ).toEqual(before);
  });

  it("rebuilds marked days first, a batch each, and resumes when they outnumber the run's queries", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [
      { siteId: "site-1", sitePk: 1 },
      { siteId: "site-2", sitePk: 2 },
    ]);
    const days = 400;
    const firstDay = LATEST_DAY - days + 1;
    database
      .prepare(
        `INSERT INTO visit_rollup_state (site_pk, first_day, last_day, backfilled)
         VALUES (1, ?, ?, 1), (2, ?, ?, 1)`,
      )
      .run(firstDay, LATEST_DAY, firstDay, LATEST_DAY);
    const mark = database.prepare(
      "INSERT INTO visit_rollup_dirty_days (site_pk, day) VALUES (?, ?)",
    );
    for (let day = firstDay; day <= LATEST_DAY; day += 1) {
      insertVisit(database, { id: `v${day}`, startedAt: day * DAY_MS });
      mark.run(1, day);
    }
    // A deleted site's mark is left for its purge.
    mark.run(2, LATEST_DAY);
    database.prepare("DELETE FROM sites WHERE id = 'site-2'").run();
    const marks = () =>
      count(
        database!,
        "SELECT COUNT(*) AS n FROM visit_rollup_dirty_days WHERE site_pk = 1",
      );

    const first = await runVisitRollups(created.env, NOW, {
      maxQueries: RUN_QUERIES,
    });
    const firstQueries = created.d1Queries();
    const rebuilt = Number(first.summary?.daysRebuilt);

    expect(firstQueries).toBeLessThanOrEqual(RUN_QUERIES);
    expect(first.summary).toMatchObject({
      d1Queries: firstQueries,
      workRemains: true,
      daysRolledUp: 0,
    });
    expect(rebuilt).toBeGreaterThanOrEqual(RUN_QUERIES - 10);
    expect(marks()).toBe(days - rebuilt);
    // Oldest first.
    expect(
      count(
        database,
        "SELECT MIN(day) AS n FROM visit_rollup_dirty_days WHERE site_pk = 1",
      ),
    ).toBe(firstDay + rebuilt);

    const second = await runVisitRollups(created.env, NOW, {
      maxQueries: RUN_QUERIES,
    });

    expect(created.d1Queries() - firstQueries).toBeLessThanOrEqual(RUN_QUERIES);
    expect(second.summary).toMatchObject({
      daysRebuilt: days - rebuilt,
      workRemains: false,
    });
    expect(marks()).toBe(0);
    expect(
      count(
        database,
        "SELECT COUNT(*) AS n FROM visit_rollup_dirty_days WHERE site_pk = 2",
      ),
    ).toBe(1);
    expect(
      count(
        database,
        "SELECT COUNT(*) AS n FROM visit_daily_rollups WHERE site_pk = 1 AND views = 1",
      ),
    ).toBe(days);
  });

  it("keeps a failing site's days for its next run and rolls up the others", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [
      { siteId: "site-1", sitePk: 1 },
      { siteId: "site-2", sitePk: 2 },
    ]);
    insertVisit(database, {
      id: "one",
      sitePk: 1,
      startedAt: LATEST_DAY * DAY_MS,
    });
    insertVisit(database, {
      id: "two",
      sitePk: 2,
      startedAt: LATEST_DAY * DAY_MS,
    });
    const failing = createSqliteD1Database(database);
    const prepare = failing.prepare.bind(failing);
    const env = {
      DB: {
        ...failing,
        prepare(sql: string) {
          const statement = prepare(sql);
          return {
            bind: (...values: unknown[]) => {
              if (
                sql.includes("INSERT INTO visit_daily_dimension_rollups") &&
                values[0] === 1
              ) {
                throw new Error("D1 overloaded");
              }
              return statement.bind(...values);
            },
          };
        },
      },
    } as unknown as Env;
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const outcome = await runVisitRollups(env, NOW, { logger });

    expect(outcome.status).toBe("partial");
    expect(outcome.summary).toMatchObject({
      sitesFailed: 1,
      daysBackfilled: 1,
    });
    expect(logger.error).toHaveBeenCalledWith(
      "visit_rollups_site_failed",
      "Site rollup failed",
      { siteId: "site-1", error: "D1 overloaded" },
    );
    expect(state(database)).toEqual([
      {
        site_pk: 1,
        first_day: LATEST_DAY + 1,
        last_day: LATEST_DAY,
        backfilled: 0,
      },
      {
        site_pk: 2,
        first_day: LATEST_DAY,
        last_day: LATEST_DAY,
        backfilled: 1,
      },
    ]);
  });

  it("matches a day's raw page views across many sessions", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    insertVisits(
      database,
      syntheticVisits({
        siteId: "site-1",
        sitePk: 1,
        fromMs: (LATEST_DAY - 2) * DAY_MS,
        toMs: (LATEST_DAY + 1) * DAY_MS,
        peoplePerDay: 30,
        seed: 7,
      }),
    );

    await runVisitRollups(created.env, NOW);

    for (let day = LATEST_DAY - 2; day <= LATEST_DAY; day += 1) {
      const raw = database
        .prepare(
          `SELECT
             COUNT(*) AS views,
             COUNT(DISTINCT NULLIF(visitor_id, '')) AS visitors,
             COUNT(DISTINCT NULLIF(session_id, '')) AS sessions
           FROM visits WHERE started_at >= ? AND started_at < ?`,
        )
        .get(day * DAY_MS, (day + 1) * DAY_MS);
      expect(
        database
          .prepare(
            "SELECT views, visitors, sessions FROM visit_daily_rollups WHERE day = ?",
          )
          .get(day),
      ).toEqual(raw);
    }
  });
});

describe("the daily rollups migration", () => {
  it("turns the old hourly id lists into counts and keeps the hours", () => {
    const migrations = loadMigrations();
    const database = new DatabaseSync(":memory:");
    for (const migration of migrations.filter((item) => item.file < "0005")) {
      database.exec(migration.sql);
    }
    database.exec(`
      INSERT INTO site_identities (site_pk, site_id) VALUES (1, 's');
      INSERT INTO visit_hourly_aggregation_state (site_pk, site_id, aggregated_until_hour)
        VALUES (1, 's', ${24 * 3 + 5});
    `);
    const insert = database.prepare(
      `INSERT INTO visit_hourly_rollups (site_id, site_pk, hour_bucket, views,
         visitors, sessions, duration_ms_sum, duration_ms_count,
         visitor_set_json, session_counts_json, input_cutoff_ms)
       VALUES ('s', 1, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    );
    // Day 1: alice in hours 24 and 26 (one visit of 3 views), bob in hour 26
    // (a bounce). Day 2: alice again, in hour 49.
    insert.run(24, 2, 1, 1, 500, 1, '["alice"]', '[["s1",2]]');
    insert.run(26, 2, 2, 2, 700, 2, '["alice","bob"]', '[["s1",1],["s2",1]]');
    insert.run(49, 1, 1, 1, 0, 0, '["alice"]', '[["s3",1]]');

    database.exec(migrations.find((item) => item.file.startsWith("0005"))!.sql);

    expect(
      database
        .prepare("SELECT * FROM visit_hourly_rollups ORDER BY hour_bucket")
        .all(),
    ).toEqual([
      {
        site_pk: 1,
        hour_bucket: 24,
        views: 2,
        visitors: 1,
        first_visitors: 1,
        last_visitors: 0,
        sessions: 1,
        bounces: 0,
        duration_ms_sum: 500,
        duration_ms_count: 1,
      },
      {
        site_pk: 1,
        hour_bucket: 26,
        views: 2,
        visitors: 2,
        first_visitors: 1,
        last_visitors: 2,
        sessions: 1,
        bounces: 1,
        duration_ms_sum: 700,
        duration_ms_count: 2,
      },
      {
        site_pk: 1,
        hour_bucket: 49,
        views: 1,
        visitors: 1,
        first_visitors: 1,
        last_visitors: 1,
        sessions: 1,
        bounces: 1,
        duration_ms_sum: 0,
        duration_ms_count: 0,
      },
    ]);
    expect(
      database
        .prepare(
          "SELECT site_pk, legacy_hourly_until_day, backfilled, first_day > last_day AS empty FROM visit_rollup_state",
        )
        .all(),
    ).toEqual([
      { site_pk: 1, legacy_hourly_until_day: 2, backfilled: 0, empty: 1 },
    ]);
    expect(
      database
        .prepare(
          "SELECT task_key FROM scheduled_task_schedule_state WHERE task_key LIKE 'visit%'",
        )
        .all(),
    ).toEqual([{ task_key: "visit_rollups" }]);
    database.close();
  });

  it("rolls up a day whose page views retention deleted from its converted hours", async () => {
    const created = createRollupTestEnv();
    const database = created.database;
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const oldDay = LATEST_DAY - 3;
    database
      .prepare(
        `INSERT INTO visit_hourly_rollups (site_pk, hour_bucket, views, visitors,
           first_visitors, last_visitors, sessions, bounces, duration_ms_sum,
           duration_ms_count)
         VALUES (1, ?, 7, 3, 3, 3, 2, 1, 900, 4)`,
      )
      .run(oldDay * 24 + 5);
    database
      .prepare(
        `INSERT INTO visit_rollup_state (site_pk, first_day, last_day, legacy_hourly_until_day)
         VALUES (1, ?, ?, ?)`,
      )
      .run(LATEST_DAY + 1, LATEST_DAY, oldDay);
    insertVisit(database, { id: "recent", startedAt: LATEST_DAY * DAY_MS });

    await runVisitRollups(created.env, NOW);

    expect(
      database
        .prepare(
          "SELECT day, views, visitors, sessions, bounces FROM visit_daily_rollups ORDER BY day",
        )
        .all(),
    ).toEqual([
      { day: oldDay, views: 7, visitors: 3, sessions: 2, bounces: 1 },
      { day: LATEST_DAY, views: 1, visitors: 1, sessions: 1, bounces: 1 },
    ]);
    expect(state(database)[0]).toMatchObject({
      first_day: oldDay,
      backfilled: 1,
    });
    database.close();
  });
});
