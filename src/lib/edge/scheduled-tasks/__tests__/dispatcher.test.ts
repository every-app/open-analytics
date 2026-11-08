import { DatabaseSync } from "node:sqlite";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import { applyD1Limits } from "@/lib/db/__tests__/sqlite-d1";

const runScheduledTask = vi.hoisted(() => vi.fn());
const runVisitRollups = vi.hoisted(() => vi.fn());
const runNotificationTick = vi.hoisted(() => vi.fn());
const runDatabaseMaintenance = vi.hoisted(() => vi.fn());
const runAnalyticsRetention = vi.hoisted(() => vi.fn());

vi.mock("@/lib/edge/scheduled-tasks/runner", () => ({
  runScheduledTask,
}));
vi.mock("@/lib/edge/scheduled-tasks/visit-rollups", () => ({
  runVisitRollups,
}));
vi.mock("@/lib/notifications/edge/notification-task", () => ({
  runNotificationTick,
}));
vi.mock("@/lib/edge/scheduled-tasks/database-maintenance", () => ({
  runDatabaseMaintenance,
}));
vi.mock("@/lib/edge/scheduled-tasks/analytics-retention", () => ({
  runAnalyticsRetention,
}));

const { dispatchInternalScheduledTasks } =
  await import("@/lib/edge/scheduled-tasks/dispatcher");

class FakeD1Database {
  readonly db = applyD1Limits(new DatabaseSync(":memory:"));
  readonly calls: Array<{ method: "all" | "run"; sql: string }> = [];
  failNextUpdate = false;

  /**
   * The real schema, migration by migration; `afterBaseline` runs between the
   * baseline and the later migrations, as production data did. The baseline's
   * task rows are cleared unless that hook keeps them.
   */
  constructor(afterBaseline?: (db: DatabaseSync) => void) {
    const [baseline, ...later] = loadMigrations();
    this.db.exec(baseline!.sql);
    if (afterBaseline) afterBaseline(this.db);
    else this.db.exec("DELETE FROM scheduled_task_schedule_state");
    for (const migration of later) this.db.exec(migration.sql);
  }

  prepare(sql: string) {
    const database = this.db;
    return {
      bind: (...bindings: Array<string | number | null>) => ({
        all: async <T>() => {
          this.calls.push({ method: "all", sql });
          return {
            results: database
              .prepare(sql)
              .all(...bindings)
              .map((row) => ({ ...row }) as T),
          };
        },
        run: async () => {
          this.calls.push({ method: "run", sql });
          if (this.failNextUpdate && sql.includes("UPDATE")) {
            this.failNextUpdate = false;
            throw new Error("database unavailable");
          }
          return {
            meta: {
              changes: Number(database.prepare(sql).run(...bindings).changes),
            },
          };
        },
      }),
    };
  }

  close() {
    this.db.close();
  }
}

function observability() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as never;
}

function seed(d1: FakeD1Database, key: string, nextRunAt: number) {
  d1.db
    .prepare(
      "INSERT INTO scheduled_task_schedule_state (task_key, next_run_at) VALUES (?, ?)",
    )
    .run(key, nextRunAt);
}

function createEnv(d1: FakeD1Database) {
  return { DB: d1 as unknown as D1Database } as never;
}

describe("internal scheduled task dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runScheduledTask.mockResolvedValue(undefined);
  });

  it("runs only the tasks that are due on a tick", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    const nowSeconds = now / 1000;
    seed(d1, "notification_tick", nowSeconds - 1);
    seed(d1, "visit_rollups", nowSeconds + 1);
    seed(d1, "database_maintenance", nowSeconds + 1);

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(runScheduledTask).toHaveBeenCalledTimes(1);
    expect(runScheduledTask.mock.calls[0]?.[1]).toBe("notification_tick");
    d1.close();
  });

  it("runs interval and daily tasks when their schedules are due", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 0);
    const nowSeconds = now / 1000;
    seed(d1, "notification_tick", 0);
    seed(d1, "visit_rollups", 0);
    seed(d1, "database_maintenance", 0);
    seed(d1, "analytics_retention", 0);
    const env = createEnv(d1);

    await dispatchInternalScheduledTasks(env, now, observability());

    expect(runScheduledTask.mock.calls.map((call) => call[1])).toEqual([
      "notification_tick",
      "database_maintenance",
      "visit_rollups",
      "analytics_retention",
    ]);
    // The rollup runs for the tick's own time, not the clock's, with its
    // part of the invocation's queries.
    const logger = { info: vi.fn() };
    const rollupEnv = runScheduledTask.mock.calls[2]?.[0];
    await runScheduledTask.mock.calls[2]?.[2]({ logger });
    expect(runVisitRollups).toHaveBeenCalledWith(rollupEnv, now, {
      logger,
      maxQueries: expect.any(Number),
    });
    expect(
      d1.db
        .prepare(
          "SELECT task_key, next_run_at AS nextRunAt FROM scheduled_task_schedule_state ORDER BY task_key",
        )
        .all(),
    ).toEqual([
      { task_key: "analytics_retention", nextRunAt: nowSeconds + 3600 },
      {
        task_key: "database_maintenance",
        nextRunAt: Date.UTC(2026, 8, 1) / 1000,
      },
      { task_key: "notification_tick", nextRunAt: nowSeconds + 1800 },
      { task_key: "visit_rollups", nextRunAt: nowSeconds + 1800 },
    ]);
    expect(d1.calls.filter(({ method }) => method === "run")).toHaveLength(8);
    expect(
      d1.calls.filter(({ method }) => method === "all")[0]?.sql,
    ).not.toMatch(/ORDER BY/i);
    d1.close();
  });

  it("runs a task with work left again on the next minute's tick, and the rest on their schedules", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 0);
    const nowSeconds = now / 1000;
    for (const key of [
      "notification_tick",
      "visit_rollups",
      "database_maintenance",
      "analytics_retention",
    ]) {
      seed(d1, key, 0);
    }
    runScheduledTask.mockImplementation(async (_env, key: string) =>
      key === "visit_rollups" || key === "database_maintenance"
        ? { workRemains: true }
        : { workRemains: false },
    );

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(
      d1.db
        .prepare(
          "SELECT task_key, next_run_at AS nextRunAt FROM scheduled_task_schedule_state ORDER BY task_key",
        )
        .all(),
    ).toEqual([
      { task_key: "analytics_retention", nextRunAt: nowSeconds + 3600 },
      { task_key: "database_maintenance", nextRunAt: nowSeconds + 60 },
      { task_key: "notification_tick", nextRunAt: nowSeconds + 1800 },
      { task_key: "visit_rollups", nextRunAt: nowSeconds + 60 },
    ]);
    d1.close();
  });

  it("splits what the invocation has left between the backlog tasks due on a tick", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 0);
    seed(d1, "notification_tick", 0);
    seed(d1, "visit_rollups", 0);
    seed(d1, "analytics_retention", 0);
    const logger = { info: vi.fn() };
    runScheduledTask.mockImplementation(async (env, _key, handler) =>
      handler({ env, logger }),
    );
    runNotificationTick.mockImplementation(async ({ env }: { env: never }) => {
      const db = (env as { DB: D1Database }).DB;
      for (let index = 0; index < 100; index += 1) {
        await db.prepare("SELECT 1").bind().all();
      }
      return {};
    });
    runVisitRollups.mockResolvedValue({});
    runAnalyticsRetention.mockResolvedValue({});

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    // The notification tick gets what the invocation has left: all but the
    // due-task read and its claim and release.
    expect(runNotificationTick.mock.calls[0]?.[1]).toBe(999 - 1 - 2);
    // 999 for the dispatcher (the ingest sweep may make one): the due-task
    // read, the notification tick's claim, 100 queries and release, then
    // each backlog task's claim and release around its part.
    const left = 999 - 1 - 102;
    const rollups = Math.floor((left - 2) / 2);
    expect(runVisitRollups.mock.calls[0]?.[2]).toMatchObject({
      maxQueries: rollups,
    });
    expect(runAnalyticsRetention.mock.calls[0]?.[1]).toBe(left - 2 - 2);
    d1.close();
  });

  it("stops a task at its part of the queries and leaves later tasks due for the next tick", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 0);
    for (const key of [
      "notification_tick",
      "visit_rollups",
      "database_maintenance",
      "analytics_retention",
    ]) {
      seed(d1, key, 0);
    }
    runScheduledTask.mockImplementation(async (env, key: string) => {
      if (key !== "notification_tick") return {};
      // A task that would make queries forever is refused at its part.
      const db = (env as { DB: D1Database }).DB;
      for (;;) await db.prepare("SELECT 1").bind().all();
    });
    const logs = observability() as unknown as {
      warn: ReturnType<typeof vi.fn>;
    };

    await dispatchInternalScheduledTasks(createEnv(d1), now, logs as never);

    expect(runScheduledTask).toHaveBeenCalledTimes(1);
    expect(d1.calls.length).toBeLessThanOrEqual(999);
    expect(
      d1.db
        .prepare(
          "SELECT task_key, claim_token, next_run_at, last_error FROM scheduled_task_schedule_state ORDER BY task_key",
        )
        .all(),
    ).toEqual([
      expect.objectContaining({
        task_key: "analytics_retention",
        claim_token: null,
        next_run_at: 0,
      }),
      expect.objectContaining({
        task_key: "database_maintenance",
        claim_token: null,
        next_run_at: 0,
      }),
      {
        task_key: "notification_tick",
        claim_token: null,
        next_run_at: now / 1000 + 1800,
        last_error:
          "D1QueryBudgetExceededError: A task tried to make more than its 996 D1 queries.",
      },
      expect.objectContaining({
        task_key: "visit_rollups",
        claim_token: null,
        next_run_at: 0,
      }),
    ]);
    expect(logs.warn).toHaveBeenCalledWith("scheduled_task.deferred", {
      taskKey: "visit_rollups",
    });
    d1.close();
  });

  it("records a failed task's error and still schedules its next run", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 0);
    seed(d1, "analytics_retention", 0);
    runScheduledTask.mockRejectedValueOnce(new Error("D1 timed out"));
    const logs = observability() as unknown as {
      error: ReturnType<typeof vi.fn>;
    };

    await dispatchInternalScheduledTasks(createEnv(d1), now, logs as never);

    expect(runScheduledTask.mock.calls[0]?.[1]).toBe("analytics_retention");
    expect(logs.error).toHaveBeenCalledWith("scheduled_task.handler_failed");
    expect(
      d1.db
        .prepare(
          "SELECT claim_token, last_error, next_run_at FROM scheduled_task_schedule_state WHERE task_key = ?",
        )
        .get("analytics_retention"),
    ).toEqual({
      claim_token: null,
      last_error: "Error: D1 timed out",
      next_run_at: now / 1000 + 3600,
    });
    d1.close();
  });

  it("allows only one concurrent tick to claim the same task", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    seed(d1, "notification_tick", 0);

    await Promise.all([
      dispatchInternalScheduledTasks(createEnv(d1), now, observability()),
      dispatchInternalScheduledTasks(createEnv(d1), now, observability()),
    ]);

    expect(runScheduledTask).toHaveBeenCalledTimes(1);
    const attemptedClaims = d1.calls.filter(
      ({ method, sql }) =>
        method === "run" && sql.includes('SET "claim_token" = ?'),
    );
    expect(attemptedClaims).toHaveLength(2);
    expect(
      d1.calls.filter(
        ({ method, sql }) => method === "run" && sql.includes("UPDATE"),
      ),
    ).toHaveLength(3);
    d1.close();
  });

  it("replaces an expired claim with one conditional update", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    const nowSeconds = now / 1000;
    seed(d1, "notification_tick", 0);
    d1.db
      .prepare(
        "UPDATE scheduled_task_schedule_state SET claim_token = ?, claim_expires_at = ? WHERE task_key = ?",
      )
      .run("expired-token", nowSeconds - 1, "notification_tick");
    runScheduledTask.mockImplementationOnce(async () => {
      const row = d1.db
        .prepare(
          "SELECT claim_token, claim_expires_at FROM scheduled_task_schedule_state WHERE task_key = ?",
        )
        .get("notification_tick") as {
        claim_token: string;
        claim_expires_at: number;
      };
      expect(row.claim_token).not.toBe("expired-token");
      expect(row.claim_expires_at).toBe(nowSeconds + 6 * 60 * 60);
    });

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    const claimUpdates = d1.calls.filter(
      ({ method, sql }) =>
        method === "run" &&
        sql.includes("UPDATE") &&
        sql.includes("claim_expires_at") &&
        sql.includes("claim_token"),
    );
    expect(claimUpdates).toHaveLength(2);
    expect(runScheduledTask).toHaveBeenCalledTimes(1);
    d1.close();
  });

  it("fails closed when the atomic claim update errors", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    seed(d1, "notification_tick", 0);
    d1.failNextUpdate = true;

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(runScheduledTask).not.toHaveBeenCalled();
    expect(
      d1.calls.filter(
        ({ method, sql }) => method === "run" && sql.includes("UPDATE"),
      ),
    ).toHaveLength(1);
    d1.close();
  });

  it("does not release a claim after ownership changes", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    seed(d1, "notification_tick", 0);
    runScheduledTask.mockImplementationOnce(async () => {
      d1.db
        .prepare(
          "UPDATE scheduled_task_schedule_state SET claim_token = ? WHERE task_key = ?",
        )
        .run("replacement-owner", "notification_tick");
    });

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(
      d1.db
        .prepare(
          "SELECT claim_token, last_run_at, next_run_at FROM scheduled_task_schedule_state WHERE task_key = ?",
        )
        .get("notification_tick"),
    ).toEqual({
      claim_token: "replacement-owner",
      last_run_at: null,
      next_run_at: 0,
    });
    d1.close();
  });

  it("runs a task that was turned off before tasks always ran", async () => {
    // Production could turn a task off; its next_run_at then stayed due.
    const d1 = new FakeD1Database((db) => {
      db.exec(`
        DELETE FROM scheduled_task_schedule_state
        WHERE task_key <> 'notification_tick';
        UPDATE scheduled_task_schedule_state
        SET enabled = 0
        WHERE task_key = 'notification_tick';
      `);
    });
    const now = Date.UTC(2026, 7, 31, 10, 30);

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(runScheduledTask).toHaveBeenCalledTimes(1);
    expect(runScheduledTask.mock.calls[0]?.[1]).toBe("notification_tick");
    d1.close();
  });

  it("does not issue a claim update for a task that is not due", async () => {
    const d1 = new FakeD1Database();
    const now = Date.UTC(2026, 7, 31, 10, 30);
    seed(d1, "notification_tick", now / 1000 + 1);

    await dispatchInternalScheduledTasks(createEnv(d1), now, observability());

    expect(runScheduledTask).not.toHaveBeenCalled();
    expect(d1.calls.filter(({ method }) => method === "run")).toHaveLength(0);
    d1.close();
  });
});
