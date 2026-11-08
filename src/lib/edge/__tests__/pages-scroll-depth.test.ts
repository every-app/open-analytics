import { describe, expect, it } from "vitest";

import {
  createQueryTime,
  EMPTY_FILTER_DOCUMENT,
  type PagesDashboardReaderInput,
} from "@/lib/edge/analytics/contract";
import { handleOverviewContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core-types";
import { queryPagesDashboard } from "@/lib/edge/analytics/providers/d1/internal/pages-dashboard";
import type { Env } from "@/lib/edge/types";

import { createRollupTestEnv, seedSites } from "./rollup-fixtures";

const SITE = { siteId: "site-1", sitePk: 1 };
const HOUR_MS = 3_600_000;
const window: QueryWindow = {
  startMs: 10 * HOUR_MS,
  endExclusiveMs: 20 * HOUR_MS,
  nowMs: 20 * HOUR_MS,
  timeZone: "UTC",
};

interface PageView {
  readonly pathname: string;
  readonly depth: number | null;
  readonly visitor: string;
  readonly startedAt: number;
}

function createEnv(pageViews: readonly PageView[]): Env {
  const { database, env } = createRollupTestEnv();
  seedSites(database, [SITE]);
  const insert = database.prepare(`
    INSERT INTO visits (
      visit_id, site_pk, visitor_id, session_id, status, started_at,
      last_activity_at, pathname, hostname, scroll_depth
    ) VALUES (?, ?, ?, ?, 'complete', ?, ?, ?, 'example.com', ?)
  `);
  pageViews.forEach(({ pathname, depth, visitor, startedAt }, index) => {
    insert.run(
      `visit-${index}`,
      SITE.sitePk,
      visitor,
      `session-${visitor}`,
      startedAt,
      startedAt,
      pathname,
      depth,
    );
  });
  return env;
}

/** One visitor per page view, each a minute after the last. */
function oneViewPerVisitor(
  pageViews: ReadonlyArray<[string, number | null]>,
): Env {
  return createEnv(
    pageViews.map(([pathname, depth], index) => ({
      pathname,
      depth,
      visitor: `visitor-${index}`,
      startedAt: window.startMs + index * 60_000,
    })),
  );
}

const PAGES: ReadonlyArray<[string, number | null]> = [
  ["/pricing", 80],
  ["/pricing", 40],
  // Viewed before scroll depth was recorded: left out of the average.
  ["/pricing", null],
  ["/docs", 33],
  ["/docs", 34],
  ["/blog", null],
];

const time = (from: number, to: number) =>
  createQueryTime(from, to, "UTC", window.nowMs);

function readPages(
  env: Env,
  input: Partial<PagesDashboardReaderInput> = {},
): ReturnType<typeof queryPagesDashboard> {
  return queryPagesDashboard(env, SITE.siteId, {
    window,
    filters: EMPTY_FILTER_DOCUMENT,
    interval: "day",
    page: { limit: 10, cursor: null },
    ...input,
  });
}

const depths = (result: Awaited<ReturnType<typeof queryPagesDashboard>>) =>
  result.items.map(({ pathname, scrollDepth }) => [pathname, scrollDepth]);

describe("the Pages details' scroll depth", () => {
  it("averages each page's visitors' depths, in whole percents", async () => {
    expect(depths(await readPages(oneViewPerVisitor(PAGES)))).toEqual([
      ["/pricing", 60],
      ["/docs", 34],
      ["/blog", null],
    ]);
  });

  it("counts each visitor's deepest scroll once, as Plausible does", async () => {
    const env = createEnv(
      [
        { pathname: "/pricing", depth: 30, visitor: "a", startedAt: 0 },
        { pathname: "/pricing", depth: 80, visitor: "a", startedAt: 60_000 },
        { pathname: "/pricing", depth: 50, visitor: "b", startedAt: 120_000 },
      ].map((view) => ({
        ...view,
        startedAt: window.startMs + view.startedAt,
      })),
    );

    // Visitor a's 80 and b's 50, not the three page views' 53.
    expect(depths(await readPages(env))).toEqual([["/pricing", 65]]);
  });

  it("keeps the current period's depth when comparing periods", async () => {
    const result = await readPages(oneViewPerVisitor(PAGES), {
      comparison: {
        current: {
          time: time(window.startMs, window.endExclusiveMs),
          filters: EMPTY_FILTER_DOCUMENT,
        },
        reference: {
          time: time(0, window.startMs),
          filters: EMPTY_FILTER_DOCUMENT,
        },
        metric: "views",
        sortBy: "current",
        direction: "desc",
      },
    });

    expect(depths(result)).toEqual([
      ["/pricing", 60],
      ["/docs", 34],
      ["/blog", null],
    ]);
  });

  it("sorts by depth, a page without one below every depth", async () => {
    const env = oneViewPerVisitor([...PAGES, ["/", 0]]);
    const sorted = async (direction: "asc" | "desc") => {
      const pathnames: string[] = [];
      let cursor: string | null = null;
      // A page at a time, so the cursor carries the depth, or its absence.
      do {
        const result = await readPages(env, {
          page: { limit: 1, cursor },
          sort: { key: "scrollDepth", direction },
        });
        pathnames.push(...result.items.map((item) => item.pathname));
        cursor = result.pagination.nextCursor;
      } while (cursor);
      return pathnames;
    };

    await expect(sorted("desc")).resolves.toEqual([
      "/pricing",
      "/docs",
      "/",
      "/blog",
    ]);
    await expect(sorted("asc")).resolves.toEqual([
      "/blog",
      "/",
      "/docs",
      "/pricing",
    ]);
  });
});

describe("the scroll depth top stat", () => {
  const PRICING_VIEWS: readonly PageView[] = [
    // Previous period.
    { pathname: "/pricing", depth: 40, visitor: "e", startedAt: 5 * HOUR_MS },
    // Hour 10: visitor a's deepest is 80.
    { pathname: "/pricing", depth: 30, visitor: "a", startedAt: 10 * HOUR_MS },
    {
      pathname: "/pricing",
      depth: 80,
      visitor: "a",
      startedAt: 10 * HOUR_MS + 60_000,
    },
    // Hour 11: visitor b's 50; the other page's 90 isn't filtered in.
    { pathname: "/pricing", depth: 50, visitor: "b", startedAt: 11 * HOUR_MS },
    { pathname: "/docs", depth: 90, visitor: "c", startedAt: 11 * HOUR_MS },
    // Hour 12: a page view without a depth.
    {
      pathname: "/pricing",
      depth: null,
      visitor: "d",
      startedAt: 12 * HOUR_MS,
    },
  ];

  async function overview(
    filter?: string,
    range: { startMs: number; endExclusiveMs: number } = window,
  ) {
    const url = new URL("https://edge.test/overview");
    url.searchParams.set("from", String(range.startMs));
    url.searchParams.set("to", String(range.endExclusiveMs));
    url.searchParams.set("interval", "hour");
    url.searchParams.set("includeDetail", "true");
    if (filter) url.searchParams.set("filter[page.path]", filter);
    const response = await handleOverviewContract(
      createEnv(PRICING_VIEWS),
      SITE.siteId,
      url,
    );
    return (await response.json()) as {
      data: Record<string, unknown>;
      detail: { data: Array<Record<string, unknown>> };
    };
  }
  /** The period just before, which the top stats measure against. */
  const previous = {
    startMs: 2 * window.startMs - window.endExclusiveMs,
    endExclusiveMs: window.startMs,
  };

  it("averages the filtered page views' visitors, in total and per interval", async () => {
    const body = await overview("/pricing");

    expect(body.data).toMatchObject({ views: 4, scrollDepth: 65 });
    expect((await overview("/pricing", previous)).data).toMatchObject({
      views: 1,
      scrollDepth: 40,
    });
    expect(
      body.detail.data.map(({ timestampMs, scrollDepth }) => [
        timestampMs,
        scrollDepth,
      ]),
    ).toEqual([
      [10 * HOUR_MS, 80],
      [11 * HOUR_MS, 50],
      [12 * HOUR_MS, null],
    ]);
  });

  it("isn't read without a page filter", async () => {
    const body = await overview();

    expect(body.data.views).toBe(5);
    expect(body.data).not.toHaveProperty("scrollDepth");
    expect((await overview(undefined, previous)).data).not.toHaveProperty(
      "scrollDepth",
    );
    expect(body.detail.data).not.toHaveLength(0);
    for (const point of body.detail.data) {
      expect(point).not.toHaveProperty("scrollDepth");
    }
  });
});
