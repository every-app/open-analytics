import { describe, expect, it } from "vitest";

import {
  alignComparisonPoints,
  GRAPH_METRIC_PARAM,
  graphMetricFromSearchParams,
  graphPoints,
  TOP_STATS,
  TopStat,
  topStatChange,
  topStatValue,
  withGraphMetric,
} from "@/components/dashboard/site-pages/overview/top-stats";
import { addZonedInterval } from "@/lib/analytics/time-zone";
import type { TrendPoint } from "@/lib/dashboard-api/client/edge";

const DAY_MS = 24 * 60 * 60 * 1000;
const day = (index: number) => Date.UTC(2026, 10, 1) + index * DAY_MS;

function point(timestampMs: number, totals: Partial<TrendPoint>): TrendPoint {
  return {
    bucket: 0,
    timestampMs,
    views: 0,
    visitors: 0,
    sessions: 0,
    bounces: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    source: "detail",
    ...totals,
  };
}

describe("top stats", () => {
  it("lists Plausible's six stats in its order", () => {
    expect(TOP_STATS).toEqual([
      "visitors",
      "visits",
      "pageviews",
      "viewsPerVisit",
      "bounceRate",
      "visitDuration",
    ]);
  });

  it("keeps the graphed stat in the address, leaving out the default", () => {
    expect(graphMetricFromSearchParams(new URLSearchParams())).toBe(
      TopStat.Visitors,
    );
    expect(
      graphMetricFromSearchParams(new URLSearchParams("metric=bounceRate")),
    ).toBe(TopStat.BounceRate);
    // An unknown stat, like one from an old link, graphs visitors.
    expect(
      graphMetricFromSearchParams(new URLSearchParams("metric=revenue")),
    ).toBe(TopStat.Visitors);

    const params = new URLSearchParams("range=7d&filter[page.path]=eq:/");
    const picked = withGraphMetric(params, TopStat.Pageviews);
    expect(picked.get(GRAPH_METRIC_PARAM)).toBe("pageviews");
    expect(picked.get("range")).toBe("7d");
    expect(params.has(GRAPH_METRIC_PARAM)).toBe(false);
    expect(
      withGraphMetric(picked, TopStat.Visitors).has(GRAPH_METRIC_PARAM),
    ).toBe(false);
  });

  it("works each stat out from the totals", () => {
    const totals = {
      views: 30,
      visitors: 8,
      sessions: 10,
      bounces: 4,
      totalDurationMs: 50_000,
    };
    expect(
      Object.fromEntries(
        TOP_STATS.map((stat) => [stat, topStatValue(stat, totals)]),
      ),
    ).toEqual({
      visitors: 8,
      visits: 10,
      pageviews: 30,
      viewsPerVisit: 3,
      bounceRate: 0.4,
      visitDuration: 5_000,
    });
    // Without visits the per-visit stats have no value, not zero.
    const empty = { ...totals, sessions: 0 };
    expect(topStatValue(TopStat.BounceRate, empty)).toBeNull();
    expect(topStatValue(TopStat.ViewsPerVisit, empty)).toBeNull();
    expect(topStatValue(TopStat.VisitDuration, empty)).toBeNull();
    expect(topStatValue(TopStat.Visits, empty)).toBe(0);
  });

  it("measures the change against the reference, when there is one", () => {
    expect(topStatChange(15, 10)).toBe(50);
    expect(topStatChange(5, 10)).toBe(-50);
    expect(topStatChange(5, 0)).toBeNull();
    expect(topStatChange(null, 10)).toBeNull();
    expect(topStatChange(5, null)).toBeNull();
  });

  it("draws every interval of the window, the empty ones too", () => {
    const window = {
      from: day(0),
      to: day(4),
      interval: "day" as const,
      timeZone: "UTC",
    };
    const points = [
      point(day(1), { views: 6, visitors: 2, sessions: 3, bounces: 1 }),
      // Two points in one interval add up.
      point(day(3), { views: 2, visitors: 1, sessions: 1 }),
      point(day(3) + 60_000, {
        views: 2,
        visitors: 1,
        sessions: 1,
        bounces: 1,
      }),
    ];

    expect(graphPoints(window, points, TopStat.Pageviews)).toEqual([
      { timestampMs: day(0), value: 0 },
      { timestampMs: day(1), value: 6 },
      { timestampMs: day(2), value: 0 },
      { timestampMs: day(3), value: 4 },
    ]);
    expect(
      graphPoints(window, points, TopStat.BounceRate).map(
        (graphPoint) => graphPoint.value,
      ),
    ).toEqual([null, 1 / 3, null, 0.5]);
  });

  it("buckets by the reporting zone", () => {
    const tokyoMidnight = Date.UTC(2026, 10, 1) - 9 * 60 * 60 * 1000;
    const window = {
      from: tokyoMidnight,
      to: tokyoMidnight + 2 * DAY_MS,
      interval: "day" as const,
      timeZone: "Asia/Tokyo",
    };
    const lateEvening = tokyoMidnight + DAY_MS - 60_000;
    expect(
      graphPoints(
        window,
        [point(lateEvening, { visitors: 1 })],
        TopStat.Visitors,
      ),
    ).toEqual([
      { timestampMs: tokyoMidnight, value: 1 },
      { timestampMs: tokyoMidnight + DAY_MS, value: 0 },
    ]);
  });

  it("pairs year-over-year buckets by date across a leap day", () => {
    const date = (year: number, month: number, dayOfMonth: number) =>
      Date.UTC(year, month - 1, dayOfMonth);
    const buckets = (...timestamps: number[]) =>
      timestamps.map((timestampMs, index) => ({ timestampMs, value: index }));
    const days = { interval: "day" as const, timeZone: "UTC" };

    // 28 February to 2 March 2025 against the same dates of 2024, which
    // has a 29 February in between.
    const current = buckets(
      date(2025, 2, 28),
      date(2025, 3, 1),
      date(2025, 3, 2),
    );
    const leapYear = buckets(
      date(2024, 2, 28),
      date(2024, 2, 29),
      date(2024, 3, 1),
      date(2024, 3, 2),
    );
    expect(alignComparisonPoints(days, "year", current, leapYear)).toEqual([
      leapYear[0],
      leapYear[2],
      leapYear[3],
    ]);
    // A previous period still pairs bucket for bucket.
    expect(alignComparisonPoints(days, "previous", current, leapYear)).toEqual(
      leapYear.slice(0, 3),
    );
    // The leap day itself has nothing to compare with.
    const yearBefore = buckets(date(2023, 2, 28), date(2023, 3, 1));
    expect(
      alignComparisonPoints(days, "year", leapYear.slice(0, 3), yearBefore),
    ).toEqual([yearBefore[0], undefined, yearBefore[1]]);
    // Weeks start on Mondays, other dates a year earlier: each pairs with
    // the week holding its date.
    const weeks = { interval: "week" as const, timeZone: "UTC" };
    const lastYearWeeks = buckets(date(2025, 10, 27), date(2025, 11, 3));
    expect(
      alignComparisonPoints(
        weeks,
        "year",
        buckets(date(2026, 11, 2), date(2026, 11, 9)),
        lastYearWeeks,
      ),
    ).toEqual(lastYearWeeks);
  });

  it("draws each real hour across a daylight-saving change", () => {
    const zone = "America/Los_Angeles";
    // 01:00 on 8 March 2026, when the clock then jumps to 03:00. Stepping by
    // the wall clock stalled here and the graph never finished.
    expect(addZonedInterval(Date.UTC(2026, 2, 8, 9), "hour", zone)).toBe(
      Date.UTC(2026, 2, 8, 10),
    );
    const springForward = graphPoints(
      {
        from: Date.UTC(2026, 2, 8, 8),
        to: Date.UTC(2026, 2, 9, 7),
        interval: "hour",
        timeZone: zone,
      },
      [],
      TopStat.Visitors,
    );
    expect(springForward).toHaveLength(23);

    // 1 November 2026 repeats 01:00; a view in the second one stays there.
    const fallBack = graphPoints(
      {
        from: Date.UTC(2026, 10, 1, 7),
        to: Date.UTC(2026, 10, 2, 8),
        interval: "hour",
        timeZone: zone,
      },
      [point(Date.UTC(2026, 10, 1, 9, 30), { visitors: 3 })],
      TopStat.Visitors,
    );
    expect(fallBack).toHaveLength(25);
    expect(fallBack.slice(1, 4)).toEqual([
      { timestampMs: Date.UTC(2026, 10, 1, 8), value: 0 },
      { timestampMs: Date.UTC(2026, 10, 1, 9), value: 3 },
      { timestampMs: Date.UTC(2026, 10, 1, 10), value: 0 },
    ]);
  });
});
