import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import { createDatabaseRuntime } from "@/lib/db";
import {
  createRollupTestEnv,
  DAY_MS,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { MARK_ROLLED_UP_DAY_SQL } from "@/lib/edge/ingest/sql";
import {
  deleteExpiredData,
  RETENTION_BATCH_ROWS,
  runAnalyticsRetention,
} from "@/lib/edge/scheduled-tasks/analytics-retention";
import { BudgetedDatabase } from "@/lib/edge/scheduled-tasks/d1-query-budget";
import type { ScheduledTaskContext } from "@/lib/edge/scheduled-tasks/runner";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import type { Env } from "@/lib/edge/types";

const NOW = Date.UTC(2026, 10, 6, 13);
const TODAY = Math.floor(NOW / DAY_MS);
/** Retention keeps 30 days of page views: days before this are expired. */
const CUTOFF_DAY = TODAY - 30;

/** `count` page views of a site on a UTC day, each its own visitor and visit. */
function insertPageViews(
  database: DatabaseSync,
  sitePk: number,
  day: number,
  count: number,
  prefix: string,
): void {
  database.exec(`
    WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${count})
    INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id,
      status, started_at, last_activity_at, duration_ms, pathname, hostname)
    SELECT
      '${prefix}-${sitePk}-${day}-' || i, ${sitePk}, 'site-${sitePk}',
      '${prefix}-visitor-' || i, '${prefix}-session-' || i, 'complete',
      ${day * DAY_MS} + i, ${day * DAY_MS} + i, 1000, '/', 'example.com'
    FROM n
  `);
}

/** A page view of a rolled-up day flushed late: the flush marks the day. */
function insertLatePageView(
  database: DatabaseSync,
  sitePk: number,
  day: number,
): void {
  insertPageViews(database, sitePk, day, 1, "late");
  database.prepare(MARK_ROLLED_UP_DAY_SQL).run(sitePk, day);
}

function dayRollup(database: DatabaseSync, sitePk: number, day: number) {
  return database
    .prepare(
      `SELECT views, visitors, sessions, bounces, duration_ms_sum
       FROM visit_daily_rollups WHERE site_pk = ? AND day = ?`,
    )
    .get(sitePk, day);
}

function count(database: DatabaseSync, sql: string, ...values: number[]) {
  return Number(
    (database.prepare(sql).get(...values) as { n: number | null }).n ?? 0,
  );
}

function pageViewsOn(database: DatabaseSync, sitePk: number, day: number) {
  return count(
    database,
    "SELECT COUNT(*) AS n FROM visits WHERE site_pk = ? AND started_at >= ? AND started_at < ?",
    sitePk,
    day * DAY_MS,
    (day + 1) * DAY_MS,
  );
}

function runRetention(database: DatabaseSync, env: Env) {
  database
    .prepare(
      "INSERT OR REPLACE INTO configs (config_key, value_json) VALUES ('scheduled-task-retention', ?)",
    )
    .run(JSON.stringify({ analyticsDetailDays: TODAY - CUTOFF_DAY }));
  return runAnalyticsRetention({
    env,
    logger: { info: vi.fn() },
  } as unknown as ScheduledTaskContext);
}

describe("rollup rebuilds and retention", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    vi.useRealTimers();
  });

  function setup(sitePks: readonly number[]) {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    const created = createRollupTestEnv();
    database = created.database;
    seedSites(
      database,
      sitePks.map((sitePk) => ({ siteId: `site-${sitePk}`, sitePk })),
    );
    return created;
  }

  it("rebuilds a marked expired day before retention deletes it, so its rollups keep every page view", async () => {
    const { database, env } = setup([1]);
    const day = CUTOFF_DAY - 10;
    insertPageViews(database, 1, day, 2, "early");
    await runVisitRollups(env, NOW);
    expect(dayRollup(database, 1, day)).toMatchObject({ views: 2 });

    insertLatePageView(database, 1, day);
    await runRetention(database, env);
    await runVisitRollups(env, NOW);
    await runRetention(database, env);

    expect(pageViewsOn(database, 1, day)).toBe(0);
    expect(dayRollup(database, 1, day)).toEqual({
      views: 3,
      visitors: 3,
      sessions: 3,
      bounces: 3,
      duration_ms_sum: 3000,
    });
  });

  it("keeps the rollups of a day retention has started deleting when a late page view marks it", async () => {
    const { database, env } = setup([1]);
    const day = CUTOFF_DAY - 10;
    const pageViews = RETENTION_BATCH_ROWS + 500;
    insertPageViews(database, 1, day, pageViews, "early");
    await runVisitRollups(env, NOW);
    const rolledUp = dayRollup(database, 1, day);
    const hourlyViews = () =>
      count(
        database,
        "SELECT SUM(views) AS n FROM visit_hourly_rollups WHERE site_pk = 1 AND hour_bucket >= ? AND hour_bucket < ?",
        day * 24,
        (day + 1) * 24,
      );
    expect(rolledUp).toMatchObject({ views: pageViews });

    // Retention's first round deletes a batch of the day's page views.
    const db = new BudgetedDatabase(createDatabaseRuntime(env.DB), 2);
    await deleteExpiredData(db, CUTOFF_DAY);
    expect(pageViewsOn(database, 1, day)).toBe(500);
    insertLatePageView(database, 1, day);
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const outcome = await runVisitRollups(env, NOW, {
      logger: logger as never,
    });

    expect(outcome.summary).toMatchObject({ daysRebuilt: 0, daysKept: 1 });
    expect(logger.warn).toHaveBeenCalledWith(
      "visit_rollups_day_kept",
      expect.any(String),
      { siteId: "site-1", day },
    );
    expect(dayRollup(database, 1, day)).toEqual(rolledUp);
    expect(hourlyViews()).toBe(pageViews);
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visit_rollup_dirty_days"),
    ).toBe(0);

    // With the mark gone, retention deletes the rest of the day.
    await runRetention(database, env);
    expect(pageViewsOn(database, 1, day)).toBe(0);
    expect(dayRollup(database, 1, day)).toEqual(rolledUp);
  });

  it("holds back a site's retention from its marked day until the next rollup run rebuilds it", async () => {
    const { database, env } = setup([1, 2]);
    const days = [CUTOFF_DAY - 12, CUTOFF_DAY - 11, CUTOFF_DAY - 10];
    for (const sitePk of [1, 2]) {
      for (const day of days)
        insertPageViews(database, sitePk, day, 2, "early");
    }
    await runVisitRollups(env, NOW);
    const [before, marked, after] = days as [number, number, number];
    insertLatePageView(database, 1, marked);

    await runRetention(database, env);

    // Site 1 keeps the marked day and the days after it; site 2 is unaffected.
    expect(days.map((day) => pageViewsOn(database, 1, day))).toEqual([0, 3, 2]);
    expect(days.map((day) => pageViewsOn(database, 2, day))).toEqual([0, 0, 0]);

    const rollups = await runVisitRollups(env, NOW);
    expect(rollups.summary).toMatchObject({ daysRebuilt: 1, daysKept: 0 });

    await runRetention(database, env);

    expect(days.map((day) => pageViewsOn(database, 1, day))).toEqual([0, 0, 0]);
    expect(
      [before, marked, after].map(
        (day) => (dayRollup(database, 1, day) as { views: number }).views,
      ),
    ).toEqual([2, 3, 2]);
    expect(
      count(
        database,
        "SELECT retention_reached_day AS n FROM visit_rollup_state WHERE site_pk = 1",
      ),
    ).toBe(after);
  });

  it("rebuilds the channels of rolled-up days retention hasn't reached when their page views' channels change", async () => {
    const { database, env } = setup([1]);
    const [reached, open] = [CUTOFF_DAY + 1, CUTOFF_DAY + 2];
    for (const day of [reached, open]) {
      insertPageViews(database, 1, day, 2, "hn");
    }
    database.exec(
      "UPDATE visits SET referrer_host = 'news.ycombinator.com', channel = 'social' WHERE site_pk = 1",
    );
    await runVisitRollups(env, NOW);
    // The days as the old rules rolled them up, with retention at the first.
    database.exec(
      "UPDATE visit_daily_dimension_rollups SET value = 'referral' WHERE dimension = 'source.channel'",
    );
    database
      .prepare(
        "UPDATE visit_rollup_state SET retention_reached_day = ? WHERE site_pk = 1",
      )
      .run(reached);
    const channels = () =>
      database
        .prepare(
          `SELECT day, value FROM visit_daily_dimension_rollups
           WHERE site_pk = 1 AND dimension = 'source.channel' ORDER BY day`,
        )
        .all();

    database.exec(
      loadMigrations().find(
        (migration) => migration.file === "0006_rebuild_channel_rollups.sql",
      )!.sql,
    );

    expect(
      database
        .prepare("SELECT site_pk, day FROM visit_rollup_dirty_days")
        .all(),
    ).toEqual([{ site_pk: 1, day: open }]);
    await runVisitRollups(env, NOW);
    expect(channels()).toEqual([
      { day: reached, value: "referral" },
      { day: open, value: "social" },
    ]);
    expect(
      count(database, "SELECT COUNT(*) AS n FROM visit_rollup_dirty_days"),
    ).toBe(0);
  });
});
