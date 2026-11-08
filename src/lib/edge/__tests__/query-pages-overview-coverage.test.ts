import type { DatabaseSync } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import {
  createQueryTime,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import { handleFilterValuesContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/filter-values";
import {
  handleOverviewContract as handleOverview,
  handleTrendContract as handleTrend,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import { handleOverviewGeoPointsContract as handleOverviewGeoPoints } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-extras";
import { handleOverviewTabContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-tabs";
import {
  handlePagesContract as handlePages,
  handlePagesDashboardContract as handlePagesDashboard,
  handleReferrersContract as handleReferrers,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/pages";
import {
  mapDimensionRows,
  type QueryWindow,
} from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryDimensionFromD1 } from "@/lib/edge/analytics/providers/d1/internal/dimensions";
import {
  queryLatestSiteActivity,
  queryOverviewFromD1,
  queryTrendAggregate,
} from "@/lib/edge/analytics/providers/d1/internal/overview";
import { queryPageCardMetricsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/pages";
import { queryPagesDashboard } from "@/lib/edge/analytics/providers/d1/internal/pages-dashboard";
import {
  decodeReferrersCursor,
  queryReferrersPageFromD1,
  queryTopReferrersFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/referrers";
import type { Env } from "@/lib/edge/types";

import { filterFixture } from "./filter-fixtures";
type D1Row = Record<string, unknown>;
type QueryBinding = string | number | null;
interface QueryCall {
  sql: string;
  bindings: QueryBinding[];
}
const siteId = "site-pages";
const baseMs = Date.UTC(2026, 0, 2, 1);
const window: QueryWindow = {
  startMs: baseMs,
  endExclusiveMs: baseMs + 2 * 60 * 60 * 1000,
  nowMs: baseMs + 3 * 60 * 60 * 1000,
  timeZone: "UTC",
};
function createD1Env(
  resultSets: D1Row[][],
  rowsRead?: number,
): {
  env: Env;
  calls: QueryCall[];
  prepare: ReturnType<typeof vi.fn>;
} {
  const calls: QueryCall[] = [];
  const pendingResults = [...resultSets];
  const prepare = vi.fn((sql: string) => ({
    bind: vi.fn((...bindings: QueryBinding[]) => ({
      all: vi.fn(async () => {
        // No site has rolled-up days here, so reads take the raw path.
        if (sql.includes("FROM visit_rollup_state")) return { results: [] };
        calls.push({ sql, bindings });
        return {
          results: pendingResults.shift() ?? [],
          ...(rowsRead === undefined ? {} : { meta: { rows_read: rowsRead } }),
        };
      }),
    })),
  }));

  return {
    env: {
      DB: { prepare } as unknown as D1Database,
      MAIN_SECRET: "test-secret",
      INGEST_DO: {} as DurableObjectNamespace,
    },
    calls,
    prepare,
  };
}
function createAnalyticsDatabase(): DatabaseSync {
  const database = createMigratedDatabase();
  database
    .prepare("INSERT INTO site_identities (site_pk, site_id) VALUES (1, ?)")
    .run(siteId);
  return database;
}
function createScopedOverviewSqliteEnv(): {
  env: Env;
  database: DatabaseSync;
  close: () => void;
} {
  const database = createAnalyticsDatabase();
  const env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...bindings: QueryBinding[]) => ({
          all: async () => ({
            results: database.prepare(sql).all(...bindings) as D1Row[],
          }),
        }),
      }),
    },
  } as unknown as Env;
  return { env, database, close: () => database.close() };
}
function visitBindings(targetWindow = window): QueryBinding[] {
  return [siteId, targetWindow.startMs, targetWindow.endExclusiveMs];
}
function url(path: string, params: Record<string, string | number | boolean>) {
  const parsed = new URL(`https://edge.test${path}`);
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, String(value));
  }
  return parsed;
}
describe("edge pages D1 queries", () => {
  it("dedupes page card path filters, applies pagination, and maps aggregate rows", async () => {
    const { env, calls } = createD1Env([
      [
        {
          pathname: "/pricing",
          views: "8",
          sessions: "4",
          visitors: "3",
          bounces: "1",
          totalDuration: "120000",
          scrollDepth: 62,
        },
      ],
    ]);

    await expect(
      queryPageCardMetricsFromD1(
        env,
        siteId,
        window,
        filterFixture({ browser: "Chrome" }),
        {
          pathnames: [" /pricing ", "/pricing", "", "/docs"],
          limit: 10,
          cursor: null,
        },
      ),
    ).resolves.toEqual([
      {
        pathname: "/pricing",
        views: 8,
        sessions: 4,
        visitors: 3,
        bounces: 1,
        totalDuration: 120000,
        durationViews: 0,
        scrollDepth: 62,
      },
    ]);

    expect(calls[0].sql).toContain("path_bounce_rollup AS");
    expect(calls[0].sql).toContain(
      "TRIM(COALESCE(pathname, '')) IN (SELECT value FROM json_each(?))",
    );
    expect(calls[0].sql).toContain("LIMIT ?");
    expect(calls[0].sql).not.toContain("OFFSET");
    expect(calls[0].bindings).toEqual([
      ...visitBindings(),
      "Chrome",
      JSON.stringify(["/pricing", "/docs"]),
      10,
    ]);
  });

  it("maps sparse page card rows without pagination options", async () => {
    const { env, calls } = createD1Env([
      [
        {
          pathname: null,
          views: undefined,
          sessions: null,
          visitors: undefined,
          bounces: null,
          totalDuration: undefined,
          durationViews: null,
        },
      ],
    ]);

    await expect(
      queryPageCardMetricsFromD1(
        env,
        siteId,
        window,
        EMPTY_FILTER_DOCUMENT,
        undefined,
      ),
    ).resolves.toEqual([
      {
        pathname: "",
        views: 0,
        sessions: 0,
        visitors: 0,
        bounces: 0,
        totalDuration: 0,
        durationViews: 0,
        scrollDepth: null,
      },
    ]);
    expect(calls[0].sql).not.toContain("LIMIT ? OFFSET ?");
    expect(calls[0].bindings).toEqual(visitBindings());
  });

  it("materializes page-card visits once while preserving path-level bounces", async () => {
    const database = createAnalyticsDatabase();
    const calls: QueryCall[] = [];
    const env = {
      DB: {
        prepare: (sql: string) => ({
          bind: (...bindings: QueryBinding[]) => {
            const call = { sql, bindings };
            calls.push(call);
            return {
              all: async () => ({
                results: database.prepare(sql).all(...bindings) as D1Row[],
              }),
            };
          },
        }),
      } as unknown as D1Database,
    } as Env;
    const insert = database.prepare(`
      INSERT INTO visits (
        site_pk, visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, pathname, hostname, duration_ms
      ) VALUES (1, ?, ?, ?, ?, 'closed', ?, ?, ?, 'example.test', ?)
    `);

    try {
      insert.run(
        "root-first",
        siteId,
        "visitor-1",
        "session-1",
        baseMs,
        baseMs,
        "/",
        100,
      );
      insert.run(
        "root-last",
        siteId,
        "visitor-1",
        "session-1",
        baseMs + 1,
        baseMs + 1,
        "/",
        200,
      );
      insert.run(
        "pricing-first",
        siteId,
        "visitor-1",
        "session-2",
        baseMs + 2,
        baseMs + 2,
        "/pricing",
        50,
      );
      insert.run(
        "pricing-second",
        siteId,
        "visitor-2",
        "session-3",
        baseMs + 3,
        baseMs + 3,
        "/pricing",
        null,
      );
      insert.run(
        "outside-window",
        siteId,
        "visitor-3",
        "session-4",
        window.endExclusiveMs,
        window.endExclusiveMs,
        "/pricing",
        999,
      );

      await expect(
        queryPageCardMetricsFromD1(
          env,
          siteId,
          window,
          EMPTY_FILTER_DOCUMENT,
          undefined,
        ),
      ).resolves.toEqual([
        {
          pathname: "/pricing",
          views: 2,
          sessions: 2,
          visitors: 2,
          bounces: 2,
          totalDuration: 50,
          durationViews: 0,
          scrollDepth: null,
        },
        {
          pathname: "/",
          views: 2,
          sessions: 1,
          visitors: 1,
          bounces: 0,
          totalDuration: 300,
          durationViews: 0,
          scrollDepth: null,
        },
      ]);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.sql).toContain("page_visits AS MATERIALIZED");
      const plan = database
        .prepare(`EXPLAIN QUERY PLAN ${calls[0]?.sql ?? "SELECT 1"}`)
        .all(...(calls[0]?.bindings ?? [])) as Array<{ detail: string }>;
      expect(
        plan.filter((row) => row.detail.includes("SEARCH v USING INDEX")),
      ).toHaveLength(1);
      expect(
        plan.some((row) =>
          row.detail.includes("idx_visits_site_pk_started_at"),
        ),
      ).toBe(true);
    } finally {
      database.close();
    }
  });

  it("filters each side of a dashboard comparison with its own scan", async () => {
    const dashboard = createD1Env([[], []]);
    const time = (startMs: number, endExclusiveMs: number) =>
      createQueryTime(startMs, endExclusiveMs, "UTC", window.nowMs);
    await queryPagesDashboard(dashboard.env, siteId, {
      window,
      filters: filterFixture({ path: "/pricing" }),
      interval: "day",
      page: { limit: 1, cursor: null },
      comparison: {
        current: {
          time: time(window.startMs, window.endExclusiveMs),
          filters: filterFixture({ path: "/pricing" }),
        },
        reference: {
          time: time(window.startMs - 2 * 60 * 60 * 1000, window.startMs),
          filters: filterFixture({ path: "/docs" }),
        },
        metric: "views",
        sortBy: "current",
        direction: "desc",
      },
    });
    expect(dashboard.calls[0]?.sql).toContain("current_filtered_visits AS");
    expect(dashboard.calls[0]?.sql).toContain("reference_filtered_visits AS");
    expect(dashboard.calls[0]?.bindings).toEqual(
      expect.arrayContaining(["/pricing", "/docs"]),
    );
  });
});
describe("edge paginated page and referrer readers", () => {
  it("paginates referrers with search, alternate sorting, and full URLs", async () => {
    const filters = EMPTY_FILTER_DOCUMENT;
    const first = createD1Env([
      [
        { referrer: "google.com", views: 10, sessions: 7, visitors: 6 },
        { referrer: "news.example", views: 8, sessions: 5, visitors: 4 },
      ],
    ]);
    const firstPage = await queryReferrersPageFromD1(
      first.env,
      siteId,
      window,
      filters,
      1,
      true,
      " News ",
      null,
      undefined,
      "public-share",
      "visitors",
      "asc",
    );

    expect(firstPage.items).toEqual([
      { referrer: "google.com", views: 10, sessions: 7, visitors: 6 },
    ]);
    expect(firstPage.pagination).toMatchObject({
      hasMore: true,
      nextCursor: expect.any(String),
    });
    expect(first.calls[0].sql).toContain("referrer_url");
    expect(first.calls[0].sql).toContain("HAVING LOWER(referrer) LIKE");

    const cursor = await decodeReferrersCursor(
      first.env,
      siteId,
      window,
      filters,
      true,
      " News ",
      firstPage.pagination.nextCursor,
      "public-share",
      "visitors",
      "asc",
    );
    expect(cursor).toEqual({
      primary: 6,
      secondary: 10,
      referrer: "google.com",
    });

    const second = createD1Env([
      [{ referrer: "news.example", views: 8, sessions: 5, visitors: 4 }],
    ]);
    await expect(
      queryReferrersPageFromD1(
        second.env,
        siteId,
        window,
        filters,
        2,
        false,
        undefined,
        cursor,
        undefined,
        "private-dashboard",
        "views",
        "desc",
      ),
    ).resolves.toMatchObject({
      items: [{ referrer: "news.example" }],
      pagination: { hasMore: false },
    });
    expect(second.calls[0].sql).toContain("referrer_host");
    expect(second.calls[0].bindings).toContain(10);
  });

  it("returns an empty dashboard page without loading comparison details", async () => {
    const { env, calls } = createD1Env([[]]);
    await expect(
      queryPagesDashboard(env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        page: { limit: 3, cursor: null },
      }),
    ).resolves.toMatchObject({
      items: [],
      pagination: { limit: 3, returned: 0, hasMore: false, nextCursor: null },
    });
    expect(calls).toHaveLength(1);
  });

  it("keeps the legacy aggregate wrappers and enriches non-empty dashboard pages", async () => {
    await expect(
      queryTopReferrersFromD1(
        createD1Env([[{ referrer: "news.example", views: 3, sessions: 2 }]])
          .env,
        siteId,
        window,
        EMPTY_FILTER_DOCUMENT,
        10,
        false,
      ),
    ).resolves.toEqual([
      { referrer: "news.example", views: 3, sessions: 2, visitors: 0 },
    ]);

    const dashboard = createD1Env([
      [
        {
          pathname: "/docs",
          views: 10,
          sessions: 5,
          visitors: 4,
          bounces: 1,
          totalDuration: 5_000,
          durationViews: 4,
        },
      ],
      [
        {
          pathname: "/docs",
          views: 8,
          sessions: 4,
          visitors: 3,
          bounces: 2,
          totalDuration: 4_000,
          durationViews: 3,
        },
      ],
      [
        {
          rowKind: "title",
          pathname: "/docs",
          title: "Docs",
          views: 5,
          rowOrder: 1,
        },
        {
          rowKind: "title",
          pathname: "/docs",
          title: "Docs",
          views: 4,
          rowOrder: 2,
        },
        {
          rowKind: "title",
          pathname: "/docs",
          title: "Reference",
          views: 3,
          rowOrder: 3,
        },
        {
          rowKind: "title",
          pathname: "/docs",
          title: "",
          views: 2,
          rowOrder: 4,
        },
        {
          rowKind: "trend",
          pathname: "/docs",
          bucket: 0,
          views: 5,
          visitors: 3,
          rowOrder: 0,
        },
        {
          rowKind: "other",
          pathname: "/docs",
          bucket: 1,
          views: 1,
          visitors: 1,
          rowOrder: 1,
        },
      ],
    ]);
    await expect(
      queryPagesDashboard(dashboard.env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        page: { limit: 3, cursor: null },
      }),
    ).resolves.toMatchObject({
      items: [
        {
          pathname: "/docs",
          titles: ["Docs", "Reference"],
          trend: [{ views: 5, visitors: 3 }],
        },
      ],
      pagination: { limit: 3, returned: 1, hasMore: false, nextCursor: null },
    });
    expect(dashboard.calls).toHaveLength(3);
  });

  it("decodes a dashboard cursor before loading the next page", async () => {
    const rows = (pathname: string, views: number, sessions: number) => ({
      pathname,
      views,
      sessions,
      visitors: views,
      bounces: 0,
      totalDuration: 1_000,
      durationViews: 1,
    });
    const first = createD1Env([
      [rows("/first", 10, 5), rows("/second", 8, 4)],
      [],
      [],
    ]);
    const firstPage = await queryPagesDashboard(first.env, siteId, {
      window,
      filters: EMPTY_FILTER_DOCUMENT,
      interval: "day",
      page: { limit: 1, cursor: null },
    });
    expect(firstPage.pagination.nextCursor).toEqual(expect.any(String));

    const second = createD1Env([[rows("/second", 8, 4)], [], []]);
    await expect(
      queryPagesDashboard(second.env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        page: { limit: 1, cursor: firstPage.pagination.nextCursor },
      }),
    ).resolves.toMatchObject({
      items: [{ pathname: "/second" }],
      pagination: { hasMore: false, nextCursor: null },
    });
    expect(second.calls[0].sql).toContain("pathname > ?");
  });

  it("aggregates current and comparison page rows in one dashboard request", async () => {
    const comparison = {
      current: {
        time: createQueryTime(
          window.startMs,
          window.endExclusiveMs,
          window.timeZone,
          window.nowMs,
        ),
        filters: EMPTY_FILTER_DOCUMENT,
      },
      reference: {
        time: createQueryTime(
          window.startMs - 2 * 60 * 60 * 1000,
          window.startMs,
          window.timeZone,
          window.nowMs,
        ),
        filters: EMPTY_FILTER_DOCUMENT,
      },
      metric: "views" as const,
      sortBy: "current" as const,
      direction: "desc" as const,
    };
    const rows = (
      pathname: string,
      currentViews: number,
      referenceViews: number,
    ) => ({
      pathname,
      current_views: currentViews,
      current_sessions: 2,
      current_visitors: 2,
      current_bounces: 1,
      current_total_duration: 4_000,
      current_duration_views: 0,
      reference_views: referenceViews,
      reference_sessions: 1,
      reference_visitors: 1,
      reference_bounces: 1,
      reference_total_duration: 2_000,
      reference_duration_views: 0,
    });
    const first = createD1Env([
      [rows("/current", 10, 5), rows("/next", 8, 4)],
      [
        {
          rowKind: "title",
          pathname: "/current",
          title: "Current",
          views: 3,
          rowOrder: 1,
        },
      ],
    ]);
    const firstPage = await queryPagesDashboard(first.env, siteId, {
      window,
      filters: EMPTY_FILTER_DOCUMENT,
      interval: "day",
      page: { limit: 1, cursor: null },
      comparison,
    });
    expect(firstPage.items[0]).toMatchObject({
      pathname: "/current",
      metrics: { views: 10, sessions: 2 },
      reference: { views: 5, sessions: 1 },
      change: {
        views: { absolute: 5, relative: 100 },
      },
    });
    expect(firstPage.pagination).toMatchObject({
      hasMore: true,
      nextCursor: expect.any(String),
    });

    const second = createD1Env([[rows("/next", 8, 4)], []]);
    await expect(
      queryPagesDashboard(second.env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        page: { limit: 1, cursor: firstPage.pagination.nextCursor },
        comparison,
      }),
    ).resolves.toMatchObject({
      items: [{ pathname: "/next" }],
      pagination: { hasMore: false, nextCursor: null },
    });
    expect(first.calls[0].sql).toContain("current_metrics");
    expect(first.calls[0].sql).toContain("reference_metrics");
    expect(second.calls[0].sql).toContain("change_relative");

    const changeComparison = { ...comparison, sortBy: "change" as const };
    const changeFirst = createD1Env([
      [rows("/a", 10, 5), rows("/b", 8, 4)],
      [],
    ]);
    const changeFirstPage = await queryPagesDashboard(changeFirst.env, siteId, {
      window,
      filters: EMPTY_FILTER_DOCUMENT,
      interval: "day",
      page: { limit: 1, cursor: null },
      comparison: changeComparison,
    });
    const changeSecond = createD1Env([[rows("/b", 8, 4)], []]);
    await expect(
      queryPagesDashboard(changeSecond.env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        page: {
          limit: 1,
          cursor: changeFirstPage.pagination.nextCursor,
        },
        comparison: changeComparison,
      }),
    ).resolves.toMatchObject({ items: [{ pathname: "/b" }] });
    expect(changeSecond.calls[0].sql).toContain("change_class");
  });

  it("supports page dashboard metric and comparison ordering variants", async () => {
    const comparisonBase = {
      current: {
        time: createQueryTime(
          window.startMs,
          window.endExclusiveMs,
          window.timeZone,
          window.nowMs,
        ),
        filters: EMPTY_FILTER_DOCUMENT,
      },
      reference: {
        time: createQueryTime(
          window.startMs - 2 * 60 * 60 * 1000,
          window.startMs,
          window.timeZone,
          window.nowMs,
        ),
        filters: EMPTY_FILTER_DOCUMENT,
      },
      direction: "asc" as const,
    };
    const row = {
      pathname: "/docs",
      current_views: 10,
      current_sessions: 5,
      current_visitors: 4,
      current_bounces: 1,
      current_total_duration: 5_000,
      current_duration_views: 0,
      reference_views: 8,
      reference_sessions: 4,
      reference_visitors: 3,
      reference_bounces: 2,
      reference_total_duration: 4_000,
      reference_duration_views: 0,
    };
    for (const metric of [
      "views",
      "visitors",
      "sessions",
      "bounceRate",
      "pagesPerSession",
      "avgDurationMs",
    ] as const) {
      for (const sortBy of ["current", "reference", "change"] as const) {
        const { env } = createD1Env([[row], []]);
        await queryPagesDashboard(env, siteId, {
          window,
          filters: EMPTY_FILTER_DOCUMENT,
          interval: "day",
          search: "docs",
          page: { limit: 1, cursor: null },
          comparison: { ...comparisonBase, metric, sortBy },
        });
      }
    }
    const normalRow = {
      pathname: "/docs",
      views: 3,
      sessions: 2,
      visitors: 2,
      bounces: 1,
      totalDuration: 1_000,
    };
    for (const key of [
      "views",
      "visitors",
      "sessions",
      "bounceRate",
      "pagesPerSession",
      "avgDurationMs",
    ] as const) {
      const cursorRow =
        key === "pagesPerSession" || key === "avgDurationMs"
          ? { ...normalRow, sessions: 0 }
          : normalRow;
      const normal = createD1Env([
        [cursorRow, { ...normalRow, pathname: "/next", views: 2 }],
        [],
        [],
      ]);
      await queryPagesDashboard(normal.env, siteId, {
        window,
        filters: EMPTY_FILTER_DOCUMENT,
        interval: "day",
        search: "docs",
        sort: { key, direction: "asc" },
        page: { limit: 1, cursor: null },
      });
      expect(normal.calls[0].sql).toContain("LOWER(pr.pathname) LIKE");
      expect(normal.calls[0].sql).toContain(`ORDER BY pr.${key} asc`);
    }
  });
});
describe("edge pages handlers", () => {
  it("maps the filtered pages report from one plain scan", async () => {
    const { env, calls } = createD1Env([
      [
        { pathname: "/home", views: 7, sessions: 2 },
        { pathname: "/pricing", views: null, sessions: undefined },
      ],
    ]);

    const response = await handlePages(
      env,
      siteId,
      url("/pages", {
        from: window.startMs,
        to: window.endExclusiveMs,
        "filter[geo.country]": "US",
        limit: 5,
      }),
      undefined,
      siteQueryContext(siteId, "public-share"),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [
          { pathname: "/home", views: 7, sessions: 2 },
          { pathname: "/pricing", views: 0, sessions: 0 },
        ],
        pagination: {
          limit: 5,
          returned: 2,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("FROM filtered_visits");
    expect(calls[0].bindings).toEqual([...visitBindings(), "us", 6]);
  });

  it("maps referrer handler rows with full URL mode and filters", async () => {
    const { env, calls } = createD1Env([
      [
        {
          referrer: "https://news.example/post",
          views: "6",
          sessions: "3",
          visitors: "2",
        },
      ],
    ]);

    const response = await handleReferrers(
      env,
      siteId,
      url("/referrers", {
        from: window.startMs,
        to: window.endExclusiveMs,
        fullUrl: true,
        "filter[client.browser]": "Chrome",
        limit: 7,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [
          {
            referrer: "https://news.example/post",
            views: 6,
            sessions: 3,
          },
        ],
        pagination: {
          limit: 7,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(calls[0].sql).toContain("COALESCE(referrer_url, '') AS referrer");
    expect(calls[0].bindings.slice(-2)).toEqual(["Chrome", 8]);
  });

  it("maps dimension aggregate rows and drops geo filters before querying", async () => {
    const { env, calls } = createD1Env([
      [
        {
          value: "Chrome",
          views: "5",
          sessions: "3",
          visitors: "2",
        },
      ],
    ]);

    const rows = await queryDimensionFromD1(
      env,
      siteId,
      window,
      filterFixture({ device: "desktop" }),
      4,
      "browser",
    );

    expect(mapDimensionRows(rows)).toEqual([
      {
        key: "Chrome",
        label: "Chrome",
        views: 5,
        sessions: 3,
        visitors: 2,
      },
    ]);
    expect(calls[0].sql).toContain("COALESCE(browser, '') AS value");
    expect(calls[0].bindings).toEqual([...visitBindings(), "desktop", 4]);
  });

  it("returns an empty dashboard page without loading previous, titles, or trend rows", async () => {
    const { env, calls } = createD1Env([[]]);

    const response = await handlePagesDashboard(
      env,
      siteId,
      url("/pages/dashboard", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
        interval: "hour",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      interval: "hour",
      data: {
        items: [],
        pagination: {
          limit: 4,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].bindings.at(-1)).toBe(5);
  });

  it("parses dashboard comparison controls and custom reference filters", async () => {
    const { env, calls } = createD1Env([
      [
        {
          pathname: "/docs",
          current_views: 4,
          current_sessions: 2,
          current_visitors: 2,
          current_bounces: 1,
          current_total_duration: 2000,
          current_duration_views: 0,
          reference_views: 2,
          reference_sessions: 1,
          reference_visitors: 1,
          reference_bounces: 1,
          reference_total_duration: 1000,
          reference_duration_views: 0,
        },
      ],
      [],
    ]);
    const response = await handlePagesDashboard(
      env,
      siteId,
      new URL(
        `https://edge.test/pages/dashboard?from=${window.startMs}&to=${window.endExclusiveMs}&limit=1&compare=previous&metric=avgDurationMs&sortBy=reference&direction=asc&search=docs&compareFilter%5Bpage.path%5D=%2Fdocs`,
      ),
    );

    expect(response.status).toBe(200);
    expect(calls[0]?.sql).toContain("current_metrics");
    expect(calls[0]?.sql).toContain("reference_metrics");
    await expect(response.json()).resolves.toMatchObject({
      data: { items: [{ pathname: "/docs", reference: { views: 2 } }] },
    });
  });

  it("rejects invalid dashboard comparison controls before querying D1", async () => {
    const requests = ["sort=invalid", "direction=sideways", "compare=invalid"];
    for (const control of requests) {
      const { env, calls } = createD1Env([]);
      const response = await handlePagesDashboard(
        env,
        siteId,
        new URL(
          `https://edge.test/pages/dashboard?from=${window.startMs}&to=${window.endExclusiveMs}&${control}`,
        ),
      );
      expect(response.status).toBe(400);
      expect(calls).toHaveLength(0);
    }
  });

  it("treats same-period comparison without a reference filter as inactive", async () => {
    const { env, calls } = createD1Env([[]]);
    const response = await handlePagesDashboard(
      env,
      siteId,
      new URL(
        `https://edge.test/pages/dashboard?from=${window.startMs}&to=${window.endExclusiveMs}&compare=same`,
      ),
    );
    expect(response.status).toBe(200);
    expect(calls[0]?.sql).toContain("path_metrics");
    expect(calls[0]?.sql).not.toContain("current_metrics");
  });

  it("rejects invalid dashboard cursors before querying D1", async () => {
    const { env, calls } = createD1Env([]);

    const response = await handlePagesDashboard(
      env,
      siteId,
      url("/pages/dashboard", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 24,
        cursor: "invalid-cursor",
      }),
    );

    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("maps dashboard cards, titles, trends, previous changes, and hasMore pagination", async () => {
    const currentRows = [
      {
        pathname: "/pricing",
        views: 10,
        sessions: 5,
        visitors: 4,
        bounces: 1,
        totalDuration: 50000,
      },
      {
        pathname: "/docs",
        views: 4,
        sessions: 2,
        visitors: 2,
        bounces: 2,
        totalDuration: 20000,
      },
      {
        pathname: "/more",
        views: 1,
        sessions: 1,
        visitors: 1,
        bounces: 1,
        totalDuration: 1000,
      },
    ];
    const { env, calls } = createD1Env([
      currentRows,
      [
        {
          pathname: "/pricing",
          views: 5,
          sessions: 5,
          visitors: 2,
          bounces: 2,
          totalDuration: 25000,
        },
      ],
      [
        {
          rowKind: "title",
          pathname: "/pricing",
          title: " Pricing ",
          views: 8,
        },
        {
          rowKind: "title",
          pathname: "/pricing",
          title: "Pricing",
          views: 2,
        },
        { rowKind: "title", pathname: "/docs", title: "Docs", views: 4 },
        {
          rowKind: "trend",
          pathname: "/pricing",
          bucket: 0,
          views: 6,
          visitors: 3,
        },
        {
          rowKind: "trend",
          pathname: "/docs",
          bucket: 1,
          views: 4,
          visitors: 2,
        },
      ],
    ]);

    const response = await handlePagesDashboard(
      env,
      siteId,
      url("/pages/dashboard", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 2,
        interval: "hour",
      }),
    );
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      interval: "hour",
      data: {
        items: [
          {
            pathname: "/pricing",
            titles: ["Pricing"],
            metrics: {
              views: 10,
              visitors: 4,
              sessions: 5,
              bounceRate: 0.2,
              pagesPerSession: 2,
              avgDurationMs: 10000,
            },
            changeRates: {
              views: 100,
              visitors: 100,
              sessions: 0,
              bounceRate: -50,
              pagesPerSession: 100,
              avgDurationMs: 100,
            },
            trend: [
              {
                timestampMs: Date.UTC(2026, 0, 2, 1),
                views: 6,
                visitors: 3,
              },
            ],
          },
          {
            pathname: "/docs",
            titles: ["Docs"],
            metrics: {
              views: 4,
              visitors: 2,
              sessions: 2,
              bounceRate: 1,
              pagesPerSession: 2,
              avgDurationMs: 10000,
            },
            changeRates: {
              views: null,
              visitors: null,
              sessions: null,
              bounceRate: null,
              pagesPerSession: null,
              avgDurationMs: null,
            },
            trend: [
              {
                timestampMs: Date.UTC(2026, 0, 2, 2),
                views: 4,
                visitors: 2,
              },
            ],
          },
        ],
        pagination: {
          limit: 2,
          returned: 2,
          hasMore: true,
          nextCursor: expect.any(String),
        },
      },
    });
    expect(calls).toHaveLength(3);
    expect(calls[0].bindings.slice(-2)).toEqual([window.endExclusiveMs, 3]);
    expect(calls[1].bindings.at(-1)).toBe(
      JSON.stringify(["/pricing", "/docs"]),
    );
    expect(calls[2].bindings.slice(-2)).toEqual([
      JSON.stringify(["/pricing", "/docs"]),
      3,
    ]);
    expect(calls[2].sql).toContain("page_visits AS MATERIALIZED");
  });
});
describe("edge overview D1 queries and handlers", () => {
  it("reads the latest filtered site activity without turning an absent value into epoch", async () => {
    const { env, calls } = createD1Env([
      [{ lastActivityAt: 123 }],
      [{ lastActivityAt: null }],
      [{ lastActivityAt: "not-a-time" }],
    ]);
    const filters = filterFixture({ country: "US" });

    await expect(
      queryLatestSiteActivity(env, siteId, window, filters),
    ).resolves.toBe(123);
    await expect(
      queryLatestSiteActivity(env, siteId, window, filters),
    ).resolves.toBeNull();
    await expect(
      queryLatestSiteActivity(env, siteId, window, filters),
    ).resolves.toBeNull();
    expect(calls).toHaveLength(3);
    expect(calls[0]?.sql).toContain("MAX(last_activity_at)");
    expect(calls[0]?.bindings).toEqual([...visitBindings(), "us"]);
  });

  it("maps overview aggregate fallback values and applies filters", async () => {
    const { env, calls } = createD1Env([[]]);

    await expect(
      queryOverviewFromD1(
        env,
        siteId,
        window,
        filterFixture({
          country: "US",
          clientBrowser: "Chrome",
        }),
      ),
    ).resolves.toEqual({
      views: 0,
      sessions: 0,
      visitors: 0,
      bounces: 0,
      totalDuration: 0,
      durationViews: 0,
    });

    expect(calls[0].sql).toContain("page_view_groups AS");
    expect(calls[0].bindings).toEqual([...visitBindings(), "Chrome", "us"]);
  });

  it("reads a filtered overview from one scan of the matching page views", async () => {
    const database = createAnalyticsDatabase();
    const calls: QueryCall[] = [];
    const env = {
      DB: {
        prepare: (sql: string) => ({
          bind: (...bindings: QueryBinding[]) => {
            const call = { sql, bindings };
            calls.push(call);
            return {
              all: async () => ({
                results: database.prepare(sql).all(...bindings) as D1Row[],
              }),
            };
          },
        }),
      } as unknown as D1Database,
    } as Env;
    const insert = database.prepare(`
      INSERT INTO visits (
        site_pk, visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, pathname, hostname, country, browser, duration_ms
      ) VALUES (1, ?, ?, ?, ?, 'closed', ?, ?, ?, 'example.test', ?, ?, ?)
    `);

    try {
      insert.run(
        "first-session-first-visit",
        siteId,
        "visitor-1",
        "session-1",
        baseMs,
        baseMs,
        "/",
        "US",
        "Chrome",
        100,
      );
      insert.run(
        "first-session-second-visit",
        siteId,
        "visitor-1",
        "session-1",
        baseMs + 1,
        baseMs + 1,
        "/docs",
        "US",
        "Chrome",
        null,
      );
      insert.run(
        "second-session-visit",
        siteId,
        "visitor-1",
        "session-2",
        baseMs + 2,
        baseMs + 2,
        "/pricing",
        "US",
        "Chrome",
        50,
      );
      insert.run(
        "excluded-country",
        siteId,
        "visitor-2",
        "session-3",
        baseMs + 3,
        baseMs + 3,
        "/",
        "CA",
        "Chrome",
        999,
      );

      await expect(
        queryOverviewFromD1(
          env,
          siteId,
          window,
          filterFixture({ path: "/docs" }),
        ),
      ).resolves.toEqual({
        // Only the /docs page view matches, not the rest of its session.
        views: 1,
        sessions: 1,
        visitors: 1,
        bounces: 1,
        totalDuration: 0,
        durationViews: 0,
        // A page filter reads the scroll depth; no page view reported one.
        scrollDepth: null,
      });

      expect(calls).toHaveLength(1);
      expect(calls[0]?.sql).toContain("page_view_groups AS MATERIALIZED");
      const plan = database
        .prepare(`EXPLAIN QUERY PLAN ${calls[0]?.sql ?? "SELECT 1"}`)
        .all(...(calls[0]?.bindings ?? [])) as Array<{ detail: string }>;
      expect(
        plan.filter((row) => row.detail.includes("SEARCH v USING INDEX")),
      ).toHaveLength(1);
      expect(
        plan.some((row) =>
          row.detail.includes("idx_visits_site_pk_started_at"),
        ),
      ).toBe(true);
    } finally {
      database.close();
    }
  });

  it("filters overview visits by each session's entry path", async () => {
    const database = createAnalyticsDatabase();
    const calls: QueryCall[] = [];
    const env = {
      DB: {
        prepare: (sql: string) => ({
          bind: (...bindings: QueryBinding[]) => {
            const call = { sql, bindings };
            calls.push(call);
            return {
              all: async () => ({
                results: database.prepare(sql).all(...bindings) as D1Row[],
              }),
            };
          },
        }),
      } as unknown as D1Database,
    } as Env;
    const insert = database.prepare(`
      INSERT INTO visits (
        site_pk, visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, pathname, hostname, duration_ms
      ) VALUES (1, ?, ?, ?, ?, 'closed', ?, ?, ?, 'example.test', ?)
    `);

    try {
      insert.run(
        "matching-entry",
        siteId,
        "visitor-1",
        "matching-session",
        baseMs,
        baseMs,
        "/landing",
        20,
      );
      insert.run(
        "matching-follow-up",
        siteId,
        "visitor-1",
        "matching-session",
        baseMs + 1,
        baseMs + 1,
        "/pricing",
        30,
      );
      insert.run(
        "different-entry",
        siteId,
        "visitor-2",
        "other-session",
        baseMs + 2,
        baseMs + 2,
        "/docs",
        99,
      );
      insert.run(
        "empty-session",
        siteId,
        "visitor-3",
        "",
        baseMs + 3,
        baseMs + 3,
        "/landing",
        999,
      );

      await expect(
        queryOverviewFromD1(
          env,
          siteId,
          window,
          filterFixture({
            entry: "/landing",
            exit: "/pricing",
          }),
        ),
      ).resolves.toEqual({
        views: 2,
        sessions: 1,
        visitors: 1,
        bounces: 0,
        totalDuration: 50,
        durationViews: 2,
      });

      expect(calls).toHaveLength(1);
      const plan = database
        .prepare(`EXPLAIN QUERY PLAN ${calls[0]?.sql ?? "SELECT 1"}`)
        .all(...(calls[0]?.bindings ?? [])) as Array<{ detail: string }>;
      expect(plan.length).toBeGreaterThan(0);
      expect(calls[0]?.sql).toContain("boundary_rank");
    } finally {
      database.close();
    }
  });

  it("maps trend rows, bucket timestamps, and filter bindings", async () => {
    const filters: FilterDocument = filterFixture({
      sourceDomain: "Ref.Example",
      clientDeviceType: "mobile",
    });
    const { env, calls } = createD1Env([
      [
        {
          bucket: "0",
          views: "3",
          visitors: "2",
          sessions: "2",
          bounces: "1",
          totalDuration: "6000",
          durationViews: "3",
        },
        {
          bucket: 1,
          views: 4,
          visitors: 3,
          sessions: 2,
          bounces: 0,
          totalDuration: 8000,
          durationViews: 4,
        },
      ],
    ]);

    await expect(
      queryTrendAggregate(env, siteId, window, "hour", filters).then(
        ({ value }) => value,
      ),
    ).resolves.toEqual([
      {
        bucket: 0,
        timestampMs: Date.UTC(2026, 0, 2, 1),
        views: 3,
        visitors: 2,
        sessions: 2,
        bounces: 1,
        totalDuration: 6000,
        durationViews: 3,
      },
      {
        bucket: 1,
        timestampMs: Date.UTC(2026, 0, 2, 2),
        views: 4,
        visitors: 3,
        sessions: 2,
        bounces: 0,
        totalDuration: 8000,
        durationViews: 4,
      },
    ]);

    expect(calls[0].sql).toContain("visit_buckets AS");
    expect(calls[0].sql).toContain("session_buckets AS");
    expect(calls[0].sql).toContain("CASE WHEN started_at >=");
    expect(calls[0].bindings).toEqual([
      ...visitBindings(),
      "mobile",
      "ref.example",
    ]);
  });

  it("reads a filtered trend from one scan of the matching page views", async () => {
    const database = createAnalyticsDatabase();
    const calls: QueryCall[] = [];
    const env = {
      DB: {
        prepare: (sql: string) => ({
          bind: (...bindings: QueryBinding[]) => {
            const call = { sql, bindings };
            calls.push(call);
            return {
              all: async () => ({
                results: database.prepare(sql).all(...bindings) as D1Row[],
              }),
            };
          },
        }),
      } as unknown as D1Database,
    } as Env;
    const insert = database.prepare(`
      INSERT INTO visits (
        site_pk, visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, pathname, hostname, country, duration_ms
      ) VALUES (1, ?, ?, ?, ?, 'closed', ?, ?, ?, 'example.test', ?, ?)
    `);

    try {
      insert.run(
        "first-hour",
        siteId,
        "visitor-1",
        "session-1",
        baseMs + 100,
        baseMs + 100,
        "/",
        "US",
        100,
      );
      insert.run(
        "second-hour-first",
        siteId,
        "visitor-1",
        "session-2",
        baseMs + 60 * 60 * 1000 + 100,
        baseMs + 60 * 60 * 1000 + 100,
        "/docs",
        "US",
        200,
      );
      insert.run(
        "second-hour-last",
        siteId,
        "visitor-1",
        "session-2",
        baseMs + 60 * 60 * 1000 + 200,
        baseMs + 60 * 60 * 1000 + 200,
        "/pricing",
        "US",
        300,
      );
      insert.run(
        "excluded-country",
        siteId,
        "visitor-2",
        "session-3",
        baseMs + 300,
        baseMs + 300,
        "/",
        "CA",
        999,
      );

      await expect(
        queryTrendAggregate(
          env,
          siteId,
          window,
          "hour",
          filterFixture({ path: "/docs" }),
        ).then(({ value }) => value),
      ).resolves.toEqual([
        {
          // Only the /docs page view matches, not the rest of its session.
          bucket: 1,
          timestampMs: baseMs + 60 * 60 * 1000,
          views: 1,
          visitors: 1,
          sessions: 1,
          bounces: 1,
          totalDuration: 200,
          durationViews: 1,
          scrollDepth: null,
        },
      ]);

      expect(calls).toHaveLength(1);
      expect(calls[0]?.sql).toContain("page_view_groups AS MATERIALIZED");
      const plan = database
        .prepare(`EXPLAIN QUERY PLAN ${calls[0]?.sql ?? "SELECT 1"}`)
        .all(...(calls[0]?.bindings ?? [])) as Array<{ detail: string }>;
      expect(
        plan.filter((row) => row.detail.includes("SEARCH v USING INDEX")),
      ).toHaveLength(1);
      expect(
        plan.some((row) =>
          row.detail.includes("idx_visits_site_pk_started_at"),
        ),
      ).toBe(true);
    } finally {
      database.close();
    }
  });

  it("returns overview metrics with previous change rates and detail trend mapping", async () => {
    const { env, calls } = createD1Env([
      [
        {
          views: 10,
          sessions: 5,
          visitors: 4,
          bounces: 1,
          totalDuration: 50000,
          durationViews: 10,
          scrollDepth: 65,
        },
      ],
      [
        {
          views: 5,
          sessions: 5,
          visitors: 2,
          bounces: 2,
          totalDuration: 25000,
          durationViews: 5,
          scrollDepth: null,
        },
      ],
      [
        {
          bucket: 0,
          views: 6,
          visitors: 3,
          sessions: 3,
          bounces: 1,
          totalDuration: 30000,
          durationViews: 6,
          scrollDepth: 70,
        },
      ],
    ]);

    const response = await handleOverview(
      env,
      siteId,
      url("/overview", {
        from: window.startMs,
        to: window.endExclusiveMs,
        interval: "hour",
        includeChange: true,
        includeDetail: true,
        "filter[page.path]": "/pricing",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        views: 10,
        sessions: 5,
        visitors: 4,
        bounces: 1,
        totalDurationMs: 50000,
        avgDurationMs: 10000,
        bounceRate: 0.2,
        approximateVisitors: false,
        scrollDepth: 65,
      },
      previousData: {
        views: 5,
        sessions: 5,
        visitors: 2,
        bounces: 2,
        totalDurationMs: 25000,
        avgDurationMs: 5000,
        bounceRate: 0.4,
        approximateVisitors: false,
        scrollDepth: null,
      },
      changeRates: {
        views: 100,
        sessions: 0,
        visitors: 100,
        bounces: -50,
        bounceRate: -50,
        avgDurationMs: 100,
      },
      detail: {
        interval: "hour",
        data: [
          {
            bucket: 0,
            timestampMs: Date.UTC(2026, 0, 2, 1),
            views: 6,
            visitors: 3,
            sessions: 3,
            bounces: 1,
            totalDurationMs: 30000,
            avgDurationMs: 10000,
            scrollDepth: 70,
            source: "detail",
          },
        ],
      },
    });
    expect(response.headers.get("x-insightflare-data-source")).toBe("raw");
    expect(response.headers.get("x-insightflare-d1-rows-read")).toBe(
      "unavailable",
    );
    expect(calls).toHaveLength(3);
    expect(calls.map((call) => call.bindings.at(-1))).toEqual([
      "/pricing",
      "/pricing",
      "/pricing",
    ]);
  });

  it("maps trend handler rows without optional overview change payload", async () => {
    const { env, calls } = createD1Env([
      [
        {
          bucket: 0,
          views: 2,
          visitors: 1,
          sessions: 1,
          bounces: 0,
          totalDuration: 3000,
          durationViews: 1,
        },
      ],
    ]);

    const response = await handleTrend(
      env,
      siteId,
      url("/trend", {
        from: window.startMs,
        to: window.endExclusiveMs,
        interval: "hour",
        "filter[referrer.domain]": "Ref.Example",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      interval: "hour",
      data: [
        {
          bucket: 0,
          timestampMs: Date.UTC(2026, 0, 2, 1),
          views: 2,
          visitors: 1,
          sessions: 1,
          bounces: 0,
          totalDurationMs: 3000,
          avgDurationMs: 3000,
          source: "detail",
        },
      ],
    });
    expect(calls[0].bindings.at(-1)).toBe("ref.example");
  });

  it("maps overview page, source, client, and geo tab handlers", async () => {
    const { env, calls } = createD1Env(
      [
        [
          {
            value: "/home",
            views: "1",
            sessions: "1",
            visitors: "1",
          },
        ],
        [
          {
            referrer: "",
            views: "4",
            sessions: "2",
            visitors: "2",
          },
        ],
        [
          {
            value: "organic_search",
            views: "3",
            sessions: "2",
            visitors: "2",
          },
        ],
        [
          {
            value: "1440x900",
            views: "2",
            sessions: "2",
            visitors: "2",
          },
        ],
        [
          {
            value: "US",
            views: "1",
            sessions: "1",
            visitors: "1",
          },
        ],
      ],
      37,
    );

    const pageTab = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/page-tab", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 2,
      }),
      "page.path",
    );
    const sourceTab = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/source-tab", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 3,
      }),
      "source.domain",
    );
    const sourceChannelTab = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/source-channel-tab", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 3,
      }),
      "source.channel",
    );
    const clientTab = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/client-tab", {
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 3,
      }),
      "client.screenSize",
    );
    const geoTab = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/geo-tab", {
        from: window.startMs,
        to: window.endExclusiveMs,
        geo: "US::CA::California",
        limit: 3,
      }),
      "geo.country",
    );

    await expect(pageTab.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [{ label: "/home", views: 1, sessions: 1, visitors: 1 }],
        pagination: {
          limit: 2,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    await expect(sourceTab.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [{ label: "", views: 4, sessions: 2, visitors: 2 }],
        pagination: {
          limit: 3,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    await expect(sourceChannelTab.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [
          {
            label: "organic_search",
            views: 3,
            sessions: 2,
            visitors: 2,
          },
        ],
        pagination: {
          limit: 3,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    await expect(clientTab.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [{ label: "1440x900", views: 2, sessions: 2, visitors: 2 }],
        pagination: {
          limit: 3,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    await expect(geoTab.json()).resolves.toEqual({
      ok: true,
      data: {
        items: [
          {
            value: "US",
            label: "US",
            views: 1,
            sessions: 1,
            visitors: 1,
          },
        ],
        pagination: {
          limit: 3,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(calls.map((call) => call.bindings.at(-1))).toEqual([3, 4, 4, 4, 4]);
    expect(calls[2].sql).toContain("dimension_rollup AS");
    for (const call of [calls[0], calls[3], calls[4]]) {
      expect(call.sql).toContain("GROUP BY value");
      expect(call.sql).toContain("TRIM(value) != ''");
    }
  });

  it("routes comparison requests for every dimension tab and validates controls", async () => {
    const comparisonTabs = [
      "page.path",
      "page.query",
      "page.title",
      "page.hostname",
      "page.entry",
      "page.exit",
      "source.domain",
      "source.link",
      "client.browser",
      "client.osVersion",
      "client.deviceType",
      "client.language",
      "client.screenSize",
      "geo.country",
      "geo.region",
      "geo.city",
      "geo.continent",
      "geo.timezone",
    ] as const;
    const { env, calls } = createD1Env(
      comparisonTabs.map((tab) => [
        {
          key: `${tab}-value`,
          current_views: 4,
          current_sessions: 2,
          current_visitors: 2,
          reference_views: 3,
          reference_sessions: 1,
          reference_visitors: 1,
        },
      ]),
    );

    for (const tab of comparisonTabs) {
      const response = await handleOverviewTabContract(
        env,
        siteId,
        url(`/overview/${tab}`, {
          from: window.startMs,
          to: window.endExclusiveMs,
          compare: "previous",
          sort: "visitors",
          sortBy: "change",
          direction: "asc",
          search: "value",
          limit: 1,
        }),
        tab,
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true });
    }

    expect(calls).toHaveLength(comparisonTabs.length);
    expect(calls.every((call) => call.sql.includes("reference_rollup"))).toBe(
      true,
    );

    const invalidSort = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/page.path", {
        from: window.startMs,
        to: window.endExclusiveMs,
        sort: "sessions",
      }),
      "page.path",
    );
    expect(invalidSort.status).toBe(400);

    const invalidDirection = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/page.path", {
        from: window.startMs,
        to: window.endExclusiveMs,
        direction: "sideways",
      }),
      "page.path",
    );
    expect(invalidDirection.status).toBe(400);

    const invalidComparison = await handleOverviewTabContract(
      env,
      siteId,
      url("/overview/page.path", {
        from: window.startMs,
        to: window.endExclusiveMs,
        compare: "future",
      }),
      "page.path",
    );
    expect(invalidComparison.status).toBe(400);
  });

  it("maps filter option branches across page, source, client, geo, and scalar keys", async () => {
    const { env, calls } = createD1Env([
      [
        {
          value: "US",
          views: "5",
          sessions: "3",
          visitors: "2",
        },
      ],
      [
        {
          cardType: "path",
          value: "/home",
          views: 1,
          sessions: 1,
          visitors: 1,
        },
      ],
      [
        {
          referrer: "",
          views: "4",
          sessions: "2",
          visitors: "1",
        },
      ],
      [
        {
          cardType: "screenSize",
          value: "390x844",
          views: 1,
          sessions: 1,
        },
      ],
      [
        {
          cardType: "country",
          value: "US",
          views: 1,
          sessions: 1,
          visitors: 1,
        },
        {
          cardType: "region",
          value: "US::CA::California",
          views: 1,
          sessions: 1,
          visitors: 1,
        },
        {
          cardType: "city",
          value: "US::CA::California::San Francisco",
          views: 1,
          sessions: 1,
          visitors: 1,
        },
      ],
    ]);

    const scalar = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "geo.country",
        "filter[geo.country]": "US",
        "filter[client.browser]": "Chrome",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );
    const page = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "page.path",
        "filter[page.path]": "/home",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );
    const source = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "referrer.domain",
        "filter[referrer.domain]": "__direct__",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );
    const client = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "client.screenSize",
        "filter[client.screenSize]": "390x844",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );
    const geo = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "geo.region",
        "filter[geo.country]": "US",
        "filter[geo.region]": "California",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );

    const responses = [
      [scalar, "geo.country"],
      [page, "page.path"],
      [source, "referrer.domain"],
      [client, "client.screenSize"],
      [geo, "geo.region"],
    ] as const;
    for (const [response, field] of responses) {
      await expect(response.json()).resolves.toMatchObject({
        ok: true,
        field,
        data: {
          items: expect.any(Array),
          pagination: expect.any(Object),
        },
      });
    }
    expect(calls[0]?.bindings.at(-1)).toBe(5);
    expect(calls.every((call) => call.bindings.at(-1) === 5)).toBe(true);
    expect(calls.flatMap((call) => call.bindings)).toEqual(
      expect.arrayContaining(["us"]),
    );
  });

  it("maps device and browser filter option scalar branches", async () => {
    const { env, calls } = createD1Env([
      [
        {
          value: "desktop",
          views: "6",
          sessions: "4",
          visitors: "3",
        },
      ],
      [
        {
          value: "Chrome",
          views: "5",
          sessions: "3",
          visitors: "2",
        },
      ],
    ]);

    const device = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "client.deviceType",
        "filter[client.deviceType]": "desktop",
        "filter[client.browser]": "Chrome",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );
    const browser = await handleFilterValuesContract(
      env,
      siteId,
      url("/filter-values", {
        filterKey: "client.browser",
        "filter[client.browser]": "Chrome",
        "filter[geo.country]": "US",
        from: window.startMs,
        to: window.endExclusiveMs,
        limit: 4,
      }),
    );

    await expect(device.json()).resolves.toEqual({
      ok: true,
      field: "client.deviceType",
      data: {
        items: [{ value: "desktop", label: "desktop", occurrences: 6 }],
        pagination: {
          limit: 4,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    await expect(browser.json()).resolves.toEqual({
      ok: true,
      field: "client.browser",
      data: {
        items: [{ value: "Chrome", label: "Chrome", occurrences: 5 }],
        pagination: {
          limit: 4,
          returned: 1,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(calls[0].sql).toContain("TRIM(COALESCE(device_type, ''))");
    expect(calls[1].sql).toContain("TRIM(COALESCE(browser, ''))");
    expect(calls.map((call) => call.bindings.at(-1))).toEqual([5, 5]);
  });

  it("maps overview geo points with and without applying geo filters", async () => {
    const { env, calls } = createD1Env([
      [
        {
          latitude: "37.7",
          longitude: "-122.4",
          timestampMs: String(window.startMs),
          country: "US",
          region: "California",
          regionCode: "CA",
          city: "San Francisco",
        },
      ],
      [
        {
          country: "US",
          views: "7",
          sessions: "4",
          visitors: "3",
        },
      ],
      [],
      [
        {
          country: "us",
          regionCode: "ca",
          region: "California",
          city: "San Francisco",
          views: "5",
          sessions: "3",
          visitors: "2",
        },
      ],
    ]);

    const withoutGeo = await handleOverviewGeoPoints(
      env,
      siteId,
      url("/overview/geo-points", {
        from: window.startMs,
        to: window.endExclusiveMs,
        "filter[geo.country]": "US",
        "filter[geo.region]": "California",
        limit: 9,
      }),
    );
    const withGeo = await handleOverviewGeoPoints(
      env,
      siteId,
      url("/overview/geo-points", {
        from: window.startMs,
        to: window.endExclusiveMs,
        "filter[geo.country]": "US",
        "filter[geo.region]": "California",
        applyGeoFilter: true,
        limit: 10,
      }),
    );

    await expect(withoutGeo.json()).resolves.toEqual({
      ok: true,
      data: [
        {
          latitude: 37.7,
          longitude: -122.4,
          timestampMs: window.startMs,
          country: "US",
          region: "California",
          regionCode: "CA",
          city: "San Francisco",
          pointCount: 1,
        },
      ],
      countryCounts: [{ country: "US", views: 7, sessions: 4, visitors: 3 }],
      regionCounts: [],
      cityCounts: [],
    });
    await expect(withGeo.json()).resolves.toEqual({
      ok: true,
      data: [],
      countryCounts: [],
      regionCounts: [],
      cityCounts: [
        {
          value: "US::CA::California::San Francisco",
          label: "San Francisco",
          views: 5,
          sessions: 3,
          visitors: 2,
        },
      ],
    });
    // Every point: a limit in the request doesn't cut the map short.
    expect(calls[0].sql).not.toContain("LIMIT");
    expect(calls[0].bindings).not.toContain(9);
    expect(calls[2].sql).not.toContain("LIMIT");
    expect(calls[2].bindings).not.toContain(10);
    expect(calls[2].bindings).toEqual(
      expect.arrayContaining(["us", "california"]),
    );
  });

  it("rejects invalid overview windows before querying D1", async () => {
    const { env, prepare } = createD1Env([]);

    const response = await handleOverview(
      env,
      siteId,
      new URL("https://edge.test/overview?from=20&to=10"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { message: "Invalid time window" },
    });
    expect(prepare).not.toHaveBeenCalled();
  });
});
