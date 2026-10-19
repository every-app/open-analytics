import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { readConfig, upsertConfig } from "@/lib/edge/system-config";
import type { Env } from "@/lib/edge/types";
import {
  mergeNotificationPreferencesUpdate,
  updateUserNotificationPreferences,
} from "@/lib/notifications/edge/preferences";
import { safeJsonStringify } from "@/lib/notifications/json";

const databases = new Set<DatabaseSync>();

function createFixture() {
  const database = createMigratedDatabase();
  database.function("unixepoch", () => 1_800_000_000);
  databases.add(database);
  database
    .prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
    .run("member-1", "member@example.test", "Member One");

  return {
    database,
    env: { DB: createSqliteD1Database(database) } as Env,
  };
}

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
});

describe("typed DAL query differential checks", () => {
  it("matches the reference config lookup", async () => {
    const { database, env } = createFixture();
    database
      .prepare("INSERT INTO configs (config_key, value_json) VALUES (?, ?)")
      .run("feature-flags", '{"enabled":true}');

    const legacy = database
      .prepare("SELECT value_json FROM configs WHERE config_key = ? LIMIT 1")
      .get("feature-flags") as { value_json: string };
    await expect(readConfig(env, "feature-flags")).resolves.toEqual(
      JSON.parse(legacy.value_json),
    );
  });
});

describe("typed DAL mutation differential checks", () => {
  it("matches config upsert state", async () => {
    const legacy = createFixture();
    const compiled = createFixture();
    for (const { database } of [legacy, compiled]) {
      database
        .prepare(
          "INSERT INTO configs (config_key, value_json, created_at, updated_at) VALUES (?, ?, ?, ?)",
        )
        .run("feature-flags", '{"enabled":false}', 100, 200);
    }

    legacy.database
      .prepare(
        `INSERT INTO configs (config_key, value_json, created_at, updated_at)
        VALUES (?, ?, unixepoch(), unixepoch())
        ON CONFLICT(config_key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = unixepoch()`,
      )
      .run("feature-flags", '{"enabled":true}');
    await upsertConfig(compiled.env, "feature-flags", { enabled: true });

    const legacyRow = legacy.database
      .prepare(
        "SELECT value_json, created_at, updated_at FROM configs WHERE config_key = ?",
      )
      .get("feature-flags") as Record<string, unknown>;
    const compiledRow = compiled.database
      .prepare(
        "SELECT value_json, created_at, updated_at FROM configs WHERE config_key = ?",
      )
      .get("feature-flags") as Record<string, unknown>;
    expect(compiledRow).toEqual(legacyRow);
  });

  it("matches notification preference merge and stored state", async () => {
    const legacy = createFixture();
    const compiled = createFixture();
    for (const { database } of [legacy, compiled]) {
      database
        .prepare(
          "UPDATE users SET notification_preferences_json = ? WHERE id = ?",
        )
        .run(
          JSON.stringify({
            email: false,
            webPush: true,
            attention: {
              reportsCreateUnread: true,
              milestonesCreateUnread: false,
              alertsCreateUnread: true,
            },
          }),
          "member-1",
        );
    }
    const update = {
      email: true,
      webPush: false,
      attention: { milestonesCreateUnread: true },
    };
    const current = legacy.database
      .prepare(
        "SELECT notification_preferences_json AS preferencesJson FROM users WHERE id = ? LIMIT 1",
      )
      .get("member-1") as { preferencesJson: string };
    const next = mergeNotificationPreferencesUpdate(
      current.preferencesJson,
      update,
    );
    legacy.database
      .prepare(
        "UPDATE users SET notification_preferences_json = ?, updated_at = unixepoch() WHERE id = ?",
      )
      .run(safeJsonStringify(next), "member-1");
    await updateUserNotificationPreferences(compiled.env, {
      userId: "member-1",
      preferences: update,
    });

    const legacyRow = legacy.database
      .prepare(
        "SELECT notification_preferences_json, updated_at FROM users WHERE id = ?",
      )
      .get("member-1");
    const compiledRow = compiled.database
      .prepare(
        "SELECT notification_preferences_json, updated_at FROM users WHERE id = ?",
      )
      .get("member-1");
    expect(compiledRow).toEqual(legacyRow);
  });
});
