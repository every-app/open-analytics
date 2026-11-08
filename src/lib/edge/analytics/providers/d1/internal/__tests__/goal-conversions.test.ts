import type { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { D1_MAX_BOUND_PARAMETERS, D1_MAX_SQL_UTF8_BYTES } from "@/lib/db";
import {
  createRollupTestEnv,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { GOAL_TIMESERIES_MAX_BUCKETS } from "@/lib/edge/analytics/application/goal-buckets";
import {
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
} from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core-types";
import {
  queryGoalConversionsFromD1,
  queryGoalTimeseriesFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/goal-conversions";
import { parseFilterDsl } from "@/lib/filter-contract";

const SITE_ID = "site-1";
const window: QueryWindow = {
  startMs: 0,
  endExclusiveMs: 180_000,
  nowMs: 180_000,
  timeZone: "UTC",
};

function dsl(source: string): FilterDocument {
  return parseFilterDsl(source, analyticsFilterRegistry);
}

interface Seed {
  readonly visits: ReadonlyArray<
    readonly [
      id: string,
      session: string,
      visitor: string,
      at: number,
      path: string,
      country?: string,
    ]
  >;
  readonly events?: ReadonlyArray<
    readonly [id: string, visit: string, name: string, at: number]
  >;
  readonly payloads?: ReadonlyArray<
    readonly [event: string, path: string, value: string]
  >;
}

function seed({ visits, events = [], payloads = [] }: Seed) {
  const test = createRollupTestEnv();
  const database: DatabaseSync = test.database;
  seedSites(database, [{ siteId: SITE_ID, sitePk: 1 }]);
  for (const [id, session, visitor, at, path, country] of visits) {
    database
      .prepare(
        `INSERT INTO visits (visit_id, site_id, site_pk, visitor_id, session_id, status,
          started_at, last_activity_at, pathname, hostname, country)
         VALUES (?, ?, 1, ?, ?, 'complete', ?, ?, ?, 'example.com', ?)`,
      )
      .run(id, SITE_ID, visitor, session, at, at, path, country ?? "US");
  }
  const names = new Map<string, number>();
  const eventPks = new Map<string, number>();
  for (const [id, visit, name, at] of events) {
    if (!names.has(name)) {
      names.set(name, names.size + 1);
      database
        .prepare(
          "INSERT INTO custom_event_names (id, site_id, site_pk, name, last_seen_at) VALUES (?, ?, 1, ?, 0)",
        )
        .run(names.get(name)!, SITE_ID, name);
    }
    eventPks.set(id, eventPks.size + 1);
    database
      .prepare(
        `INSERT INTO custom_events (event_pk, event_id, site_id, site_pk, visit_id, event_name_id,
          occurred_at, received_at, node_count, value_count)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, 0, 0)`,
      )
      .run(eventPks.get(id)!, id, SITE_ID, visit, names.get(name)!, at, at);
  }
  const paths = new Map<string, number>();
  for (const [event, path, value] of payloads) {
    if (!paths.has(path)) {
      paths.set(path, paths.size + 1);
      database
        .prepare(
          "INSERT INTO custom_event_json_paths (id, site_id, site_pk, path, last_seen_at) VALUES (?, ?, 1, ?, 0)",
        )
        .run(paths.get(path)!, SITE_ID, path);
    }
    database
      .prepare(
        "INSERT INTO custom_event_json_nodes (event_pk, node_id, path_id, value_type, depth) VALUES (?, 1, ?, 1, 1)",
      )
      .run(eventPks.get(event)!, paths.get(path)!);
    database
      .prepare(
        `INSERT INTO custom_event_json_values (event_pk, node_id, site_id, site_pk, event_name_id,
          path_id, occurred_at, value_type, string_value)
         VALUES (?, 1, ?, 1, 1, ?, 0, 1, ?)`,
      )
      .run(eventPks.get(event)!, SITE_ID, paths.get(path)!, value);
  }
  return test;
}

/** Three visitors on one site: two buy, one of them on the pro plan. */
const SHOP: Seed = {
  visits: [
    ["visit-1", "session-1", "visitor-1", 1, "/home"],
    ["visit-2", "session-1", "visitor-1", 61_000, "/buy"],
    ["visit-3", "session-2", "visitor-2", 61_001, "/buy"],
    ["visit-4", "session-3", "visitor-3", 62_000, "/home", "DE"],
  ],
  events: [
    ["event-1", "visit-2", "purchase", 121_000],
    ["event-2", "visit-2", "purchase", 125_000],
    ["event-3", "visit-4", "purchase", 126_000],
    ["event-4", "visit-3", "signup", 70_000],
  ],
  payloads: [["event-1", "/plan", "pro"]],
};

describe("goal conversions on D1", () => {
  it("counts every goal in one statement", async () => {
    const { env, preparedSql } = seed(SHOP);
    const goals = [
      { id: "buy-page", filter: dsl('page.path eq "/buy"') },
      { id: "purchase", filter: dsl('event.name eq "purchase"') },
      {
        id: "pro",
        filter: dsl(
          'event.name eq "purchase" AND event.payload("/plan") eq "pro"',
        ),
      },
    ];

    const result = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      EMPTY_FILTER_DOCUMENT,
      goals,
    );

    expect(preparedSql).toHaveLength(1);
    expect(preparedSql[0]).not.toContain("scope_raw");
    expect(preparedSql[0]!.match(/\bFROM visits v\b/gu)).toHaveLength(1);
    expect(preparedSql[0]!.match(/\bFROM custom_events ce\b/gu)).toHaveLength(
      1,
    );
    expect(result.totalSessions).toBe(3);
    expect(result.totalVisitors).toBe(3);
    expect(result.goals.get("buy-page")).toEqual({
      sessions: 2,
      visitors: 2,
      conversions: 2,
      revenue: null,
    });
    // A conversion is a custom event: two purchases by one visitor count twice.
    expect(result.goals.get("purchase")).toEqual({
      sessions: 2,
      visitors: 2,
      conversions: 3,
      revenue: null,
    });
    expect(result.goals.get("pro")).toEqual({
      sessions: 1,
      visitors: 1,
      conversions: 1,
      revenue: null,
    });
  });

  it("matches a goal of custom properties alone on custom events too", async () => {
    const { env } = seed(SHOP);
    const result = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      EMPTY_FILTER_DOCUMENT,
      [{ id: "pro", filter: dsl('event.payload("/plan") eq "pro"') }],
    );

    expect(result.goals.get("pro")).toEqual({
      sessions: 1,
      visitors: 1,
      conversions: 1,
      revenue: null,
    });
  });

  it("counts a session whose page view came before the window by its event in it", async () => {
    const { env } = seed({
      visits: [
        ["visit-0", "session-0", "visitor-0", -5_000, "/home"],
        ["visit-1", "session-1", "visitor-1", 1_000, "/home"],
      ],
      events: [["event-1", "visit-0", "purchase", 10_000]],
    });
    const result = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      EMPTY_FILTER_DOCUMENT,
      [{ id: "purchase", filter: dsl('event.name eq "purchase"') }],
    );

    expect(result.totalSessions).toBe(2);
    expect(result.totalVisitors).toBe(2);
    expect(result.goals.get("purchase")).toMatchObject({
      sessions: 1,
      visitors: 1,
      conversions: 1,
    });
  });

  it("counts within the dashboard's filter, a goal filter keeping the visits that converted", async () => {
    const { env } = seed(SHOP);
    const goals = [
      { id: "buy-page", filter: dsl('page.path eq "/buy"') },
      { id: "purchase", filter: dsl('event.name eq "purchase"') },
    ];

    const unitedStates = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      dsl('geo.country eq "US"'),
      goals,
    );
    expect(unitedStates.totalVisitors).toBe(2);
    expect(unitedStates.goals.get("purchase")).toMatchObject({
      visitors: 1,
      conversions: 2,
    });

    const signedUp = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      dsl('event.name eq "signup"'),
      goals,
    );
    // Only the signup's visit, so only its visitor, is left.
    expect(signedUp.totalVisitors).toBe(1);
    expect(signedUp.goals.get("buy-page")).toMatchObject({
      visitors: 1,
      conversions: 1,
    });
    // The filter keeps signups; a purchase is not one.
    expect(signedUp.goals.get("purchase")).toMatchObject({ visitors: 0 });
  });

  it("splits goals over statements only when D1's parameters run out", async () => {
    const { env, preparedSql } = seed(SHOP);
    const goals = Array.from({ length: 60 }, (_, index) => ({
      id: `goal-${index}`,
      filter: dsl(`page.path endsWith "/page-${index}"`),
    }));
    goals.push({ id: "buy", filter: dsl('page.path eq "/buy"') });

    const result = await queryGoalConversionsFromD1(
      env,
      SITE_ID,
      window,
      EMPTY_FILTER_DOCUMENT,
      goals,
    );

    expect(preparedSql.length).toBeGreaterThan(1);
    expect(result.goals.size).toBe(61);
    expect(result.goals.get("buy")).toMatchObject({ visitors: 2 });
    expect(result.goals.get("goal-0")).toMatchObject({ visitors: 0 });
    expect(result.totalVisitors).toBe(3);
  });
});

describe("goal timeseries on D1", () => {
  it("counts each identity once per bucket it was seen in, with half-open buckets", async () => {
    const { env } = seed({
      visits: [
        ["visit-1", "session-1", "visitor-1", 0, "/"],
        ["visit-2", "session-2", "visitor-2", 60_000, "/"],
        ["visit-3", "session-3", "visitor-3", 179_999, "/"],
        ["visit-4", "session-4", "visitor-4", 180_000, "/"],
      ],
      events: [
        ["event-1", "visit-1", "purchase", 59_999],
        // In the next bucket, after its page view.
        ["event-2", "visit-1", "purchase", 60_000],
        ["event-3", "visit-3", "purchase", 179_999],
        ["event-4", "visit-4", "purchase", 180_000],
      ],
    });

    expect(
      await queryGoalTimeseriesFromD1(
        env,
        SITE_ID,
        window,
        "minute",
        EMPTY_FILTER_DOCUMENT,
        dsl('event.name eq "purchase"'),
      ),
    ).toEqual([
      {
        bucket: 0,
        totalSessions: 1,
        convertedSessions: 1,
        totalVisitors: 1,
        convertedVisitors: 1,
      },
      {
        bucket: 1,
        totalSessions: 2,
        convertedSessions: 1,
        totalVisitors: 2,
        convertedVisitors: 1,
      },
      {
        bucket: 2,
        totalSessions: 1,
        convertedSessions: 1,
        totalVisitors: 1,
        convertedVisitors: 1,
      },
    ]);
  });

  it("buckets by calendar days in the reporting time zone across DST", async () => {
    const dstWindow: QueryWindow = {
      startMs: Date.parse("2026-03-08T00:00:00-05:00"),
      endExclusiveMs: Date.parse("2026-03-10T00:00:00-04:00"),
      nowMs: Date.parse("2026-03-10T00:00:00-04:00"),
      timeZone: "America/New_York",
    };
    const firstDay = Date.parse("2026-03-08T23:30:00-04:00");
    const secondDay = Date.parse("2026-03-09T00:30:00-04:00");
    const { env } = seed({
      visits: [
        ["visit-1", "session-1", "visitor-1", firstDay, "/buy"],
        ["visit-2", "session-2", "visitor-2", secondDay, "/buy"],
      ],
    });

    const rows = await queryGoalTimeseriesFromD1(
      env,
      SITE_ID,
      dstWindow,
      "day",
      EMPTY_FILTER_DOCUMENT,
      dsl('page.path eq "/buy"'),
    );
    expect(rows.map((row) => row.convertedVisitors)).toEqual([1, 1]);
  });

  it(`keeps a ${GOAL_TIMESERIES_MAX_BUCKETS}-bucket statement within D1's limits`, async () => {
    const { env, preparedSql } = seed(SHOP);
    const bucketWindow: QueryWindow = {
      startMs: 0,
      endExclusiveMs: GOAL_TIMESERIES_MAX_BUCKETS * 60_000,
      nowMs: GOAL_TIMESERIES_MAX_BUCKETS * 60_000,
      timeZone: "UTC",
    };

    const rows = await queryGoalTimeseriesFromD1(
      env,
      SITE_ID,
      bucketWindow,
      "minute",
      EMPTY_FILTER_DOCUMENT,
      dsl('event.name eq "purchase" AND event.payload("/plan") eq "pro"'),
    );

    expect(rows).toHaveLength(GOAL_TIMESERIES_MAX_BUCKETS);
    expect(rows.find((row) => row.convertedVisitors > 0)?.bucket).toBe(2);
    expect(
      new TextEncoder().encode(preparedSql[0]!).length,
    ).toBeLessThanOrEqual(D1_MAX_SQL_UTF8_BYTES);
    expect(preparedSql[0]!.match(/\?/gu)!.length).toBeLessThanOrEqual(
      D1_MAX_BOUND_PARAMETERS,
    );
  });
});
