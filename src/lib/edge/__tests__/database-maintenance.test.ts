import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { runDatabaseMaintenance } from "@/lib/edge/scheduled-tasks/database-maintenance";

class FakeD1Database {
  readonly db = new DatabaseSync(":memory:");

  prepare(sql: string) {
    return {
      bind: (...bindings: Array<string | number | null>) => ({
        run: async () => ({
          meta: {
            changes: Number(this.db.prepare(sql).run(...bindings).changes),
          },
        }),
      }),
      run: async () => ({
        meta: { changes: Number(this.db.prepare(sql).run().changes) },
      }),
    };
  }

  close() {
    this.db.close();
  }
}

function context(d1: FakeD1Database) {
  const logger = {
    debug: async () => undefined,
    info: async () => undefined,
    warn: async () => undefined,
    error: async () => undefined,
  };
  return {
    env: { DB: d1 as unknown as D1Database },
    startedAt: Date.now(),
    logger,
  } as never;
}

describe("database maintenance", () => {
  it("deletes expired notifications in batches and keeps null/future ones", async () => {
    const d1 = new FakeD1Database();
    d1.db.exec(
      "CREATE TABLE notification_messages (id TEXT PRIMARY KEY, expires_at INTEGER);",
    );
    const now = Math.floor(Date.now() / 1000);
    const insert = d1.db.prepare(
      "INSERT INTO notification_messages (id, expires_at) VALUES (?, ?)",
    );
    for (let index = 0; index < 105; index += 1) {
      insert.run(`expired-${index}`, now - 1);
    }
    insert.run("future", now + 100);
    insert.run("no-expiry", null);

    const result = await runDatabaseMaintenance(context(d1));

    expect(result).toEqual({
      status: "success",
      summary: { notificationsDeleted: 105, workRemains: false },
      workRemains: false,
    });
    expect(
      d1.db
        .prepare("SELECT id FROM notification_messages ORDER BY id")
        .all()
        .map((row) => row.id),
    ).toEqual(["future", "no-expiry"]);
    d1.close();
  });

  it("deletes batch after batch within its queries and says when expired notifications are left", async () => {
    const d1 = new FakeD1Database();
    d1.db.exec(
      "CREATE TABLE notification_messages (id TEXT PRIMARY KEY, expires_at INTEGER);",
    );
    const now = Math.floor(Date.now() / 1000);
    const insert = d1.db.prepare(
      "INSERT INTO notification_messages (id, expires_at) VALUES (?, ?)",
    );
    for (let index = 0; index < 450; index += 1) {
      insert.run(`expired-${index}`, now - 1);
    }
    const left = () =>
      Number(
        (
          d1.db
            .prepare("SELECT COUNT(*) AS n FROM notification_messages")
            .get() as { n: number }
        ).n,
      );

    // Three deletes of 100, then the statistics refresh.
    const first = await runDatabaseMaintenance(context(d1), 4);
    expect(first).toMatchObject({
      summary: { notificationsDeleted: 300 },
      workRemains: true,
    });
    expect(left()).toBe(150);

    const second = await runDatabaseMaintenance(context(d1), 4);
    expect(second).toMatchObject({
      summary: { notificationsDeleted: 150 },
      workRemains: false,
    });
    expect(left()).toBe(0);
    d1.close();
  });
});
