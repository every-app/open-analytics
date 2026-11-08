import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { explainQueryPlan } from "@/lib/db/__tests__/query-plan";
import {
  createSqliteD1Database,
  type SqliteD1Trace,
} from "@/lib/db/__tests__/sqlite-d1";
import { loadSiteInfo } from "@/lib/notifications/edge/report-data";

const databases = new Set<DatabaseSync>();

function createFixture() {
  const database = createMigratedDatabase();
  database
    .prepare("INSERT INTO users (id, email) VALUES (?, ?)")
    .run("owner-1", "owner@example.test");
  database
    .prepare("INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)")
    .run("team-1", "Team One", "team-one");
  const insertSite = database.prepare(
    "INSERT INTO sites (id, team_id, name, domain) VALUES (?, ?, ?, ?)",
  );
  insertSite.run("site-1", "team-1", "Site One", "one.example.test");
  insertSite.run("site-2", "team-1", "Site Two", "two.example.test");
  const insertIdentity = database.prepare(
    "INSERT INTO site_identities (site_id) VALUES (?)",
  );
  insertIdentity.run("site-1");
  insertIdentity.run("site-2");

  const insertVisit = database.prepare(`
    INSERT INTO visits (
      visit_id, visitor_id, session_id, status,
      started_at, last_activity_at, pathname, hostname, site_pk
    ) VALUES (
      ?, ?, ?, 'active', ?, ?, '/', ?,
      (SELECT site_pk FROM site_identities WHERE site_id = ? LIMIT 1)
    )
  `);
  insertVisit.run(
    "visit-1",
    "visitor-1",
    "session-1",
    1_800_000_000_000,
    1_800_000_100_000,
    "one.example.test",
    "site-1",
  );
  insertVisit.run(
    "visit-2",
    "visitor-2",
    "session-2",
    1_800_000_001_000,
    1_800_000_123_000,
    "one.example.test",
    "site-1",
  );
  insertVisit.run(
    "visit-3",
    "visitor-3",
    "session-3",
    1_900_000_000_000,
    2_000_000_000_000,
    "two.example.test",
    "site-2",
  );

  databases.add(database);
  const trace: SqliteD1Trace = { preparedSql: [], bindings: [] };
  const env = { DB: createSqliteD1Database(database, trace) } as never;
  return { database, env, trace };
}

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
});

describe("notification auxiliary reads Typed DAL differential checks", () => {
  it("matches legacy site metadata reads and missing-row behavior", async () => {
    const { database, env, trace } = createFixture();
    const legacy = database
      .prepare("SELECT name, domain FROM sites WHERE id = ? LIMIT 1")
      .get("site-1");

    await expect(loadSiteInfo(env, "site-1")).resolves.toEqual(legacy);
    await expect(loadSiteInfo(env, "missing-site")).resolves.toBeNull();
    expect(trace.preparedSql).toHaveLength(2);
    expect(trace.bindings).toEqual([
      ["site-1", 1],
      ["missing-site", 1],
    ]);
  });
});
