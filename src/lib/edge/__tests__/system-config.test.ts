import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createDatabaseRuntime, type DatabaseRuntime } from "@/lib/db";
import {
  createSqliteD1Database,
  type SqliteD1Trace,
} from "@/lib/db/__tests__/sqlite-d1";
import {
  deleteConfig,
  readConfig,
  upsertConfig,
} from "@/lib/edge/system-config";

function sqliteDb(
  database: DatabaseSync,
  trace: SqliteD1Trace,
): DatabaseRuntime {
  return createDatabaseRuntime(createSqliteD1Database(database, trace));
}

describe("system config typed DAL", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it("reads missing, malformed, and valid JSON values", async () => {
    database = createMigratedDatabase();
    const trace = { preparedSql: [], bindings: [] } satisfies SqliteD1Trace;
    const db = sqliteDb(database, trace);
    database
      .prepare("INSERT INTO configs (config_key, value_json) VALUES (?, ?)")
      .run("malformed", "{");
    database
      .prepare("INSERT INTO configs (config_key, value_json) VALUES (?, ?)")
      .run("valid", '{"enabled":true}');

    await expect(readConfig(db, "missing")).resolves.toBeNull();
    await expect(readConfig(db, "malformed")).resolves.toBeNull();
    await expect(readConfig(db, "valid")).resolves.toEqual({ enabled: true });
    expect(trace.preparedSql).toHaveLength(3);
  });

  it("inserts, updates, and deletes a config without changing its API", async () => {
    database = createMigratedDatabase();
    const trace = { preparedSql: [], bindings: [] } satisfies SqliteD1Trace;
    const db = sqliteDb(database, trace);

    await upsertConfig(db, "feature", { enabled: false });
    await upsertConfig(db, "feature", { enabled: true });

    await expect(readConfig(db, "feature")).resolves.toEqual({
      enabled: true,
    });
    const timestamps = database
      .prepare(
        "SELECT created_at, updated_at FROM configs WHERE config_key = ?",
      )
      .get("feature");
    expect(timestamps).toMatchObject({ created_at: expect.any(Number) });

    await deleteConfig(db, "feature");
    await expect(readConfig(db, "feature")).resolves.toBeNull();
    expect(trace.preparedSql).toHaveLength(5);
  });
});
