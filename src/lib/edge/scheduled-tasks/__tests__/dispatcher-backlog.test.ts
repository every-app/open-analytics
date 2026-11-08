import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createRollupTestEnv,
  DAY_MS,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { D1_QUERIES_PER_INVOCATION } from "@/lib/edge/scheduled-tasks/d1-query-budget";
import { dispatchInternalScheduledTasks } from "@/lib/edge/scheduled-tasks/dispatcher";
import { latestCompleteDay } from "@/lib/edge/scheduled-tasks/visit-rollups";

const START = Date.UTC(2026, 10, 6, 13, 0);
const MINUTE_MS = 60_000;
const LIVE_SITES = 3;
const DAYS = 300;
// Enough that their purges, a query per step each, outlast what a tick has
// left after the rollups.
const DELETED_SITES = 52;

function observability() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as never;
}

function count(database: DatabaseSync, sql: string): number {
  return Number((database.prepare(sql).get() as { n: number }).n);
}

interface Schedule {
  task_key: string;
  next_run_at: number;
  last_run_at: number | null;
  last_error: string | null;
}

function schedules(database: DatabaseSync): Record<string, Schedule> {
  const rows = database
    .prepare(
      "SELECT task_key, next_run_at, last_run_at, last_error FROM scheduled_task_schedule_state",
    )
    .all() as unknown as Schedule[];
  return Object.fromEntries(rows.map((row) => [row.task_key, row]));
}

/**
 * Live sites with a backfill of `DAYS` days each, more than a tick's queries
 * can roll up, and deleted sites whose purge takes more queries than a tick
 * has left after the rollups.
 */
function seedBacklogs(database: DatabaseSync): void {
  const live = Array.from({ length: LIVE_SITES }, (_, index) => ({
    siteId: `live-${index + 1}`,
    sitePk: index + 1,
  }));
  const deleted = Array.from({ length: DELETED_SITES }, (_, index) => ({
    siteId: `deleted-${index + 1}`,
    sitePk: LIVE_SITES + index + 1,
  }));
  seedSites(database, [...live, ...deleted]);
  const latestDay = latestCompleteDay(START);
  const visit = database.prepare(
    `INSERT INTO visits (visit_id, site_pk, visitor_id, session_id,
       status, started_at, last_activity_at, duration_ms, pathname, hostname)
     VALUES (?, ?, 'v', 's', 'complete', ?, ?, 1000, '/', 'example.com')`,
  );
  for (const site of [...live, ...deleted]) {
    const days = site.siteId.startsWith("live") ? DAYS : 1;
    for (let day = 0; day < days; day += 1) {
      const at = (latestDay - day) * DAY_MS + 3_600_000;
      visit.run(`${site.siteId}-${day}`, site.sitePk, at, at);
    }
  }
  database.prepare(`DELETE FROM sites WHERE id LIKE 'deleted-%'`).run();
}

describe("cron ticks with backlogs", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    vi.useRealTimers();
    database?.close();
    database = undefined;
  });

  it("never make more than the invocation's D1 queries, and drain the backlogs tick after tick", async () => {
    const created = createRollupTestEnv();
    database = created.database;
    seedBacklogs(database);
    const ticks: number[] = [];
    let now = START;

    for (let tick = 0; tick < 20; tick += 1) {
      vi.useFakeTimers({ now, toFake: ["Date"] });
      const before = created.d1Queries();
      await dispatchInternalScheduledTasks(created.env, now, observability());
      ticks.push(created.d1Queries() - before);
      const due = schedules(database);
      const drained =
        due.visit_rollups!.next_run_at > now / 1000 + 60 &&
        due.analytics_retention!.next_run_at > now / 1000 + 60;
      if (drained) break;
      // Work left runs on the next minute's tick.
      expect(
        Math.min(
          due.visit_rollups!.next_run_at,
          due.analytics_retention!.next_run_at,
        ),
      ).toBe(now / 1000 + 60);
      now += MINUTE_MS;
    }

    for (const queries of ticks) {
      expect(queries).toBeLessThanOrEqual(D1_QUERIES_PER_INVOCATION);
    }
    // The ticks with work left use what the invocation has, not a share.
    expect(ticks[0]).toBeGreaterThan(0.95 * D1_QUERIES_PER_INVOCATION);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.length).toBeLessThan(10);

    const due = schedules(database);
    expect(Object.values(due).map((row) => row.last_error)).toEqual([
      null,
      null,
      null,
      null,
    ]);
    // Done: each backlog task is back on its own schedule.
    const lastTick = now / 1000;
    expect(due.visit_rollups!.next_run_at).toBe(
      (Math.floor(lastTick / 1800) + 1) * 1800,
    );
    expect(due.analytics_retention!.next_run_at).toBe(
      (Math.floor(lastTick / 3600) + 1) * 3600,
    );
    // The other tasks ran once, on their own schedules, not every minute.
    expect(due.notification_tick!.last_run_at).toBe(START / 1000);
    expect(due.database_maintenance!.last_run_at).toBe(START / 1000);

    expect(
      count(
        database,
        "SELECT COUNT(*) AS n FROM visit_rollup_state WHERE backfilled = 1",
      ),
    ).toBe(LIVE_SITES);
    expect(
      count(database, "SELECT SUM(views) AS n FROM visit_daily_rollups"),
    ).toBe(LIVE_SITES * DAYS);
    expect(
      count(
        database,
        `SELECT COUNT(*) AS n FROM visits WHERE visit_id LIKE 'deleted-%'`,
      ),
    ).toBe(0);
  }, 60_000);
});
