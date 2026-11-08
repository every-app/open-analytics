import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import { DAY_MS, seedSites } from "@/lib/edge/__tests__/rollup-fixtures";

const MIGRATION = "0010_privacy_fields.sql";
const NOW = Date.UTC(2026, 10, 6, 13);
const TODAY = Math.floor(NOW / DAY_MS);
const [REACHED, OPEN] = [TODAY - 3, TODAY - 2];
const DROPPED_VISIT_COLUMNS = [
  "ua_raw",
  "postal_code",
  "metro_code",
  "as_organization",
  "user_id",
  "user_name",
];

/** A database as every migration before this one left it. */
function databaseBeforeMigration(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  for (const migration of loadMigrations()) {
    if (migration.file >= MIGRATION) break;
    database.exec(migration.sql);
  }
  return database;
}

function migrationSql(): string {
  return loadMigrations().find((migration) => migration.file === MIGRATION)!
    .sql;
}

function columnsOf(database: DatabaseSync, table: string): string[] {
  return (
    database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>
  ).map((column) => column.name);
}

/** A page view in San Francisco, with what ingest stored before. */
function insertPageView(
  database: DatabaseSync,
  visitId: string,
  day: number,
  latitude: number | null,
  longitude: number | null,
): void {
  database
    .prepare(
      `INSERT INTO visits (
        visit_id, site_id, site_pk, visitor_id, session_id, status,
        started_at, last_activity_at, pathname, hostname, country, region,
        region_code, city, latitude, longitude, postal_code, metro_code,
        as_organization, ua_raw, user_id, user_name
      ) VALUES (
        ?, 'site-1', 1, ?, ?, 'complete', ?, ?, '/', 'example.com', 'US',
        'California', 'CA', 'San Francisco', ?, ?, '94105', '807',
        'Example ISP', 'Mozilla/5.0', 'user-1', 'Ada'
      )`,
    )
    .run(
      visitId,
      `visitor-${visitId}`,
      `session-${visitId}`,
      day * DAY_MS + 1,
      day * DAY_MS + 1,
      latitude,
      longitude,
    );
}

/** A map point the rollup task kept at 3 decimals before this migration. */
function insertGeoPoint(
  database: DatabaseSync,
  day: number,
  latitude: number,
  longitude: number,
): void {
  database
    .prepare(
      `INSERT INTO visit_daily_geo_points (
        site_pk, day, latitude, longitude, country, region, region_code,
        city, views, latest_at
      ) VALUES (1, ?, ?, ?, 'US', 'California', 'CA', 'San Francisco', 1, ?)`,
    )
    .run(day, latitude, longitude, day * DAY_MS + 1);
}

function geoPoints(database: DatabaseSync) {
  return database
    .prepare(
      `SELECT day, latitude, longitude, views FROM visit_daily_geo_points
       ORDER BY day, latitude, longitude`,
    )
    .all();
}

describe(MIGRATION, () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it("drops the fields Plausible doesn't store, rounds coordinates to a city and marks the map for rebuild", () => {
    database = databaseBeforeMigration();
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    for (const day of [REACHED, OPEN]) {
      insertPageView(database, `a-${day}`, day, 37.7749, -122.4194);
      insertPageView(database, `b-${day}`, day, 37.7849, -122.4094);
      insertPageView(database, `c-${day}`, day, null, null);
    }
    database
      .prepare(
        `INSERT INTO custom_event_names (id, site_id, site_pk, name, last_seen_at)
         VALUES (1, 'site-1', 1, 'Signup', ?)`,
      )
      .run(NOW);
    database
      .prepare(
        `INSERT INTO custom_events (
          event_id, site_id, site_pk, visit_id, event_name_id, occurred_at,
          received_at, node_count, value_count, user_id
        ) VALUES ('event-1', 'site-1', 1, ?, 1, ?, ?, 0, 0, 'user-1')`,
      )
      .run(`a-${OPEN}`, OPEN * DAY_MS + 2, OPEN * DAY_MS + 2);
    // Both days were rolled up at 3 decimals; retention has reached the
    // first.
    for (const day of [REACHED, OPEN]) {
      insertGeoPoint(database, day, 37.775, -122.419);
      insertGeoPoint(database, day, 37.785, -122.409);
    }
    database
      .prepare(
        `INSERT INTO visit_rollup_state (
          site_pk, first_day, last_day, backfilled, retention_reached_day
        ) VALUES (1, ?, ?, 1, ?)`,
      )
      .run(REACHED, OPEN, REACHED);

    database.exec(migrationSql());

    for (const column of DROPPED_VISIT_COLUMNS) {
      expect(columnsOf(database, "visits")).not.toContain(column);
    }
    expect(columnsOf(database, "custom_events")).not.toContain("user_id");
    expect(
      database
        .prepare(
          `SELECT visit_id, latitude, longitude FROM visits
           WHERE started_at >= ? ORDER BY visit_id`,
        )
        .all(OPEN * DAY_MS),
    ).toEqual([
      { visit_id: `a-${OPEN}`, latitude: 37.8, longitude: -122.4 },
      { visit_id: `b-${OPEN}`, latitude: 37.8, longitude: -122.4 },
      { visit_id: `c-${OPEN}`, latitude: null, longitude: null },
    ]);
    expect(
      database.prepare("SELECT event_id, visit_id FROM custom_events").all(),
    ).toEqual([{ event_id: "event-1", visit_id: `a-${OPEN}` }]);
    // Every rollup point is merged onto its city, the reached day's too.
    expect(geoPoints(database)).toEqual([
      { day: REACHED, latitude: 37.8, longitude: -122.4, views: 2 },
      { day: OPEN, latitude: 37.8, longitude: -122.4, views: 2 },
    ]);
    expect(
      database
        .prepare("SELECT site_pk, day FROM visit_rollup_dirty_days")
        .all(),
    ).toEqual([{ site_pk: 1, day: OPEN }]);
  });
});
