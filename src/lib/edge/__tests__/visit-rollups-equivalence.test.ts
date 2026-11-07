import type { DatabaseSync } from "node:sqlite";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Interval } from "@/lib/edge/analytics/contract";
import { handleSimpleDimensionContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/dimensions";
import {
  handleOverviewContract,
  handleTrendContract,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import { handleOverviewGeoPointsContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-extras";
import {
  handleOverviewTabContract,
  type OverviewTab,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-tabs";
import { queryTeamDashboardForTeam } from "@/lib/edge/analytics/providers/d1/internal/team";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import type { Env } from "@/lib/edge/types";

import {
  createRollupTestEnv,
  DAY_MS,
  insertVisits,
  seedSites,
  syntheticVisits,
} from "./rollup-fixtures";

// Data from 20 October to 6 November 2026, 13:00 UTC: across Europe's (25
// October) and the US's (1 November) daylight-saving changes. Days through
// 5 November are complete and rolled up; 6 November stays raw.
const DATA_FROM = Date.UTC(2026, 9, 20);
const NOW = Date.UTC(2026, 10, 6, 13);
const SITES = [
  { siteId: "site-a", sitePk: 1 },
  { siteId: "site-b", sitePk: 2 },
  { siteId: "site-c", sitePk: 3 },
];
const TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Australia/Sydney",
];
const CARD_TABS: OverviewTab[] = [
  "page.path",
  "page.entry",
  "page.exit",
  "source.domain",
  "source.channel",
  "client.browser",
  "client.osVersion",
  "client.deviceType",
  "geo.country",
  "geo.region",
  "geo.city",
];
const ROLLUP_TABLES = [
  "visit_daily_rollups",
  "visit_hourly_rollups",
  "visit_daily_dimension_rollups",
  "visit_daily_geo_points",
];
const UTM_DIMENSIONS = [
  "utm.source",
  "utm.medium",
  "utm.campaign",
  "utm.term",
  "utm.content",
] as const;

function offsetAt(timeZone: string, ms: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(new Date(ms));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return (
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
    ) - ms
  );
}

/** Epoch milliseconds of midnight on a calendar date in a time zone. */
function zonedMidnight(
  timeZone: string,
  year: number,
  month: number,
  day: number,
): number {
  const local = Date.UTC(year, month, day);
  const guess = local - offsetAt(timeZone, local);
  return local - offsetAt(timeZone, guess);
}

interface ReadCase {
  readonly label: string;
  readonly siteId: string;
  readonly timeZone: string;
  readonly from: number;
  readonly to: number;
  readonly interval: Interval;
}

function readCases(): ReadCase[] {
  const cases: ReadCase[] = [];
  for (const site of SITES) {
    for (const timeZone of TIME_ZONES) {
      const today = zonedMidnight(timeZone, 2026, 10, 6);
      cases.push(
        {
          label: "last 7 days",
          siteId: site.siteId,
          timeZone,
          from: zonedMidnight(timeZone, 2026, 9, 30),
          to: today,
          interval: "day",
        },
        {
          label: "last 14 days and today, weekly",
          siteId: site.siteId,
          timeZone,
          from: zonedMidnight(timeZone, 2026, 9, 23),
          to: NOW,
          interval: "week",
        },
        {
          label: "everything, monthly",
          siteId: site.siteId,
          timeZone,
          from: zonedMidnight(timeZone, 2026, 9, 1),
          to: zonedMidnight(timeZone, 2026, 10, 7),
          interval: "month",
        },
        {
          label: "two days, hourly",
          siteId: site.siteId,
          timeZone,
          from: zonedMidnight(timeZone, 2026, 10, 2),
          to: zonedMidnight(timeZone, 2026, 10, 4),
          interval: "hour",
        },
      );
    }
    cases.push({
      label: "odd edges",
      siteId: site.siteId,
      timeZone: "UTC",
      from: DATA_FROM + DAY_MS + 13 * 3_600_000 + 37 * 60_000,
      to: NOW - 5 * DAY_MS + 17 * 60_000,
      interval: "day",
    });
  }
  return cases;
}

function url(params: Record<string, string | number>): URL {
  const target = new URL("https://app.test/api/private/report");
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, String(value));
  }
  return target;
}

async function body(response: Response): Promise<unknown> {
  expect(response.status).toBe(200);
  return response.json();
}

/** Every page of a tab, following its cursors. */
async function allPages(
  env: Env,
  read: ReadCase,
  tab: OverviewTab,
  sort: "views" | "visitors",
  direction: "asc" | "desc",
): Promise<unknown[]> {
  const pages: unknown[] = [];
  let cursor = "";
  for (let page = 0; page < 50; page += 1) {
    const result = (await body(
      await handleOverviewTabContract(
        env,
        read.siteId,
        url({
          from: read.from,
          to: read.to,
          timeZone: read.timeZone,
          limit: 4,
          sort,
          direction,
          ...(cursor ? { cursor } : {}),
        }),
        tab,
      ),
    )) as { data: { pagination: { nextCursor: string | null } } };
    pages.push(result);
    if (!result.data.pagination.nextCursor) break;
    cursor = result.data.pagination.nextCursor;
  }
  return pages;
}

/** Everything the Overview reads for one case, as the endpoints answer. */
async function readOverview(env: Env, read: ReadCase) {
  const window = {
    from: read.from,
    to: read.to,
    timeZone: read.timeZone,
  };
  const overview = await handleOverviewContract(
    env,
    read.siteId,
    url({
      ...window,
      includeChange: 1,
      includeDetail: 1,
      interval: read.interval,
    }),
  );
  const result: Record<string, unknown> = {
    source: overview.headers.get("x-insightflare-data-source"),
    overview: await body(overview),
    trend: await body(
      await handleTrendContract(
        env,
        read.siteId,
        url({ ...window, interval: read.interval }),
      ),
    ),
    geoPoints: await body(
      await handleOverviewGeoPointsContract(
        env,
        read.siteId,
        url({ ...window, limit: 5000 }),
      ),
    ),
  };
  for (const tab of CARD_TABS) {
    result[tab] = await body(
      await handleOverviewTabContract(
        env,
        read.siteId,
        url({ ...window, limit: 200 }),
        tab,
      ),
    );
  }
  for (const dimension of UTM_DIMENSIONS) {
    result[dimension] = await body(
      await handleSimpleDimensionContract(
        env,
        read.siteId,
        url({ ...window, limit: 200 }),
        dimension,
      ),
    );
  }
  result.pagedPaths = await allPages(
    env,
    read,
    "page.path",
    "visitors",
    "desc",
  );
  result.pagedEntries = await allPages(env, read, "page.entry", "views", "asc");
  result.pagedReferrers = await allPages(
    env,
    read,
    "source.domain",
    "visitors",
    "asc",
  );
  return result;
}

describe("Overview from daily rollups", () => {
  let database: DatabaseSync;
  let env: Env;
  let preparedSql: string[];
  const cases = readCases();
  const fromRollups = new Map<string, Record<string, unknown>>();
  const fromRaw = new Map<string, Record<string, unknown>>();
  const team = { rollup: null as unknown, raw: null as unknown };
  const key = (read: ReadCase) =>
    `${read.siteId} ${read.timeZone} ${read.label}`;
  const rollupReads: Record<string, number> = {};

  beforeAll(async () => {
    ({ database, env, preparedSql } = createRollupTestEnv());
    seedSites(database, SITES);
    for (const site of SITES) {
      insertVisits(
        database,
        syntheticVisits({
          ...site,
          fromMs: DATA_FROM,
          toMs: NOW,
          peoplePerDay: 12 + site.sitePk * 6,
          seed: site.sitePk,
        }),
      );
    }
    await runVisitRollups(env, NOW);

    for (const read of cases) {
      fromRollups.set(key(read), await readOverview(env, read));
    }
    for (const table of ROLLUP_TABLES) {
      rollupReads[table] = preparedSql.filter(
        (sql) => sql.includes(`FROM ${table}`) && !sql.includes("INSERT"),
      ).length;
    }
    team.rollup = await queryTeamDashboardForTeam(
      env,
      "team-1",
      {
        startMs: zonedMidnight("America/Los_Angeles", 2026, 9, 23),
        endExclusiveMs: NOW,
        nowMs: NOW,
        timeZone: "America/Los_Angeles",
      },
      "day",
    );

    // Without rollup state every read takes the raw path.
    database.exec("DELETE FROM visit_rollup_state");
    for (const read of cases) {
      fromRaw.set(key(read), await readOverview(env, read));
    }
    team.raw = await queryTeamDashboardForTeam(
      env,
      "team-1",
      {
        startMs: zonedMidnight("America/Los_Angeles", 2026, 9, 23),
        endExclusiveMs: NOW,
        nowMs: NOW,
        timeZone: "America/Los_Angeles",
      },
      "day",
    );
  }, 120_000);

  afterAll(() => database?.close());

  it("rolls up every complete day of every site", () => {
    const state = database
      .prepare("SELECT COUNT(*) AS n FROM visit_daily_rollups")
      .get() as { n: number };
    expect(state.n).toBe(SITES.length * 17);
    // Cards, map, totals and trends each read their rollups.
    expect(rollupReads.visit_daily_dimension_rollups).toBeGreaterThan(
      cases.length * CARD_TABS.length,
    );
    expect(rollupReads.visit_daily_geo_points).toBeGreaterThanOrEqual(
      cases.length,
    );
    expect(rollupReads.visit_daily_rollups).toBeGreaterThanOrEqual(
      cases.length,
    );
    expect(rollupReads.visit_hourly_rollups).toBeGreaterThan(0);
  });

  it.each(cases.map((read) => [key(read), read] as const))(
    "%s matches the raw rows",
    (_label, read) => {
      const rollup = fromRollups.get(key(read))!;
      const raw = fromRaw.get(key(read))!;
      const { source: rollupSource, ...rollupData } = rollup;
      const { source: rawSource, ...rawData } = raw;
      expect(rawSource).toBe("raw");
      // Whole UTC days inside the window come from rollups; a previous
      // period with none of them is read raw, which makes the answer mixed.
      expect(["rollup", "mixed"]).toContain(rollupSource);
      expect(rollupData).toEqual(rawData);
    },
  );

  it("matches the raw rows for the all-sites dashboard", () => {
    expect((team.rollup as { source: string }).source).toBe("rollup");
    expect((team.raw as { source: string }).source).toBe("raw");
    expect((team.rollup as { data: unknown }).data).toEqual(
      (team.raw as { data: unknown }).data,
    );
  });
});
