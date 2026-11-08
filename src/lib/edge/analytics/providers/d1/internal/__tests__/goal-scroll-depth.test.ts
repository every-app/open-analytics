import { describe, expect, it } from "vitest";

import {
  createRollupTestEnv,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import {
  analyticsFilterRegistry,
  type FilterDocument,
} from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core-types";
import {
  queryGoalConversionsFromD1,
  queryGoalTimeseriesFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/goal-conversions";
import { parseFilterDsl } from "@/lib/filter-contract";

const SITE = { siteId: "site-1", sitePk: 1 };
const window: QueryWindow = {
  startMs: 0,
  endExclusiveMs: 180_000,
  nowMs: 180_000,
  timeZone: "UTC",
};
const noFilters: FilterDocument = { conditions: [] };
const scrollGoal = parseFilterDsl(
  'page.path eq "/pricing" AND page.scrollDepth gte 75',
  analyticsFilterRegistry,
);

/** Page views of four visitors, each in their own session. */
function createEnv() {
  const { database, env } = createRollupTestEnv();
  seedSites(database, [SITE]);
  const insert = database.prepare(`
    INSERT INTO visits (
      visit_id, site_pk, visitor_id, session_id, status, started_at,
      last_activity_at, pathname, hostname, scroll_depth
    ) VALUES (?, ?, ?, ?, 'complete', ?, ?, ?, 'example.com', ?)
  `);
  const pageViews: Array<[string, string, number, string, number | null]> = [
    // Scrolled past 75% of the pricing page.
    ["a-1", "a", 10_000, "/pricing", 80],
    // 75% of the pricing page exactly.
    ["d-1", "d", 130_000, "/pricing", 75],
    // Halfway down the pricing page, and deep into another page.
    ["b-1", "b", 70_000, "/pricing", 50],
    ["b-2", "b", 80_000, "/blog", 90],
    // A pricing page view from before scroll depth was recorded.
    ["c-1", "c", 70_000, "/pricing", null],
  ];
  for (const [visitId, person, startedAt, pathname, depth] of pageViews) {
    insert.run(
      visitId,
      SITE.sitePk,
      `visitor-${person}`,
      `session-${person}`,
      startedAt,
      startedAt,
      pathname,
      depth,
    );
  }
  return env;
}

describe("scroll depth goals", () => {
  it("count only the visitors who reached the depth on that page", async () => {
    const result = await queryGoalConversionsFromD1(
      createEnv(),
      SITE.siteId,
      window,
      noFilters,
      [{ id: "scroll", filter: scrollGoal }],
    );
    expect(result.totalSessions).toBe(4);
    expect(result.totalVisitors).toBe(4);
    expect(result.goals.get("scroll")).toEqual({
      sessions: 2,
      visitors: 2,
      conversions: 2,
      revenue: null,
    });
  });

  it("convert in the bucket where the depth was reached", async () => {
    const rows = await queryGoalTimeseriesFromD1(
      createEnv(),
      SITE.siteId,
      window,
      "minute",
      noFilters,
      scrollGoal,
    );

    expect(
      rows.map(({ bucket, totalVisitors, convertedVisitors }) => ({
        bucket,
        totalVisitors,
        convertedVisitors,
      })),
    ).toEqual([
      { bucket: 0, totalVisitors: 1, convertedVisitors: 1 },
      { bucket: 1, totalVisitors: 2, convertedVisitors: 0 },
      { bucket: 2, totalVisitors: 1, convertedVisitors: 1 },
    ]);
  });
});
