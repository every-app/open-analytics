import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { applyD1Limits } from "@/lib/db/__tests__/sqlite-d1";
import {
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
  type FunnelConfigV2,
  normalizeFilterDocument,
} from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryEventAnalyticsContextCardsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/events-context";
import { queryEventFieldsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/events-fields";
import { queryEventTypeOverviewFromD1 } from "@/lib/edge/analytics/providers/d1/internal/events-overview";
import {
  type EventRecordCursor,
  queryEventRecordPageFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/events-records";
import { queryEventSummaryMetricsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/events-summary";
import {
  queryEventsTrendFromD1,
  queryEventTypeTrendFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/events-trend";
import {
  eventFilterSql,
  visitFilterSql,
} from "@/lib/edge/analytics/providers/d1/internal/filter-compiler";
import { queryFunnelAnalysis } from "@/lib/edge/analytics/providers/d1/internal/funnels";
import type { Env } from "@/lib/edge/types";
import {
  type FilterCondition,
  FilterOperator,
} from "@/lib/filter-contract/filters";

import { filterFixture } from "./filter-fixtures";

type Binding = string | number | null;
type D1Row = Record<string, unknown>;

class SqliteStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
    private readonly bindings: Binding[],
  ) {}

  async all<T extends D1Row>(): Promise<{ results: T[] }> {
    return {
      results: this.database
        .prepare(this.sql)
        .all(...this.bindings)
        .map((row) => ({ ...row }) as T),
    };
  }
}

class SqliteD1Database {
  readonly database = applyD1Limits(new DatabaseSync(":memory:"));
  readonly calls: Array<{ sql: string; bindings: Binding[] }> = [];

  prepare(sql: string) {
    return {
      bind: (...bindings: Binding[]) => {
        this.calls.push({ sql, bindings });
        return new SqliteStatement(this.database, sql, bindings);
      },
    };
  }

  close(): void {
    this.database.close();
  }
}

const siteId = "site-event-detail";
const eventName = "outbound_click";
const eventTime = Date.UTC(2026, 7, 14, 10);
const window: QueryWindow = {
  startMs: eventTime - 60 * 60 * 1000,
  endExclusiveMs: eventTime + 60 * 60 * 1000,
  nowMs: eventTime + 60 * 60 * 1000,
  timeZone: "UTC",
};

function funnelConfig(
  steps: FunnelConfigV2["steps"],
  progressionScope: FunnelConfigV2["progressionScope"] = "session",
  conversionWindowMs: number | null = null,
): FunnelConfigV2 {
  return {
    filterDslVersion: 1,
    progressionScope,
    conversionWindowMs,
    steps,
  };
}

function createSqliteEventEnv(): { env: Env; d1: SqliteD1Database } {
  const d1 = new SqliteD1Database();
  d1.database.exec(`
    CREATE TABLE site_identities (
      site_pk INTEGER PRIMARY KEY,
      site_id TEXT NOT NULL UNIQUE
    );
    INSERT INTO site_identities (site_pk, site_id)
      VALUES (1, '${siteId}');

    CREATE TABLE visits (
      visit_id TEXT PRIMARY KEY, site_id TEXT NOT NULL,
      site_pk INTEGER GENERATED ALWAYS AS (1) STORED,
      visitor_id TEXT NOT NULL DEFAULT '', session_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'closed', started_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL DEFAULT 0, ended_at INTEGER, finalized_at INTEGER,
      duration_ms INTEGER, scroll_depth INTEGER, duration_source TEXT, exit_reason TEXT,
      pathname TEXT NOT NULL DEFAULT '', query_string TEXT NOT NULL DEFAULT '',
      hash_fragment TEXT NOT NULL DEFAULT '', hostname TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '', referrer_url TEXT NOT NULL DEFAULT '',
      referrer_host TEXT NOT NULL DEFAULT '', utm_source TEXT NOT NULL DEFAULT '',
      utm_medium TEXT NOT NULL DEFAULT '', utm_campaign TEXT NOT NULL DEFAULT '',
      utm_term TEXT NOT NULL DEFAULT '', utm_content TEXT NOT NULL DEFAULT '',
      channel TEXT NOT NULL DEFAULT '', is_eu INTEGER NOT NULL DEFAULT 0, country TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '', region_code TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '', continent TEXT NOT NULL DEFAULT '', latitude REAL,
      longitude REAL, timezone TEXT NOT NULL DEFAULT '',
      browser TEXT NOT NULL DEFAULT '',
      browser_version TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '',
      os_version TEXT NOT NULL DEFAULT '', device_type TEXT NOT NULL DEFAULT '',
      screen_width INTEGER, screen_height INTEGER, language TEXT NOT NULL DEFAULT '',
      perf_ttfb_ms REAL, perf_fcp_ms REAL, perf_lcp_ms REAL, perf_cls REAL,
      perf_inp_ms REAL, ae_synced_at INTEGER
    );
    CREATE TABLE custom_event_names (
      id INTEGER PRIMARY KEY,
      site_id TEXT NOT NULL,
      site_pk INTEGER GENERATED ALWAYS AS (1) STORED,
      name TEXT NOT NULL,
      UNIQUE(site_id, name)
    );
    CREATE TABLE custom_events (
      event_pk INTEGER PRIMARY KEY, event_id TEXT NOT NULL, site_id TEXT NOT NULL,
      site_pk INTEGER GENERATED ALWAYS AS (1) STORED,
      visit_id TEXT NOT NULL, event_name_id INTEGER NOT NULL, occurred_at INTEGER NOT NULL,
      received_at INTEGER NOT NULL, sequence INTEGER NOT NULL, node_count INTEGER NOT NULL,
      value_count INTEGER NOT NULL, ae_synced_at INTEGER
    );
    CREATE TABLE custom_event_json_paths (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL,
      site_pk INTEGER GENERATED ALWAYS AS (1) STORED
    );
    CREATE TABLE visit_properties (
      visit_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
      site_pk INTEGER NOT NULL, started_at INTEGER NOT NULL,
      PRIMARY KEY (visit_id, key)
    );
    CREATE TABLE custom_event_json_values (
      event_pk INTEGER NOT NULL, path_id INTEGER NOT NULL, value_type INTEGER NOT NULL,
      occurred_at INTEGER NOT NULL, string_value TEXT, number_value REAL, boolean_value INTEGER,
      site_pk INTEGER GENERATED ALWAYS AS (1) STORED
    );
    CREATE INDEX idx_custom_events_site_pk_name_time
      ON custom_events(site_pk, event_name_id, occurred_at, event_pk);
    CREATE INDEX idx_custom_events_site_pk_time
      ON custom_events(site_pk, occurred_at, event_pk);
    CREATE INDEX idx_visits_site_pk_session_started_at
      ON visits(site_pk, session_id, started_at, visit_id);
    CREATE INDEX idx_visits_site_pk_started_at
      ON visits(site_pk, started_at);
  `);
  d1.database
    .prepare(
      `INSERT INTO visits (
      visit_id, site_id, visitor_id, session_id, started_at, pathname, hostname,
      title, referrer_url, referrer_host, country, region, city, continent, timezone,
      browser, browser_version, os, os_version, device_type,
      screen_width, screen_height, language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "visit-1",
      siteId,
      "visitor-1",
      "session-1",
      eventTime - 1,
      "/posts/minecraft-meteor-guide",
      "example.com",
      "Meteor guide",
      "https://www.google.com/",
      "www.google.com",
      "CN",
      "Zhejiang",
      "Hangzhou",
      "Asia",
      "Asia/Shanghai",
      "Edge",
      "140",
      "Windows",
      "11",
      "desktop",
      1920,
      1080,
      "zh-CN",
    );
  d1.database
    .prepare(
      "INSERT INTO custom_event_names (id, site_id, name) VALUES (?, ?, ?)",
    )
    .run(1, siteId, eventName);
  d1.database
    .prepare(
      `INSERT INTO visits (
        visit_id, site_id, visitor_id, session_id, started_at, pathname
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "visit-entry",
      siteId,
      "visitor-1",
      "session-1",
      eventTime - 2,
      "/entry",
    );
  d1.database
    .prepare(
      `INSERT INTO visits (
        visit_id, site_id, visitor_id, session_id, started_at, pathname
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "visit-exit",
      siteId,
      "visitor-1",
      "session-1",
      eventTime + 1,
      "/exit",
    );
  d1.database
    .prepare(
      "INSERT INTO custom_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      1,
      "event-1",
      siteId,
      "visit-1",
      1,
      eventTime,
      eventTime,
      1,
      1,
      1,
      null,
    );
  d1.database
    .prepare(
      "INSERT INTO custom_event_names (id, site_id, name) VALUES (?, ?, ?)",
    )
    .run(99, siteId, "purchase");
  d1.database
    .prepare(
      "INSERT INTO custom_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      99,
      "event-other-name",
      siteId,
      "visit-1",
      99,
      eventTime,
      eventTime,
      2,
      1,
      1,
      null,
    );
  d1.database
    .prepare("INSERT INTO custom_event_json_paths VALUES (?, ?)")
    .run(1, "/href");
  d1.database
    .prepare(
      "INSERT INTO custom_event_json_values VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(1, 1, 1, eventTime, "https://example.test/next", null, null);
  return {
    env: {
      DB: d1 as unknown as D1Database,
      MAIN_SECRET: "test-secret",
      INGEST_DO: {} as DurableObjectNamespace,
    },
    d1,
  } as { env: Env; d1: SqliteD1Database };
}

function truthCondition(
  field: string,
  value: string,
  operator = FilterOperator.Eq,
): FilterCondition {
  return {
    target: { kind: "field", field: field as never },
    operator,
    value,
  };
}

function truthPayload(value: string): FilterCondition {
  return {
    target: { kind: "event-payload", path: "/plan" as never },
    operator: FilterOperator.Eq,
    value,
  };
}

function seedFilterSemanticsTruthFixture(d1: SqliteD1Database): void {
  // Remove the event-detail seed so every expected relation ID belongs to
  // this fixture and the four final relations can be asserted directly.
  d1.database.exec(`
    DELETE FROM custom_event_json_values;
    DELETE FROM custom_events;
    DELETE FROM custom_event_json_paths;
    DELETE FROM custom_event_names;
    DELETE FROM visits;
  `);

  const visits = [
    [
      "truth-pricing",
      "truth-visitor-a",
      "truth-session-pricing",
      "/pricing",
      eventTime - 30,
    ],
    [
      "truth-home",
      "truth-visitor-b",
      "truth-session-home",
      "/home",
      eventTime - 29,
    ],
    [
      "truth-checkout",
      "truth-visitor-c",
      "truth-session-checkout",
      "/checkout",
      eventTime - 28,
    ],
    [
      "truth-outside",
      "truth-visitor-d",
      "truth-session-outside",
      "/pricing",
      window.startMs - 1,
    ],
    [
      "truth-cross-pricing",
      "truth-visitor-e",
      "truth-session-cross",
      "/pricing",
      eventTime - 27,
    ],
    [
      "truth-cross-event",
      "truth-visitor-e",
      "truth-session-cross",
      "/other",
      eventTime - 26,
    ],
    [
      "truth-visitor-pricing",
      "truth-visitor-f",
      "truth-session-visitor-a",
      "/pricing",
      eventTime - 25,
    ],
    [
      "truth-visitor-event",
      "truth-visitor-f",
      "truth-session-visitor-b",
      "/other",
      eventTime - 24,
    ],
    [
      "truth-multi-home",
      "truth-visitor-g",
      "truth-session-multi",
      "/home",
      eventTime - 23,
    ],
    [
      "truth-multi-pricing",
      "truth-visitor-g",
      "truth-session-multi",
      "/pricing",
      eventTime - 22,
    ],
  ] as const;
  const visitStatement = d1.database.prepare(
    `INSERT INTO visits (
      visit_id, site_id, visitor_id, session_id, started_at, pathname
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const [visitId, visitorId, sessionId, pathname, startedAt] of visits) {
    visitStatement.run(
      visitId,
      siteId,
      visitorId,
      sessionId,
      startedAt,
      pathname,
    );
  }

  d1.database
    .prepare(
      "INSERT INTO custom_event_names (id, site_id, name) VALUES (?, ?, ?)",
    )
    .run(110, siteId, "truth_purchase");
  d1.database
    .prepare(
      "INSERT INTO custom_event_names (id, site_id, name) VALUES (?, ?, ?)",
    )
    .run(111, siteId, "truth_other");

  const events = [
    [110, "truth-purchase-home", "truth-home", 110, 1],
    [111, "truth-purchase-free", "truth-checkout", 110, 2],
    [112, "truth-other-pro", "truth-checkout", 111, 3],
    [113, "truth-purchase-outside", "truth-outside", 110, 4],
    [114, "truth-purchase-cross", "truth-cross-event", 110, 5],
    [115, "truth-purchase-visitor", "truth-visitor-event", 110, 6],
  ] as const;
  const eventStatement = d1.database.prepare(
    "INSERT INTO custom_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const [eventPk, eventId, visitId, eventNameId, sequence] of events) {
    eventStatement.run(
      eventPk,
      eventId,
      siteId,
      visitId,
      eventNameId,
      eventTime,
      eventTime,
      sequence,
      1,
      1,
      null,
    );
  }
  d1.database
    .prepare("INSERT INTO custom_event_json_paths VALUES (?, ?)")
    .run(1, "/plan");
  d1.database
    .prepare(
      "INSERT INTO custom_event_json_values VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(111, 1, 1, eventTime, "free", null, null);
  d1.database
    .prepare(
      "INSERT INTO custom_event_json_values VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(112, 1, 1, eventTime, "pro", null, null);
}

/** The page views and custom events in the window that a filter matches. */
function readTruthIds(
  d1: SqliteD1Database,
  ...conditions: FilterCondition[]
): { visits: string[]; events: string[] } {
  const filters = normalizeFilterDocument(
    { conditions },
    analyticsFilterRegistry,
  );
  const scope = {
    siteId,
    startMs: window.startMs,
    endExclusiveMs: window.endExclusiveMs,
  };
  const read = (
    sql: string,
    predicate: ReturnType<typeof visitFilterSql>,
  ): string[] =>
    d1.database
      .prepare(`${sql} AND ${predicate?.text ?? "1"} ORDER BY 1`)
      .all(
        window.startMs,
        window.endExclusiveMs,
        ...((predicate?.bindings ?? []) as SQLInputValue[]),
      )
      .map((row) => String(row.id));
  return {
    visits: read(
      "SELECT v.visit_id AS id FROM visits v WHERE v.started_at >= ? AND v.started_at < ?",
      visitFilterSql(filters, scope),
    ),
    events: read(
      `SELECT ce.event_id AS id FROM custom_events ce
       JOIN custom_event_names cen ON cen.id = ce.event_name_id
       JOIN visits v ON v.visit_id = ce.visit_id
       WHERE ce.occurred_at >= ? AND ce.occurred_at < ?`,
      eventFilterSql(filters, scope),
    ),
  };
}

describe("event detail D1 SQL", () => {
  it("runs filtered event-record pages through one plain scan", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const page = await queryEventRecordPageFromD1(
        env,
        siteId,
        window,
        normalizeFilterDocument(
          { conditions: [truthCondition("geo.country", "CN")] },
          analyticsFilterRegistry,
        ),
        {
          limit: 50,
          sort: { key: "occurredAt", direction: "desc" },
        },
      );

      expect(page.rows.map((row) => row.eventId)).toEqual([
        "event-other-name",
        "event-1",
      ]);
      expect(d1.calls.at(-1)?.sql).toContain("FROM filtered_events es");
      expect(d1.calls.at(-1)?.sql).not.toContain("scope_");
    } finally {
      d1.close();
    }
  });

  it("uses the event-name index for the all-events trend source", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      await queryEventsTrendFromD1(
        env,
        siteId,
        window,
        "hour",
        EMPTY_FILTER_DOCUMENT,
        5,
        eventName,
      );
      const query = d1.calls[0];
      const plan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${query?.sql ?? "SELECT 1"}`)
        .all(...(query?.bindings ?? [])) as Array<{ detail: string }>;
      expect(query?.sql).toContain("ce.event_name_id = (SELECT id");
      expect(query?.sql).not.toContain("TRIM(COALESCE(es.event_name");
      expect(plan.map((row) => row.detail).join("\n")).toContain(
        "idx_custom_events_site_pk_name_time",
      );
    } finally {
      d1.close();
    }
  });

  it("filters events by their session's entry page", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const summary = await queryEventSummaryMetricsFromD1(
        env,
        siteId,
        window,
        filterFixture({ entry: "/entry" }),
      );
      expect(summary.events).toBe(2);
      const query = d1.calls.at(-1);
      expect(query?.sql).toContain("v.session_id IN");
      expect(query?.sql).toContain("ROW_NUMBER() OVER");
    } finally {
      d1.close();
    }
  });

  it("returns the same event context and payload data as the event records query", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const [records, overview, trend, fields, cards] = await Promise.all([
        queryEventRecordPageFromD1(env, siteId, window, EMPTY_FILTER_DOCUMENT, {
          limit: 25,
          sort: { key: "occurredAt", direction: "desc" },
          eventName,
        }),
        queryEventTypeOverviewFromD1(
          env,
          siteId,
          window,
          EMPTY_FILTER_DOCUMENT,
          eventName,
        ),
        queryEventTypeTrendFromD1(
          env,
          siteId,
          window,
          "hour",
          EMPTY_FILTER_DOCUMENT,
          eventName,
        ),
        queryEventFieldsFromD1(
          env,
          siteId,
          window,
          EMPTY_FILTER_DOCUMENT,
          eventName,
          100,
        ),
        queryEventAnalyticsContextCardsFromD1(
          env,
          siteId,
          window,
          EMPTY_FILTER_DOCUMENT,
          100,
          eventName,
        ),
      ]);

      expect(records.rows).toHaveLength(1);
      expect(overview.summary.events).toBe(1);
      expect(overview.summary.shareOfAllEvents).toBe(0.5);
      expect(trend.data.some((point) => point.events === 1)).toBe(true);
      expect(fields).toMatchObject([{ path: "/href", events: 1 }]);
      expect(cards.page.path).toMatchObject([
        { value: "/posts/minecraft-meteor-guide", views: 1 },
      ]);
      expect(cards.source.domain).toMatchObject([
        { value: "www.google.com", views: 1 },
      ]);
      expect(cards.client.browser).toMatchObject([{ value: "Edge", views: 1 }]);
      expect(cards.geo.country).toMatchObject([{ value: "CN", views: 1 }]);
      expect(cards.page.entry).toMatchObject([{ value: "/entry", views: 1 }]);
      expect(cards.page.exit).toMatchObject([{ value: "/exit", views: 1 }]);
      const cardQueries = d1.calls.filter(({ sql }) =>
        sql.includes("\ncard_rows AS"),
      );
      expect(cardQueries).toHaveLength(1);
      const cardQuery = cardQueries[0];
      // The cards' compound is grouped into four subqueries, as D1 needs.
      expect((cardQuery.sql.match(/SELECT \* FROM \(/g) ?? []).length).toBe(4);
      const cardPlan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${cardQuery.sql}`)
        .all(...cardQuery.bindings) as Array<{ detail: string }>;
      const cardPlanDetails = cardPlan.map((row) => row.detail).join("\n");
      expect(cardPlanDetails).toContain("MATERIALIZE filtered_events");
      expect(
        (cardPlanDetails.match(/MATERIALIZE filtered_events/g) ?? []).length,
      ).toBe(1);
      const overviewQuery = d1.calls.find(({ sql }) =>
        sql.includes("overview_card_rows AS"),
      );
      expect(overviewQuery).toBeDefined();
      expect(
        d1.calls.filter(({ sql }) => sql.includes("scoped_summary AS")),
      ).toHaveLength(1);
      expect((overviewQuery?.sql.match(/UNION ALL/g) ?? []).length).toBe(4);
      const plan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${overviewQuery?.sql ?? "SELECT 1"}`)
        .all(...(overviewQuery?.bindings ?? [])) as Array<{ detail: string }>;
      const planDetails = plan.map((row) => row.detail).join("\n");
      expect(planDetails).toContain("MATERIALIZE filtered_events");
      expect(planDetails).toContain("idx_custom_events_site_pk_name_time");
      expect(planDetails).toContain("idx_custom_events_site_pk_time");
      expect(planDetails.match(/SEARCH v /g) ?? []).toHaveLength(1);
      expect(overviewQuery?.sql).not.toContain("scoped_event_source AS");

      const entryExitPlan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${cardQuery.sql}`)
        .all(...cardQuery.bindings) as Array<{ detail: string }>;
      expect(entryExitPlan.map((row) => row.detail).join("\n")).toContain(
        "idx_visits_site_pk_session_started_at",
      );
    } finally {
      d1.close();
    }
  });

  it("matches offset ordering with keyset pages for every event-record sort", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      d1.database
        .prepare(
          `INSERT INTO visits (
            visit_id, site_id, visitor_id, session_id, started_at, pathname
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "visit-2",
          siteId,
          "visitor-2",
          "session-2",
          eventTime,
          "/pricing",
        );
      d1.database
        .prepare(
          "INSERT INTO custom_event_names (id, site_id, name) VALUES (?, ?, ?)",
        )
        .run(2, siteId, "Purchase");
      for (const [eventPk, eventId, visitId, eventNameId, occurredAt] of [
        [2, "event-2", "visit-1", 1, eventTime + 1],
        [3, "event-3", "visit-2", 2, eventTime + 1],
        [4, "event-4", "visit-2", 2, eventTime],
      ]) {
        d1.database
          .prepare(
            "INSERT INTO custom_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            eventPk,
            eventId,
            siteId,
            visitId,
            eventNameId,
            occurredAt,
            occurredAt,
            eventPk,
            1,
            1,
            null,
          );
      }

      for (const sort of [
        { key: "occurredAt", direction: "asc" },
        { key: "occurredAt", direction: "desc" },
        { key: "eventName", direction: "asc" },
        { key: "eventName", direction: "desc" },
        { key: "pathname", direction: "asc" },
        { key: "pathname", direction: "desc" },
      ] as const) {
        const expected = await queryEventRecordPageFromD1(
          env,
          siteId,
          window,
          EMPTY_FILTER_DOCUMENT,
          {
            limit: 20,
            sort,
          },
        );
        const received = [];
        let cursor = null;
        do {
          const page = await queryEventRecordPageFromD1(
            env,
            siteId,
            window,
            EMPTY_FILTER_DOCUMENT,
            {
              limit: 2,
              sort,
              cursor,
            },
          );
          received.push(...page.rows);
          cursor = page.nextCursor;
        } while (cursor);

        expect(received.map((row) => row.eventId)).toEqual(
          expected.rows.map((row) => row.eventId),
        );
      }

      const cursorQuery = d1.calls.at(-1);
      expect(cursorQuery?.sql).not.toContain("OFFSET");
      expect(cursorQuery?.sql).not.toContain("SELECT *");
      expect(cursorQuery?.sql).toContain("FROM filtered_events es");
      const plan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${cursorQuery?.sql ?? "SELECT 1"}`)
        .all(...(cursorQuery?.bindings ?? []));
      expect(plan.length).toBeGreaterThan(0);
    } finally {
      d1.close();
    }
  });

  it("uses the event-name index for filtered event records", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const records = await queryEventRecordPageFromD1(
        env,
        siteId,
        window,
        filterFixture({
          query: "",
          sourceLink: "https://www.google.com/",
          clientLanguage: "zh-CN",
          clientScreenSize: "1920x1080",
          geoContinent: "Asia",
          geoTimezone: "Asia/Shanghai",
        }),
        {
          limit: 25,
          sort: { key: "occurredAt", direction: "desc" },
          eventName: ` ${eventName} `,
        },
      );

      expect(records.rows.map((record) => record.eventId)).toEqual(["event-1"]);
      const query = d1.calls.at(-1);
      const plan = d1.database
        .prepare(`EXPLAIN QUERY PLAN ${query?.sql ?? "SELECT 1"}`)
        .all(...(query?.bindings ?? [])) as Array<{ detail: string }>;
      const planDetails = plan.map((row) => row.detail).join("\n");
      expect(query?.sql).toContain("ce.event_name_id = (SELECT id");
      expect(query?.sql).not.toContain("TRIM(COALESCE(es.event_name");
      expect(planDetails).toContain("idx_custom_events_site_pk_name_time");
      expect(query?.sql).toContain("v.query_string");
      expect(query?.sql).toContain("v.referrer_url");
      expect(query?.sql).toContain("v.screen_width");
      expect(query?.sql).toContain("v.timezone");
    } finally {
      d1.close();
    }
  });

  it("executes the funnel plan as one staged SQLite statement", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const analysis = await queryFunnelAnalysis(
        env,
        siteId,
        window,
        EMPTY_FILTER_DOCUMENT,
        funnelConfig([
          {
            id: "entry",
            filterDsl: 'page.path eq "/posts/minecraft-meteor-guide"',
          },
          { id: "click", filterDsl: `event.name eq "${eventName}"` },
        ]),
      );

      expect(analysis.progressionScope).toBe("session");
      expect(analysis.summary.totalProgressions).toBe(1);
      expect(analysis.summary.convertedProgressions).toBe(1);
      expect(d1.calls).toHaveLength(1);
      expect(d1.calls[0]?.sql).toContain("reached_0 AS");
      expect(d1.calls[0]?.sql).toContain("reached_1 AS");
    } finally {
      d1.close();
    }
  });

  it("applies page filters to the session scope without removing funnel steps", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const analysis = await queryFunnelAnalysis(
        env,
        siteId,
        window,
        filterFixture({ path: "/posts/minecraft-meteor-guide" }),
        funnelConfig([
          { id: "entry", filterDsl: 'page.path eq "/entry"' },
          {
            id: "guide",
            filterDsl: 'page.path eq "/posts/minecraft-meteor-guide"',
          },
          { id: "click", filterDsl: `event.name eq "${eventName}"` },
        ]),
      );

      expect(analysis.steps.map((step) => step.sessions)).toEqual([1, 1, 1]);
      expect(analysis.summary).toMatchObject({
        totalProgressions: 1,
        convertedProgressions: 1,
      });
      expect(d1.calls).toHaveLength(1);
    } finally {
      d1.close();
    }
  });

  it("uses event filters to select funnel sessions before loading page steps", async () => {
    const { env, d1 } = createSqliteEventEnv();
    const filters = normalizeFilterDocument(
      {
        conditions: [
          {
            target: { kind: "field", field: "event.name" },
            operator: "eq",
            value: eventName,
          },
        ],
      },
      analyticsFilterRegistry,
    );

    try {
      const analysis = await queryFunnelAnalysis(
        env,
        siteId,
        window,
        filters,
        funnelConfig([
          { id: "entry", filterDsl: 'page.path eq "/entry"' },
          { id: "click", filterDsl: `event.name eq "${eventName}"` },
        ]),
      );

      expect(analysis.steps.map((step) => step.sessions)).toEqual([1, 1]);
      expect(d1.calls).toHaveLength(1);
    } finally {
      d1.close();
    }
  });

  it("queries only requested context cards without building session edges", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const cards = await queryEventAnalyticsContextCardsFromD1(
        env,
        siteId,
        window,
        EMPTY_FILTER_DOCUMENT,
        100,
        eventName,
        ["path"],
      );

      expect(cards.page.path).toMatchObject([
        { value: "/posts/minecraft-meteor-guide", views: 1 },
      ]);
      expect(cards.page.entry).toEqual([]);
      expect(cards.source.domain).toEqual([]);
      const query = d1.calls.at(-1);
      expect(query?.sql).not.toContain("session_visit_edges");
      expect(query?.sql).toContain("'path' AS cardType");
      expect(query?.sql).not.toContain("'browser' AS cardType");
    } finally {
      d1.close();
    }
  });

  it("reads a filtered event's entry and exit pages from its whole session", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const cards = await queryEventAnalyticsContextCardsFromD1(
        env,
        siteId,
        window,
        filterFixture({ path: "/posts/minecraft-meteor-guide" }),
        100,
        eventName,
        ["entry", "exit"],
      );

      expect(cards.page.entry).toMatchObject([{ value: "/entry" }]);
      expect(cards.page.exit).toMatchObject([{ value: "/exit" }]);
    } finally {
      d1.close();
    }
  });

  it("skips unused event overview breakdowns without changing summary metrics", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      const overview = await queryEventTypeOverviewFromD1(
        env,
        siteId,
        window,
        EMPTY_FILTER_DOCUMENT,
        eventName,
        { includeBreakdowns: false },
      );

      expect(overview.summary).toMatchObject({
        events: 1,
        eventTypes: 1,
        shareOfAllEvents: 0.5,
      });
      expect(overview.breakdowns).toEqual({
        pages: [],
        countries: [],
        devices: [],
        browsers: [],
      });
      const query = d1.calls.at(-1);
      expect(query?.sql).not.toContain("'page' AS cardType");
      expect(query?.sql).not.toContain("'country' AS cardType");
    } finally {
      d1.close();
    }
  });

  it("filters the share of all events by the overview's filters too", async () => {
    const { env, d1 } = createSqliteEventEnv();

    try {
      await queryEventTypeOverviewFromD1(
        env,
        siteId,
        window,
        filterFixture({ path: "/posts/minecraft-meteor-guide" }),
        eventName,
        { includeBreakdowns: false },
      );

      const query = d1.calls.at(-1);
      expect(query?.sql).toContain("scoped_events AS");
      expect(
        query?.sql.match(/TRIM\(COALESCE\(v\.pathname, ''\)\) = \?/g),
      ).toHaveLength(2);
    } finally {
      d1.close();
    }
  });

  it("matches page views and events by the plain-scan rules", () => {
    const { d1 } = createSqliteEventEnv();
    seedFilterSemanticsTruthFixture(d1);

    const page = truthCondition("page.path", "/pricing");
    const purchase = truthCondition("event.name", "truth_purchase");

    try {
      // A page view field: the window's page views on the page, and the
      // events sent from such a page view.
      expect(readTruthIds(d1, page)).toEqual({
        visits: [
          "truth-cross-pricing",
          "truth-multi-pricing",
          "truth-pricing",
          "truth-visitor-pricing",
        ],
        events: ["truth-purchase-outside"],
      });
      // An event name: the page views that sent such an event in the window.
      expect(readTruthIds(d1, purchase)).toEqual({
        visits: [
          "truth-checkout",
          "truth-cross-event",
          "truth-home",
          "truth-visitor-event",
        ],
        events: [
          "truth-purchase-cross",
          "truth-purchase-free",
          "truth-purchase-home",
          "truth-purchase-outside",
          "truth-purchase-visitor",
        ],
      });
      // Both on the same page view.
      expect(readTruthIds(d1, page, purchase)).toEqual({
        visits: [],
        events: ["truth-purchase-outside"],
      });
      // "Is not" an event name: the page views that sent none.
      expect(
        readTruthIds(
          d1,
          truthCondition("event.name", "truth_purchase", FilterOperator.Neq),
        ),
      ).toEqual({
        visits: [
          "truth-cross-pricing",
          "truth-multi-home",
          "truth-multi-pricing",
          "truth-pricing",
          "truth-visitor-pricing",
        ],
        events: ["truth-other-pro"],
      });
      // An event name and a property: the same event carries both.
      expect(
        readTruthIds(
          d1,
          truthCondition("event.name", "truth_other"),
          truthPayload("pro"),
        ),
      ).toEqual({ visits: ["truth-checkout"], events: ["truth-other-pro"] });
      expect(readTruthIds(d1, purchase, truthPayload("pro"))).toEqual({
        visits: [],
        events: [],
      });
      // A property alone: page views whose own events carry it.
      expect(readTruthIds(d1, truthPayload("free"))).toEqual({
        visits: ["truth-checkout"],
        events: ["truth-purchase-free"],
      });
      expect(
        readTruthIds(
          d1,
          truthCondition("page.path", "/home", FilterOperator.Neq),
        ).visits,
      ).toEqual([
        "truth-checkout",
        "truth-cross-event",
        "truth-cross-pricing",
        "truth-multi-pricing",
        "truth-pricing",
        "truth-visitor-event",
        "truth-visitor-pricing",
      ]);
    } finally {
      d1.close();
    }
  });
});
