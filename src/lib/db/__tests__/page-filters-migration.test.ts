import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";

const MIGRATION = "0017_page_filters.sql";
const DAY_MS = 86_400_000;

function databaseBefore(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  for (const migration of loadMigrations()) {
    if (migration.file >= MIGRATION) break;
    database.exec(migration.sql);
  }
  database.exec(`
    INSERT INTO site_identities (site_pk, site_id) VALUES (1, 'site-1'), (2, 'site-2');
    -- Site 1 is rolled up over days 10 to 20, retention having reached day 11;
    -- site 2 has no rollups.
    INSERT INTO visit_rollup_state (site_pk, first_day, last_day, retention_reached_day)
      VALUES (1, 10, 20, 11);
  `);
  return database;
}

function insertVisit(
  database: DatabaseSync,
  visitId: string,
  sitePk: number,
  day: number,
  pathname: string,
  country: string,
): void {
  database
    .prepare(
      `INSERT INTO visits (
        visit_id, site_pk, visitor_id, session_id, status,
        started_at, last_activity_at, pathname, hostname, country
      ) VALUES (?, ?, 1, 1, 'complete', ?, ?, ?, 'example.com', ?)`,
    )
    .run(visitId, sitePk, day * DAY_MS, day * DAY_MS, pathname, country);
}

describe(MIGRATION, () => {
  it("trims stored text and marks the rolled-up days it changed for rebuilding", () => {
    const database = databaseBefore();
    insertVisit(database, "spaced-path", 1, 12, "  /pricing ", "US");
    insertVisit(database, "spaced-country", 1, 13, "/", " DE");
    insertVisit(database, "trimmed", 1, 14, "/about", "FR");
    insertVisit(database, "no-country", 1, 15, "/", "");
    // Past retention, and outside the rolled-up days.
    insertVisit(database, "retained", 1, 11, " /old", "US");
    insertVisit(database, "unrolled", 1, 21, " /new", "US");
    insertVisit(database, "other-site", 2, 12, " /x", "US");

    database.exec(
      loadMigrations().find((migration) => migration.file === MIGRATION)!.sql,
    );

    expect(
      database
        .prepare(
          "SELECT visit_id, pathname, country FROM visits ORDER BY visit_id",
        )
        .all(),
    ).toEqual([
      { visit_id: "no-country", pathname: "/", country: "" },
      { visit_id: "other-site", pathname: "/x", country: "US" },
      { visit_id: "retained", pathname: "/old", country: "US" },
      { visit_id: "spaced-country", pathname: "/", country: "DE" },
      { visit_id: "spaced-path", pathname: "/pricing", country: "US" },
      { visit_id: "trimmed", pathname: "/about", country: "FR" },
      { visit_id: "unrolled", pathname: "/new", country: "US" },
    ]);
    expect(
      database
        .prepare(
          "SELECT site_pk, day FROM visit_rollup_dirty_days ORDER BY site_pk, day",
        )
        .all(),
    ).toEqual([
      { site_pk: 1, day: 12 },
      { site_pk: 1, day: 13 },
    ]);
    database.close();
  });
});
