import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { runAnalyticsRetention } from "@/lib/edge/scheduled-tasks/analytics-retention";
import type { ScheduledTaskContext } from "@/lib/edge/scheduled-tasks/runner";
import type { Env } from "@/lib/edge/types";
import { ONE_HOUR_MS } from "@/lib/edge/utils";

const NOW = Date.UTC(2026, 9, 19);
const DAY_MS = 24 * ONE_HOUR_MS;

function seedSite(database: DatabaseSync, aggregatedUntilMs: number) {
  database
    .prepare("INSERT INTO site_identities (site_pk, site_id) VALUES (1, 's')")
    .run();
  database
    .prepare(
      "INSERT INTO visit_hourly_aggregation_state (site_pk, site_id, aggregated_until_hour) VALUES (1, 's', ?)",
    )
    .run(Math.floor(aggregatedUntilMs / ONE_HOUR_MS));
  database
    .prepare(
      "INSERT INTO visit_hourly_rollups (site_pk, site_id, hour_bucket, views, input_cutoff_ms) VALUES (1, 's', 1, 5, 0)",
    )
    .run();
  database
    .prepare(
      "INSERT INTO custom_event_names (id, site_pk, site_id, name, last_seen_at) VALUES (1, 1, 's', 'signup', 0)",
    )
    .run();
}

function seedVisit(database: DatabaseSync, id: string, startedAt: number) {
  database
    .prepare(
      `INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id, status,
         started_at, last_activity_at, pathname, hostname)
       VALUES (?, 1, 's', 'v', 'x', 'complete', ?, ?, '/', 'example.com')`,
    )
    .run(id, startedAt, startedAt);
  database
    .prepare(
      `INSERT INTO custom_events (event_id, site_pk, site_id, visit_id, event_name_id,
         occurred_at, received_at, node_count, value_count)
       VALUES (?, 1, 's', ?, 1, ?, ?, 0, 0)`,
    )
    .run(`${id}-event`, id, startedAt, startedAt);
}

function count(database: DatabaseSync, table: string): number {
  return (
    database.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as {
      n: number;
    }
  ).n;
}

function run(database: DatabaseSync) {
  return runAnalyticsRetention({
    env: { DB: createSqliteD1Database(database) } as Env,
    logger: { info: vi.fn() },
  } as unknown as ScheduledTaskContext);
}

describe("analytics retention", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    vi.useRealTimers();
  });

  it("deletes page views and events past the retention and keeps hourly totals", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, NOW);
    seedVisit(database, "old", NOW - 400 * DAY_MS);
    seedVisit(database, "recent", NOW - 10 * DAY_MS);

    await run(database);

    expect(database.prepare("SELECT visit_id FROM visits").all()).toEqual([
      { visit_id: "recent" },
    ]);
    expect(
      database.prepare("SELECT event_id FROM custom_events").all(),
    ).toEqual([{ event_id: "recent-event" }]);
    expect(count(database, "visit_hourly_rollups")).toBe(1);
  });

  it("keeps rows from hours that haven't been rolled up yet", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    database = createMigratedDatabase();
    seedSite(database, NOW - 500 * DAY_MS);
    seedVisit(database, "old", NOW - 400 * DAY_MS);

    await run(database);

    expect(count(database, "visits")).toBe(1);
    expect(count(database, "custom_events")).toBe(1);
  });
});
