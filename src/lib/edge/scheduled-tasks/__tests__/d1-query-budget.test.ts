import { DatabaseSync } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

import { createDatabaseRuntime } from "@/lib/db";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import {
  BudgetedDatabase,
  countD1Queries,
  D1QueryBudget,
  D1QueryBudgetExceededError,
} from "@/lib/edge/scheduled-tasks/d1-query-budget";

describe("a task's D1 query budget", () => {
  it("counts a batch of several statements as one query and refuses queries past its limit", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const db = new BudgetedDatabase(
      createDatabaseRuntime(createSqliteD1Database(sqlite)),
      4,
    );

    await db.run({ sql: "CREATE TABLE t (n INTEGER)" });
    await db.batch([
      { sql: "INSERT INTO t VALUES (1)" },
      { sql: "INSERT INTO t VALUES (2)" },
      { sql: "INSERT INTO t VALUES (3)" },
    ]);
    expect(await db.first({ sql: "SELECT COUNT(*) AS n FROM t" })).toEqual({
      n: 3,
    });
    expect((await db.all({ sql: "SELECT n FROM t" })).results).toHaveLength(3);

    expect(db.queries).toBe(4);
    expect(db.queriesLeft).toBe(0);
    expect(() => db.run({ sql: "DELETE FROM t" })).toThrow(
      D1QueryBudgetExceededError,
    );
    expect(() => db.exec("DELETE FROM t")).toThrow(
      "A task tried to make more than its 4 D1 queries.",
    );
    sqlite.close();
  });

  it("has no queries left once its queries have kept D1 busy for its time", async () => {
    vi.useFakeTimers();
    try {
      const slowQuery = async () => {
        vi.setSystemTime(Date.now() + 2_000);
        return { success: true, results: [], meta: {} } as unknown as D1Result;
      };
      const db = new BudgetedDatabase(
        {
          all: slowQuery,
          first: async () => null,
          run: slowQuery,
          batch: async () => [await slowQuery()],
          exec: async () => ({ count: 0, duration: 0 }),
        } as never,
        100,
        3_000,
      );

      await db.run({ sql: "SELECT 1" });
      expect(db.queriesLeft).toBe(99);
      await db.batch([{ sql: "SELECT 1" }, { sql: "SELECT 2" }]);
      expect(db.queries).toBe(2);
      expect(db.queriesLeft).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("an invocation's D1 queries", () => {
  it("counts each query a D1 binding makes, a batch as one, and refuses one past the limit", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const budget = new D1QueryBudget(5);
    const d1 = countD1Queries(createSqliteD1Database(sqlite), budget);

    await d1.prepare("CREATE TABLE t (n INTEGER)").run();
    await d1.batch([
      d1.prepare("INSERT INTO t VALUES (?)").bind(1),
      d1.prepare("INSERT INTO t VALUES (?)").bind(2),
    ]);
    expect(
      await d1
        .prepare("SELECT COUNT(*) AS n FROM t WHERE n > ?")
        .bind(0)
        .first(),
    ).toEqual({ n: 2 });
    expect((await d1.prepare("SELECT n FROM t").all()).results).toHaveLength(2);
    expect(budget.used).toBe(4);

    await d1.prepare("DELETE FROM t WHERE n = 1").run();
    expect(budget.left).toBe(0);
    await expect(d1.prepare("SELECT n FROM t").all()).rejects.toThrow(
      D1QueryBudgetExceededError,
    );
    await expect(d1.batch([])).rejects.toThrow(D1QueryBudgetExceededError);
    // The refused queries never reached the database.
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM t").get()).toEqual({
      n: 1,
    });
    sqlite.close();
  });

  it("counts a part's queries against the whole, and stops at the smaller", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const invocation = new D1QueryBudget(10);
    const task = invocation.child(3);
    const d1 = countD1Queries(createSqliteD1Database(sqlite), task);

    await d1.prepare("CREATE TABLE t (n INTEGER)").run();
    await d1.prepare("INSERT INTO t VALUES (1)").run();
    expect(task.used).toBe(2);
    expect(invocation.used).toBe(2);
    expect(task.left).toBe(1);

    await d1.prepare("SELECT n FROM t").first();
    await expect(d1.prepare("SELECT n FROM t").all()).rejects.toThrow(
      "A task tried to make more than its 3 D1 queries.",
    );
    expect(invocation.used).toBe(3);
    expect(invocation.left).toBe(7);

    // A part never has more than the whole has left.
    const wholeLeft = new D1QueryBudget(2);
    const part = wholeLeft.child(50);
    expect(part.left).toBe(2);
    const exec = vi.fn(async () => ({ count: 1, duration: 0 }));
    const counted = countD1Queries({ exec } as unknown as D1Database, part);
    await counted.exec("PRAGMA optimize");
    expect(exec).toHaveBeenCalledWith("PRAGMA optimize");
    expect(wholeLeft.used).toBe(1);
    sqlite.close();
  });
});
