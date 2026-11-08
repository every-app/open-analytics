import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import { idFromSha256Hex } from "@/lib/edge/utils";

const MIGRATION = "0016_integer_visitor_ids.sql";

function databaseBefore(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  for (const migration of loadMigrations()) {
    if (migration.file >= MIGRATION) break;
    database.exec(migration.sql);
  }
  database.exec(`
    INSERT INTO site_identities (site_pk, site_id) VALUES (1, 'site-1');
    INSERT INTO custom_event_names (id, site_pk, name, last_seen_at)
      VALUES (1, 1, 'Signup', 0);
  `);
  return database;
}

function migrate(database: DatabaseSync): void {
  database.exec(
    loadMigrations().find((migration) => migration.file === MIGRATION)!.sql,
  );
}

function insertVisit(
  database: DatabaseSync,
  visitId: string,
  visitorId: string,
  sessionId: string,
): void {
  database
    .prepare(
      `INSERT INTO visits (
        visit_id, site_id, site_pk, visitor_id, session_id, status,
        started_at, last_activity_at, pathname, hostname, latitude, longitude
      ) VALUES (?, 'site-1', 1, ?, ?, 'complete', 1, 1, '/', 'example.com', 37.8, -122.4)`,
    )
    .run(visitId, visitorId, sessionId);
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

describe(MIGRATION, () => {
  it("converts hex ids exactly as idFromSha256Hex does, and client UUIDs by their own hex", () => {
    const database = databaseBefore();
    const ids = Array.from({ length: 500 }, (_, index) => ({
      visitId: `visit-${index}`,
      visitor: index % 5 === 0 ? randomUUID() : sha256(`visitor-${index}`),
      session: sha256(`session-${index}`),
    }));
    // The extremes of 13 hex digits.
    ids.push(
      { visitId: "zero", visitor: "0".repeat(64), session: "0".repeat(64) },
      { visitId: "max", visitor: "f".repeat(64), session: "f".repeat(64) },
    );
    for (const { visitId, visitor, session } of ids) {
      insertVisit(database, visitId, visitor, session);
    }

    migrate(database);

    const rows = new Map(
      (
        database
          .prepare(
            `SELECT visit_id, visitor_id, session_id,
               typeof(visitor_id) AS visitorType,
               typeof(session_id) AS sessionType
             FROM visits`,
          )
          .all() as Array<{
          visit_id: string;
          visitor_id: number;
          session_id: number;
          visitorType: string;
          sessionType: string;
        }>
      ).map((row) => [row.visit_id, row]),
    );
    expect(rows.size).toBe(ids.length);
    for (const { visitId, visitor, session } of ids) {
      expect(rows.get(visitId)).toEqual({
        visit_id: visitId,
        visitor_id: idFromSha256Hex(visitor.replaceAll("-", "")),
        session_id: idFromSha256Hex(session),
        visitorType: "integer",
        sessionType: "integer",
      });
    }
    expect(rows.get("max")?.visitor_id).toBe(2 ** 52 - 1);
    database.close();
  });

  it("drops the site id and coordinates, keeps the indexes, and loses no property or event", () => {
    const database = databaseBefore();
    insertVisit(database, "v1", sha256("a"), sha256("b"));
    insertVisit(database, "v2", sha256("c"), sha256("d"));
    database.exec(`
      INSERT INTO visit_properties (visit_id, key, value, site_pk, started_at)
        VALUES ('v1', 'author', 'Jane', 1, 1), ('v2', 'author', 'John', 1, 1);
      INSERT INTO custom_events (event_pk, event_id, site_pk, visit_id,
        event_name_id, occurred_at, received_at, revenue_amount, revenue_currency)
        VALUES (7, 'e1', 1, 'v1', 1, 2, 2, 9.5, 'EUR');
      INSERT INTO custom_event_properties (event_pk, key, value, site_pk, occurred_at)
        VALUES (7, 'plan', 'pro', 1, 2);
    `);

    migrate(database);

    const columns = (
      database.prepare("PRAGMA table_info(visits)").all() as Array<{
        name: string;
        type: string;
      }>
    ).map((column) => `${column.name} ${column.type}`);
    expect(columns).toEqual(
      expect.arrayContaining(["visitor_id INTEGER", "session_id INTEGER"]),
    );
    for (const dropped of ["site_id", "latitude", "longitude"]) {
      expect(columns.some((column) => column.startsWith(`${dropped} `))).toBe(
        false,
      );
    }
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name IN ('visits', 'visit_properties', 'custom_events', 'custom_event_properties') AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all(),
    ).toEqual([
      { name: "idx_custom_event_properties_site_pk_key_occurred" },
      { name: "idx_custom_events_site_pk_name_time" },
      { name: "idx_custom_events_site_pk_time" },
      { name: "idx_custom_events_visit_id" },
      { name: "idx_visit_properties_site_pk_key_started" },
      { name: "idx_visits_site_pk_session_started_at" },
      { name: "idx_visits_site_pk_started_at" },
    ]);
    expect(
      database
        .prepare(
          "SELECT visit_id, key, value FROM visit_properties ORDER BY visit_id",
        )
        .all(),
    ).toEqual([
      { visit_id: "v1", key: "author", value: "Jane" },
      { visit_id: "v2", key: "author", value: "John" },
    ]);
    expect(
      database
        .prepare(
          `SELECT e.event_id, e.revenue_amount, p.key, p.value
           FROM custom_events e JOIN custom_event_properties p USING (event_pk)`,
        )
        .all(),
    ).toEqual([
      { event_id: "e1", revenue_amount: 9.5, key: "plan", value: "pro" },
    ]);
    // The foreign keys still hold: a page view's delete cascades as before.
    database.exec(
      "DELETE FROM custom_events; DELETE FROM visits WHERE visit_id = 'v2'",
    );
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM visit_properties").get(),
    ).toEqual({ n: 1 });
    database.close();
  });

  it("stops, changing nothing, at an id that is neither hex nor a UUID", () => {
    const database = databaseBefore();
    insertVisit(database, "v1", sha256("a"), sha256("b"));
    insertVisit(database, "bad", "not-an-id", sha256("c"));

    database.exec("BEGIN");
    expect(() => migrate(database)).toThrow(
      /NOT NULL constraint failed: visits_next.visitor_id/,
    );
    database.exec("ROLLBACK");

    expect(
      database
        .prepare("SELECT visit_id, visitor_id FROM visits ORDER BY visit_id")
        .all(),
    ).toEqual([
      { visit_id: "bad", visitor_id: "not-an-id" },
      { visit_id: "v1", visitor_id: sha256("a") },
    ]);
    database.close();
  });
});
