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
import {
  DashboardCard,
  DevicesCardTab,
  LocationsCardTab,
  PagesCardTab,
  SourcesCardTab,
} from "@/lib/edge/analytics/contract";
import { executePrivateQuery } from "@/lib/edge/analytics/interfaces/dashboard/private";
import type { Env } from "@/lib/edge/types";

const SITE = { siteId: "site-dashboard", sitePk: 1 };
const FROM = Date.UTC(2026, 9, 1);
const TO = FROM + 4 * DAY_MS;

interface Statement {
  readonly sql: string;
  readonly bindings: SQLInputValue[];
}

let database: DatabaseSync;
let env: Env;
const statements: Statement[] = [];

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

async function read(
  path: string,
  params: Record<string, string>,
): Promise<{ status: number; body: any; statements: Statement[] }> {
  const url = new URL(`https://edge.test/api/private/${path}`);
  url.searchParams.set("siteId", SITE.siteId);
  url.searchParams.set("from", String(FROM));
  url.searchParams.set("to", String(TO));
  url.searchParams.set("timeZone", "UTC");
  url.searchParams.set("interval", "day");
  for (const [key, value] of Object.entries(params)) {
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
  return {
    status: response.status,
    body: await response.json(),
    statements: [...statements],
  };
}

async function ok(path: string, params: Record<string, string>) {
  const result = await read(path, params);
  expect(result.status, `${path}: ${JSON.stringify(result.body)}`).toBe(200);
  return result;
}

/** A card's first page as the card asked for it on its own. */
const CARD_PAGE = { sort: "visitors", direction: "desc", limit: "10" };

/** The request each card tab made on its own before. */
const TAB_PATHS: Readonly<Record<string, { path: string; limit?: string }>> = {
  [SourcesCardTab.Channel]: { path: "overview-source-channel" },
  [SourcesCardTab.Domain]: { path: "overview-source-domain" },
  [PagesCardTab.Path]: { path: "overview-page-path" },
  [PagesCardTab.Entry]: { path: "overview-page-entry" },
  [PagesCardTab.Exit]: { path: "overview-page-exit" },
  [LocationsCardTab.Map]: { path: "overview-geo-country", limit: "200" },
  [LocationsCardTab.Country]: { path: "overview-geo-country" },
  [LocationsCardTab.Region]: { path: "overview-geo-region" },
  [LocationsCardTab.City]: { path: "overview-geo-city" },
  [DevicesCardTab.Browser]: { path: "overview-client-browser" },
  [DevicesCardTab.OsVersion]: { path: "overview-client-os-version" },
  [DevicesCardTab.DeviceType]: { path: "overview-client-device-type" },
};

const counts = (rows: any[]) =>
  rows.map((row) => ({
    label: row.label,
    views: row.views,
    sessions: row.sessions,
    visitors: row.visitors,
  }));

const FILTERS: ReadonlyArray<Record<string, string>> = [
  {},
  { "filter[page.path]": "/pricing", "filter[client.deviceType]": "desktop" },
  { "filter[traffic.channel]": "organic_search" },
  { "filter[geo.country]": "US", "filter[client.deviceType]": "desktop" },
  { "filter[geo.country]": "DE" },
];

const TAB_SETS = [
  {
    sources: SourcesCardTab.Channel,
    pages: PagesCardTab.Path,
    locations: LocationsCardTab.Map,
    devices: DevicesCardTab.Browser,
  },
  {
    sources: SourcesCardTab.Domain,
    pages: PagesCardTab.Entry,
    locations: LocationsCardTab.Country,
    devices: DevicesCardTab.OsVersion,
  },
  {
    sources: SourcesCardTab.Channel,
    pages: PagesCardTab.Exit,
    locations: LocationsCardTab.Region,
    devices: DevicesCardTab.DeviceType,
  },
  {
    sources: SourcesCardTab.Domain,
    pages: PagesCardTab.Path,
    locations: LocationsCardTab.City,
    devices: DevicesCardTab.Browser,
  },
];

beforeAll(() => {
  database = createMigratedDatabase();
  env = {
    DB: tracedD1(),
    MAIN_SECRET: "dashboard-load-secret",
  } as unknown as Env;
  seedSites(database, [SITE]);
  insertVisits(
    database,
    syntheticVisits({
      ...SITE,
      fromMs: FROM,
      toMs: TO,
      peoplePerDay: 25,
      seed: 7,
    }),
  );
  // Some page views report how far they were scrolled.
  database.exec(
    "UPDATE visits SET scroll_depth = (started_at / 1000) % 101 WHERE started_at % 3 = 0",
  );
});

afterAll(() => database.close());

describe("dashboard load", () => {
  it.each(
    FILTERS.flatMap((filter) => TAB_SETS.map((tabs) => ({ filter, tabs }))),
  )(
    "returns what the separate reads return: $filter, $tabs",
    async ({ filter, tabs }) => {
      const dashboard = (await ok("dashboard", { ...filter, ...tabs })).body;

      const overview = (await ok("overview", filter)).body;
      expect(dashboard.overview).toEqual(overview.data);
      const trend = (await ok("trend", filter)).body;
      expect(dashboard.trend).toEqual({
        interval: trend.interval,
        data: trend.data,
      });
      for (const [card, tab] of Object.entries(tabs)) {
        const own = TAB_PATHS[tab]!;
        const rows = (
          await ok(own.path, {
            ...filter,
            ...CARD_PAGE,
            ...(own.limit ? { limit: own.limit } : {}),
          })
        ).body.data.items;
        expect(rows.length, `${card}: ${tab}`).toBeGreaterThan(0);
        expect(counts(dashboard.cards[card]), `${card}: ${tab}`).toEqual(
          counts(rows),
        );
      }
    },
  );

  it("lists a campaign tab's tagged visits by its parameter", async () => {
    const { body } = await ok("dashboard", {
      "filter[client.deviceType]": "desktop",
      sources: SourcesCardTab.UtmMedium,
      pages: PagesCardTab.Path,
      locations: LocationsCardTab.Map,
      devices: DevicesCardTab.Browser,
    });
    expect(body.cards[DashboardCard.Sources]).toEqual(
      database
        .prepare(
          `SELECT utm_medium AS value, utm_medium AS label, count(*) AS views,
             count(DISTINCT session_id) AS sessions,
             count(DISTINCT visitor_id) AS visitors
           FROM visits
           WHERE device_type = 'desktop' AND utm_medium != ''
             AND started_at >= ? AND started_at < ?
           GROUP BY utm_medium
           ORDER BY visitors DESC, views DESC, value ASC`,
        )
        .all(FROM, TO),
    );
  });

  it("reads a filtered load's page views once, in one statement", async () => {
    const { body, statements: run } = await ok("dashboard", {
      "filter[page.path]": "/pricing",
      "filter[geo.country]": "US",
      sources: SourcesCardTab.Channel,
      pages: PagesCardTab.Entry,
      locations: LocationsCardTab.Map,
      devices: DevicesCardTab.Browser,
    });

    expect(run).toHaveLength(1);
    const plan = database
      .prepare(`EXPLAIN QUERY PLAN ${run[0]!.sql}`)
      .all(...run[0]!.bindings)
      .map((row) => String(row.detail));
    // The page's page views, through the page index, once.
    expect(plan.filter((detail) => /\b(SCAN|SEARCH) v\b/.test(detail))).toEqual(
      [
        "SEARCH v USING INDEX idx_visits_site_pk_pathname_started_at (site_pk=? AND pathname=? AND started_at>? AND started_at<?)",
      ],
    );
    expect(plan.filter((detail) => /\bvisits\b/.test(detail))).toEqual([]);
    expect(run[0]!.sql).toContain("page_view_scan AS MATERIALIZED");
    expect(run[0]!.bindings.length).toBeLessThanOrEqual(100);
    // The map lists every country, not only the one filtered to.
    expect(
      body.cards[DashboardCard.Locations].map((row: any) => row.value),
    ).toEqual(expect.arrayContaining(["US", "DE"]));
    expect(body.overview.scrollDepth).toEqual(expect.any(Number));
  });

  it("leaves the cards out while Compare is on", async () => {
    const { body, statements: run } = await ok("dashboard", {
      "filter[page.path]": "/pricing",
    });
    expect(run).toHaveLength(1);
    expect(body.cards).toBeUndefined();
    expect(body.overview.views).toBeGreaterThan(0);
  });

  it.each<Record<string, string>>([
    { sources: SourcesCardTab.Channel },
    {
      sources: "referrer",
      pages: PagesCardTab.Path,
      locations: LocationsCardTab.Map,
      devices: DevicesCardTab.Browser,
    },
  ])("refuses cards it can't read: %j", async (cards) => {
    expect((await read("dashboard", cards)).status).toBe(400);
  });
});
