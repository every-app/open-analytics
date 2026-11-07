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
      summary: { notificationsDeleted: 105 },
    });
    expect(
      d1.db
        .prepare("SELECT id FROM notification_messages ORDER BY id")
        .all()
        .map((row) => row.id),
    ).toEqual(["future", "no-expiry"]);
    d1.close();
  });
});
