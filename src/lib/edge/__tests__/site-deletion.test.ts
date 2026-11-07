import { describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createDatabaseRuntime } from "@/lib/db";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import {
  deletedSitesWithData,
  purgeSiteData,
  SITE_PURGE_BATCH_ROWS,
  siteDeletionMutations,
} from "@/lib/edge/sites/site-deletion";
import type { Env } from "@/lib/edge/types";

import {
  DAY_MS,
  insertVisits,
  seedSites,
  syntheticVisits,
} from "./rollup-fixtures";

const NOW = Date.UTC(2026, 10, 6, 13);
const SITE_TABLES = [
  "visits",
  "custom_events",
  "custom_event_json_nodes",
  "custom_event_json_values",
  "custom_event_names",
  "custom_event_json_paths",
  "visit_hourly_rollups",
  "visit_daily_rollups",
  "visit_daily_dimension_rollups",
  "visit_daily_geo_points",
  "visit_rollup_dirty_days",
  "visit_rollup_state",
];

describe("site deletion", () => {
  it("deletes the site, its settings, goals and funnels", () => {
    const mutations = siteDeletionMutations("site-a");

    expect(mutations.map(({ tag }) => tag)).toEqual([
      "admin.sites.delete_config",
      "admin.sites.delete_analysis_definitions",
      "admin.sites.delete",
    ]);
    expect(mutations.map(({ bindings }) => bindings)).toEqual([
      ["site:site-a"],
      ["site-a"],
      ["site-a"],
    ]);
    expect(mutations[1]?.sql).toContain("analysis_definitions");
  });

  it("purges a deleted site's data in bounded batches and leaves other sites alone", async () => {
    const database = createMigratedDatabase();
    const env = {
      DB: createSqliteD1Database(database),
    } as unknown as Env;
    seedSites(database, [
      { siteId: "site-1", sitePk: 1 },
      { siteId: "site-2", sitePk: 2 },
    ]);
    for (const sitePk of [1, 2]) {
      insertVisits(
        database,
        syntheticVisits({
          siteId: `site-${sitePk}`,
          sitePk,
          fromMs: NOW - 4 * DAY_MS,
          toMs: NOW - DAY_MS,
          peoplePerDay: 400,
          seed: sitePk,
        }),
      );
    }
    // An event with a payload on the first page view of each site.
    database.exec(`
      INSERT INTO custom_event_names (id, site_pk, site_id, name, last_seen_at)
        VALUES (1, 1, 'site-1', 'signup', 0), (2, 2, 'site-2', 'signup', 0);
      INSERT INTO custom_event_json_paths (id, site_pk, site_id, path, last_seen_at)
        VALUES (1, 1, 'site-1', '$.plan', 0), (2, 2, 'site-2', '$.plan', 0);
      INSERT INTO custom_events (event_pk, event_id, site_pk, site_id, visit_id,
        event_name_id, occurred_at, received_at, node_count, value_count)
      SELECT site_pk, 'e' || site_pk, site_pk, site_id, MIN(visit_id), site_pk, 0, 0, 1, 1
      FROM visits GROUP BY site_pk;
      INSERT INTO custom_event_json_nodes (event_pk, node_id, path_id, value_type, depth)
        VALUES (1, 1, 1, 1, 0), (2, 1, 2, 1, 0);
      INSERT INTO custom_event_json_values (event_pk, node_id, site_id, site_pk,
        event_name_id, path_id, occurred_at, value_type, string_value)
        VALUES (1, 1, 'site-1', 1, 1, 1, 0, 1, 'pro'), (2, 1, 'site-2', 2, 2, 2, 0, 1, 'pro');
    `);
    await runVisitRollups(env, NOW);
    database.exec(`
      INSERT INTO visit_rollup_dirty_days (site_pk, day)
      SELECT site_pk, MAX(day) FROM visit_daily_rollups GROUP BY site_pk;
    `);
    const siteRows = (sitePk: number) =>
      SITE_TABLES.map(
        (table) =>
          (
            database
              .prepare(
                table === "custom_event_json_nodes"
                  ? `SELECT COUNT(*) AS n FROM ${table} WHERE event_pk = ${sitePk}`
                  : `SELECT COUNT(*) AS n FROM ${table} WHERE site_pk = ${sitePk}`,
              )
              .get() as { n: number }
          ).n,
      );
    const site2Before = siteRows(2);
    const visits = siteRows(1)[0]!;
    expect(visits).toBeGreaterThan(2 * SITE_PURGE_BATCH_ROWS);
    database.prepare("DELETE FROM sites WHERE id = 'site-1'").run();
    const db = createDatabaseRuntime(env.DB);
    expect(await deletedSitesWithData(db)).toEqual([1]);

    // A small budget stops partway and the next call carries on.
    const partial = await purgeSiteData(db, 1, 5);
    expect(partial).toEqual({ batches: 5, done: false });
    expect(siteRows(1)[0]).toBeGreaterThan(0);
    const rest = await purgeSiteData(db, 1, 1000);

    expect(rest.done).toBe(true);
    expect(siteRows(1).every((rows) => rows === 0)).toBe(true);
    expect(siteRows(2)).toEqual(site2Before);
    expect(await deletedSitesWithData(db)).toEqual([]);
    database.close();
  });

  it("keeps a page view whose event the ingest buffer wrote during the purge for a later purge, so no delete cascades", async () => {
    const database = createMigratedDatabase();
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    insertVisits(
      database,
      syntheticVisits({
        siteId: "site-1",
        sitePk: 1,
        fromMs: NOW - 2 * DAY_MS,
        toMs: NOW - DAY_MS,
        peoplePerDay: 50,
        seed: 3,
      }),
    );
    database.exec(`
      INSERT INTO custom_event_names (id, site_pk, site_id, name, last_seen_at)
        VALUES (1, 1, 'site-1', 'signup', 0);
      INSERT INTO custom_event_json_paths (id, site_pk, site_id, path, last_seen_at)
        VALUES (1, 1, 'site-1', '$.items', 0);
      DELETE FROM sites WHERE id = 'site-1';
    `);
    // Once the purge has deleted the site's events, the ingest buffer
    // flushes one with a payload of 1,500 values onto a page view.
    const sqlite = createSqliteD1Database(database);
    const rowsChanged: number[] = [];
    const totalChanges = () =>
      Number(
        (database.prepare("SELECT total_changes() AS n").get() as { n: number })
          .n,
      );
    const d1 = {
      ...sqlite,
      prepare(sql: string) {
        const statement = sqlite.prepare(sql);
        const traced = {
          bind(...values: unknown[]) {
            statement.bind(...values);
            return traced;
          },
          first: () => statement.first(),
          all: () => statement.all(),
          async run() {
            const before = totalChanges();
            const result = await statement.run();
            rowsChanged.push(totalChanges() - before);
            if (sql.includes("DELETE FROM custom_events")) {
              database.exec(`
                INSERT INTO custom_events (event_pk, event_id, site_pk, site_id,
                  visit_id, event_name_id, occurred_at, received_at, node_count,
                  value_count)
                SELECT 1, 'late', 1, 'site-1', MIN(visit_id), 1, 0, 0, 1500, 1500
                FROM visits;
                WITH RECURSIVE node(id) AS (
                  SELECT 1 UNION ALL SELECT id + 1 FROM node WHERE id < 1500
                )
                INSERT INTO custom_event_json_nodes (event_pk, node_id, path_id,
                  value_type, depth)
                SELECT 1, id, 1, 1, 1 FROM node;
                INSERT INTO custom_event_json_values (event_pk, node_id, site_id,
                  site_pk, event_name_id, path_id, occurred_at, value_type,
                  string_value)
                SELECT 1, node_id, 'site-1', 1, 1, 1, 0, 1, 'x'
                FROM custom_event_json_nodes;
              `);
            }
            return result;
          },
        };
        return traced as unknown as D1PreparedStatement;
      },
    } as D1Database;
    const db = createDatabaseRuntime(d1);

    const first = await purgeSiteData(db, 1, 1000);

    expect(first.done).toBe(true);
    expect(Math.max(...rowsChanged)).toBeLessThanOrEqual(SITE_PURGE_BATCH_ROWS);
    expect(database.prepare("SELECT COUNT(*) AS n FROM visits").get()).toEqual({
      n: 1,
    });
    expect(await deletedSitesWithData(db)).toEqual([1]);

    const second = await purgeSiteData(
      createDatabaseRuntime(createSqliteD1Database(database)),
      1,
      1000,
    );

    expect(second.done).toBe(true);
    for (const table of SITE_TABLES) {
      expect(
        database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get(),
      ).toEqual({ n: 0 });
    }
    database.close();
  });
});
