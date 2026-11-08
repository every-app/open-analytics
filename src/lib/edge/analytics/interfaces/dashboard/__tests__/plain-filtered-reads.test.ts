import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import {
  DAY_MS,
  insertVisits,
  seedSites,
  syntheticVisits,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { executePrivateQuery } from "@/lib/edge/analytics/interfaces/dashboard/private";
import type { Env } from "@/lib/edge/types";

const SITE = { siteId: "site-plain", sitePk: 1 };
const FROM = Date.UTC(2026, 9, 1);
const TO = FROM + 3 * DAY_MS;

/** The dashboard's page view reads. */
const PAGE_VIEW_PATHS = [
  "overview",
  "trend",
  "pages",
  "referrers",
  "overview-page-path",
  "overview-page-title",
  "overview-page-entry",
  "overview-page-exit",
  "overview-source-domain",
  "overview-source-channel",
  "overview-client-browser",
  "overview-client-device-type",
  "overview-geo-country",
  "overview-geo-region",
  "overview-geo-points",
  "utm-source",
  "properties",
] as const;
/** The dashboard's custom event reads. */
const EVENT_PATHS = ["events-summary", "events-trend", "event-types"] as const;
const FILTER = {
  "filter[page.path]": "/pricing",
  "filter[client.deviceType]": "desktop",
};

interface Statement {
  readonly sql: string;
  readonly bindings: SQLInputValue[];
}

let database: DatabaseSync;
let env: Env;
const statements: Statement[] = [];

/** Every statement the read ran, with its bindings. */
function tracedD1(): D1Database {
  const d1 = createSqliteD1Database(database);
  return {
    ...d1,
    prepare(sql: string) {
      const statement = d1.prepare(sql);
      const bind = statement.bind.bind(statement);
      statement.bind = (...values: unknown[]) => {
        statements.push({ sql, bindings: values as SQLInputValue[] });
        return bind(...values);
      };
      return statement;
    },
  } as D1Database;
}

async function read(path: string, filter: Record<string, string>) {
  const url = new URL(`https://edge.test/api/private/${path}`);
  url.searchParams.set("siteId", SITE.siteId);
  url.searchParams.set("from", String(FROM));
  url.searchParams.set("to", String(TO - 1));
  url.searchParams.set("timeZone", "UTC");
  url.searchParams.set("interval", "day");
  for (const [key, value] of Object.entries(filter)) {
    url.searchParams.set(key, value);
  }
  statements.length = 0;
  const response = await executePrivateQuery({
    env,
    siteId: SITE.siteId,
    pathname: path,
    url,
    request: new Request(url),
  });
  expect(response.status, `${path}: ${await response.clone().text()}`).toBe(
    200,
  );
  return { body: (await response.json()) as any, statements: [...statements] };
}

function plan(statement: Statement): string {
  return database
    .prepare(`EXPLAIN QUERY PLAN ${statement.sql}`)
    .all(...statement.bindings)
    .map((row) => String(row.detail))
    .join("\n");
}

beforeAll(() => {
  database = createMigratedDatabase();
  env = {
    DB: tracedD1(),
    MAIN_SECRET: "plain-filtered-reads-secret",
  } as unknown as Env;
  seedSites(database, [SITE]);
  const visits = syntheticVisits({
    ...SITE,
    fromMs: FROM,
    toMs: TO,
    peoplePerDay: 20,
    seed: 3,
  });
  insertVisits(database, visits);
  database.exec(`
    INSERT INTO custom_event_names (id, site_id, site_pk, name, last_seen_at)
    VALUES (1, '${SITE.siteId}', 1, 'purchase', 0);
  `);
  const purchase = database.prepare(
    `INSERT INTO custom_events (event_pk, event_id, site_id, site_pk, visit_id,
      event_name_id, occurred_at, received_at, node_count, value_count)
     VALUES (?, ?, ?, 1, ?, 1, ?, ?, 0, 0)`,
  );
  visits
    .filter((visit) => visit.pathname === "/pricing")
    .slice(0, 5)
    .forEach((visit, index) =>
      purchase.run(
        index + 1,
        `purchase-${index}`,
        SITE.siteId,
        visit.visitId,
        visit.startedAt + 1,
        visit.startedAt + 1,
      ),
    );
});

afterAll(() => database.close());

describe("filtered dashboard reads", () => {
  it.each(PAGE_VIEW_PATHS)(
    "%s reads one plain scan of the window's page views",
    async (path) => {
      const result = await read(path, FILTER);
      const reads = result.statements.filter(({ sql }) =>
        /\bvisits\b/.test(sql),
      );

      expect(reads.length).toBeGreaterThan(0);
      for (const statement of reads) {
        expect(statement.sql).not.toMatch(/scope_|visit_daily_/);
        const details = plan(statement);
        expect(details).toContain("idx_visits_site_pk_started_at");
        // Never a full scan of the page views.
        expect(details).not.toMatch(/^SCAN (v|visits)\b/m);
      }
    },
  );

  it.each(EVENT_PATHS)(
    "%s reads the window's events and looks each one's page view up",
    async (path) => {
      const result = await read(path, FILTER);
      const reads = result.statements.filter(({ sql }) =>
        /\bcustom_events\b/.test(sql),
      );

      expect(reads.length).toBeGreaterThan(0);
      for (const statement of reads) {
        expect(statement.sql).not.toMatch(/scope_/);
        const details = plan(statement);
        expect(details).toMatch(
          /SEARCH ce USING INDEX idx_custom_events_site_pk/,
        );
        expect(details).not.toMatch(/^SCAN (v|visits|ce|custom_events)\b/m);
      }
    },
  );

  it("counts only the page views that match the filter", async () => {
    const { body } = await read("overview", FILTER);
    const expected = database
      .prepare(
        `SELECT COUNT(*) AS views FROM visits
         WHERE site_pk = 1 AND started_at >= ? AND started_at < ?
           AND pathname = '/pricing' AND device_type = 'desktop'`,
      )
      .get(FROM, TO) as { views: number };

    expect(expected.views).toBeGreaterThan(0);
    expect(body.data.views).toBe(expected.views);
  });

  it("counts the page views that sent a goal's event for an event filter", async () => {
    const { body } = await read("overview", {
      "filter[event.name]": "purchase",
    });

    expect(body.data.views).toBe(5);
  });
});
