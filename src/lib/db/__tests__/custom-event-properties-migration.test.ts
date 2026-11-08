import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";

const MIGRATION = "0015_custom_event_properties.sql";

function databaseBefore(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  for (const migration of loadMigrations()) {
    if (migration.file >= MIGRATION) break;
    database.exec(migration.sql);
  }
  return database;
}

describe(MIGRATION, () => {
  it("names properties by key in stored goals and saved filters", () => {
    const database = databaseBefore();
    database.exec(`
      INSERT INTO teams (id, name, slug) VALUES ('t', 'Team', 't');
      INSERT INTO users (id, email) VALUES ('u', 'u@example.com');
      INSERT INTO sites (id, team_id, name, domain) VALUES ('s', 't', 'Site', 'example.com');
    `);
    database
      .prepare(
        `INSERT INTO analysis_definitions (id, site_id, kind, name, config_json)
         VALUES ('goal', 's', 'goal', 'Pro', ?)`,
      )
      .run(
        JSON.stringify({
          filterDslVersion: 1,
          filterDsl:
            'event.name eq "Signup" AND event.payload("/plan") eq "pro"',
        }),
      );
    database
      .prepare(
        `INSERT INTO saved_filters (id, site_id, owner_user_id, name, filter_dsl)
         VALUES ('saved', 's', 'u', 'Pro', ?)`,
      )
      .run('event.payload("/plan") eq "pro" AND page.path eq "/"');

    database.exec(
      loadMigrations().find((migration) => migration.file === MIGRATION)!.sql,
    );

    const config = database
      .prepare("SELECT config_json FROM analysis_definitions")
      .get() as { config_json: string };
    expect(JSON.parse(config.config_json)).toEqual({
      filterDslVersion: 1,
      filterDsl: 'event.name eq "Signup" AND property("plan") eq "pro"',
    });
    expect(
      database.prepare("SELECT filter_dsl FROM saved_filters").get(),
    ).toEqual({ filter_dsl: 'property("plan") eq "pro" AND page.path eq "/"' });
    database.close();
  });
});
