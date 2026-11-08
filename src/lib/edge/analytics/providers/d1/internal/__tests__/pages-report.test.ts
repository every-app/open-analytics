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
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
} from "@/lib/edge/analytics/contract";
import type {
  PageRow,
  QueryWindow,
} from "@/lib/edge/analytics/providers/d1/internal/core-types";
import {
  decodePagesCursor,
  queryPagesPageFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/pages";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import type { Env } from "@/lib/edge/types";
import { parseFilterDsl } from "@/lib/filter-contract";
import { InvalidCursorError } from "@/lib/pagination";

const SITE = { siteId: "site-pages", sitePk: 1 };
const DATA_FROM = Date.UTC(2026, 9, 1);
const NOW = Date.UTC(2026, 9, 6, 12);
/** Noon on the 1st to 6 a.m. on the 5th: whole days 2nd to 4th, edges raw. */
const window: QueryWindow = {
  startMs: DATA_FROM + DAY_MS / 2,
  endExclusiveMs: DATA_FROM + 4 * DAY_MS + DAY_MS / 4,
  nowMs: NOW,
  timeZone: "UTC",
};
const PRICING = parseFilterDsl(
  'page.path eq "/pricing"',
  analyticsFilterRegistry,
);

interface Trace {
  readonly preparedSql: string[];
  readonly bindings: SQLInputValue[][];
}

let database: DatabaseSync;
let env: Env;
let trace: Trace;

/** Each pathname's views and sessions, counted from the raw page views. */
function rawPages(where = "1"): PageRow[] {
  return database
    .prepare(
      `SELECT pathname,
         COUNT(*) AS views,
         COUNT(DISTINCT CASE WHEN session_id != '' THEN session_id END) AS sessions
       FROM visits
       WHERE site_pk = 1 AND started_at >= ? AND started_at < ? AND ${where}
       GROUP BY pathname
       ORDER BY views DESC, sessions DESC, pathname ASC`,
    )
    .all(window.startMs, window.endExclusiveMs)
    .map((row) => ({
      pathname: String(row.pathname),
      views: Number(row.views),
      sessions: Number(row.sessions),
    }));
}

/** The report, every page of it, and the SQL each page ran. */
async function report(filters: FilterDocument, limit: number) {
  trace.preparedSql.length = 0;
  trace.bindings.length = 0;
  const items: PageRow[] = [];
  let cursorText: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const cursor = await decodePagesCursor(
      env,
      SITE.siteId,
      window,
      filters,
      cursorText,
      "private-dashboard",
    );
    const result = await queryPagesPageFromD1(
      env,
      SITE.siteId,
      window,
      filters,
      limit,
      cursor,
      "private-dashboard",
    );
    items.push(...result.items);
    cursorText = result.pagination.nextCursor;
    if (!cursorText) break;
  }
  const reads = trace.preparedSql
    .map((sql, index) => ({ sql, bindings: trace.bindings[index] ?? [] }))
    .filter((read) => read.sql.includes("page_rollup"));
  return { items, reads };
}

beforeAll(async () => {
  database = createMigratedDatabase();
  trace = { preparedSql: [], bindings: [] };
  env = {
    DB: createSqliteD1Database(database, trace),
    MAIN_SECRET: "pages-report-secret",
  } as unknown as Env;
  seedSites(database, [SITE]);
  insertVisits(
    database,
    syntheticVisits({
      ...SITE,
      fromMs: DATA_FROM,
      toMs: NOW,
      peoplePerDay: 25,
      seed: 7,
    }),
  );
  await runVisitRollups(env, NOW);
});

afterAll(() => database.close());

describe("pages report", () => {
  it("reads an unfiltered report's whole days from the daily rollups", async () => {
    const { items, reads } = await report(EMPTY_FILTER_DOCUMENT, 100);

    expect(items).toEqual(rawPages());
    expect(reads).toHaveLength(1);
    expect(reads[0]!.sql).toContain("FROM visit_daily_dimension_rollups");
    // The page views read raw are the window's edges, not its whole days.
    const firstWholeDay = DATA_FROM + DAY_MS;
    const lastWholeDayEnd = DATA_FROM + 4 * DAY_MS;
    expect(reads[0]!.bindings.slice(0, 6)).toEqual([
      SITE.siteId,
      window.startMs,
      firstWholeDay,
      SITE.siteId,
      lastWholeDayEnd,
      window.endExclusiveMs,
    ]);
  });

  it("reads a page-filtered report from that page's page views alone", async () => {
    const { items, reads } = await report(PRICING, 100);

    expect(items).toEqual(rawPages("pathname = '/pricing'"));
    expect(items).toHaveLength(1);
    expect(reads).toHaveLength(1);
    expect(reads[0]!.sql).not.toContain("visit_daily_dimension_rollups");
    expect(reads[0]!.sql).not.toContain("scope_raw");
    const plan = database
      .prepare(`EXPLAIN QUERY PLAN ${reads[0]!.sql}`)
      .all(...reads[0]!.bindings)
      .map((row) => String(row.detail))
      .join("\n");
    expect(plan).toContain(
      "USING INDEX idx_visits_site_pk_pathname_started_at",
    );
  });

  it("pages through the report with cursors", async () => {
    const whole = await report(EMPTY_FILTER_DOCUMENT, 100);
    const paged = await report(EMPTY_FILTER_DOCUMENT, 2);

    expect(paged.reads.length).toBeGreaterThan(1);
    expect(paged.items).toEqual(whole.items);
  });

  it("refuses a cursor made for another filter", async () => {
    const first = await queryPagesPageFromD1(
      env,
      SITE.siteId,
      window,
      EMPTY_FILTER_DOCUMENT,
      1,
      null,
      "private-dashboard",
    );
    expect(first.pagination.nextCursor).not.toBeNull();
    await expect(
      decodePagesCursor(
        env,
        SITE.siteId,
        window,
        PRICING,
        first.pagination.nextCursor,
        "private-dashboard",
      ),
    ).rejects.toThrow(InvalidCursorError);
  });
});
