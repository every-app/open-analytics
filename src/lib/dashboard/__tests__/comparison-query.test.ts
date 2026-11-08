import { describe, expect, it } from "vitest";

import { dashboardComparisonLabel } from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { zonedTimeToUtcMs } from "@/lib/analytics/time-zone";
import {
  type DashboardComparisonQuery,
  resolveDashboardComparisonQuery,
  yearAgoComparisonWindow,
} from "@/lib/dashboard/comparison-query";
import { parseFilterDocumentFromSearchParams } from "@/lib/dashboard/query-state";
import {
  comparisonReferenceWindow,
  normalizeReportingTimeZone,
} from "@/lib/edge/analytics/contract/helpers";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/filter-contract";
import type { AppMessages } from "@/lib/i18n/messages";
const currentWindow = {
  preset: "7d" as const,
  from: 1_000_000,
  to: 1_604_800,
  interval: "day" as const,
  timeZone: "UTC",
};
const currentFilters = parseFilterDocumentFromSearchParams(
  new URLSearchParams({ "filter[page.path]": "/docs" }),
);
const messages = {
  dashboardHeader: {
    compareButton: "Compare",
    previousPeriod: "Previous period",
    yearAgo: "Same period last year",
  },
} as AppMessages;
describe("resolveDashboardComparisonQuery", () => {
  it("returns null when comparison is not active", () => {
    expect(
      resolveDashboardComparisonQuery(
        new URLSearchParams(),
        currentWindow,
        currentFilters,
      ),
    ).toBeNull();
  });

  it("returns null for same-period comparison without a comparison filter", () => {
    expect(
      resolveDashboardComparisonQuery(
        new URLSearchParams("compare=same"),
        currentWindow,
        currentFilters,
      ),
    ).toBeNull();
  });

  it("uses the current window and comparison filter for same-period comparison", () => {
    const result = resolveDashboardComparisonQuery(
      new URLSearchParams(
        "compare=same&compareFilter%5Bpage.path%5D=%2Fpricing",
      ),
      currentWindow,
      currentFilters,
    );

    expect(result).toMatchObject({
      mode: "same",
      window: currentWindow,
      filters: { conditions: [{ value: "/pricing" }] },
    });
  });

  it("uses a custom comparison filter instead of the current one", () => {
    const result = resolveDashboardComparisonQuery(
      new URLSearchParams(
        "compare=previous&compareFilter%5Bpage.path%5D=%2Fpricing",
      ),
      currentWindow,
      currentFilters,
    );

    expect(result?.filters.conditions).toMatchObject([{ value: "/pricing" }]);
  });

  it("shifts previous-period comparison and follows current filters by default", () => {
    const result = resolveDashboardComparisonQuery(
      new URLSearchParams("compare=previous"),
      currentWindow,
      currentFilters,
    );

    expect(result).toMatchObject({
      mode: "previous",
      window: {
        from: 395_199,
        to: 1_000_000 - 1,
      },
      filters: currentFilters,
    });
  });

  it("compares with the same dates a year earlier", () => {
    const window = {
      preset: "mtd" as const,
      from: Date.UTC(2026, 10, 1),
      to: Date.UTC(2026, 10, 6, 12),
      interval: "day" as const,
      timeZone: "Europe/Berlin",
    };
    const result = resolveDashboardComparisonQuery(
      new URLSearchParams("compare=year"),
      window,
      currentFilters,
    );

    expect(result).toMatchObject({
      mode: "year",
      window: {
        ...window,
        from: Date.UTC(2025, 10, 1),
        to: Date.UTC(2025, 10, 6, 12),
      },
      filters: currentFilters,
    });
  });

  it("moves a leap day to the 28th of February a year earlier", () => {
    expect(
      yearAgoComparisonWindow({
        ...currentWindow,
        from: Date.UTC(2028, 1, 29, 8),
        to: Date.UTC(2028, 2, 1),
      }),
    ).toMatchObject({
      from: Date.UTC(2027, 1, 28, 8),
      to: Date.UTC(2027, 2, 1),
    });
  });

  it("keeps a range ending at 29 February's midnight non-empty, on both sides", () => {
    const zone = "America/Los_Angeles";
    const midnight = (year: number, month: number, day: number) =>
      zonedTimeToUtcMs(zone, {
        year,
        month,
        day,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
    // 28 February 2024 alone: its exclusive end is 29 February's midnight,
    // which once landed on the 28th a year earlier and emptied the range.
    const window = {
      ...currentWindow,
      from: midnight(2024, 2, 28),
      to: midnight(2024, 2, 29),
      timeZone: zone,
    };
    const yearAgo = { from: midnight(2023, 2, 28), to: midnight(2023, 3, 1) };

    expect(yearAgoComparisonWindow(window)).toMatchObject(yearAgo);
    expect(
      comparisonReferenceWindow("year", {
        startMs: window.from,
        endExclusiveMs: window.to,
        nowMs: window.to,
        timeZone: normalizeReportingTimeZone(zone),
      }),
    ).toMatchObject({ startMs: yearAgo.from, endExclusiveMs: yearAgo.to });
  });

  it("keeps a rolling range across 29 February its length, on both sides", () => {
    const zone = "America/Los_Angeles";
    const noon = (year: number, month: number, day: number) =>
      zonedTimeToUtcMs(zone, {
        year,
        month,
        day,
        hour: 12,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
    // The last 24 hours, noon 28 February to noon 29 February 2024: both
    // ends once moved to noon 28 February 2023, an empty range.
    const window = {
      ...currentWindow,
      preset: "24h" as const,
      from: noon(2024, 2, 28),
      to: noon(2024, 2, 29),
      timeZone: zone,
    };
    const yearAgo = { from: noon(2023, 2, 28), to: noon(2023, 3, 1) };

    expect(yearAgoComparisonWindow(window)).toMatchObject(yearAgo);
    expect(
      comparisonReferenceWindow("year", {
        startMs: window.from,
        endExclusiveMs: window.to,
        nowMs: window.to,
        timeZone: normalizeReportingTimeZone(zone),
      }),
    ).toMatchObject({ startMs: yearAgo.from, endExclusiveMs: yearAgo.to });
  });

  it("compares year to date with the same dates, across a leap year", () => {
    // 1 January to noon 1 March 2024 holds 29 February; a year earlier is
    // still 1 January to noon 1 March, not a day longer.
    expect(
      yearAgoComparisonWindow({
        ...currentWindow,
        preset: "ytd" as const,
        from: Date.UTC(2024, 0, 1),
        to: Date.UTC(2024, 2, 1, 12),
      }),
    ).toMatchObject({
      from: Date.UTC(2023, 0, 1),
      to: Date.UTC(2023, 2, 1, 12),
    });
  });

  it("ignores legacy comparison evaluation parameters", () => {
    const result = resolveDashboardComparisonQuery(
      new URLSearchParams(
        "compare=previous&compareEvalFrom=2026-01-01T00%3A00%3A00Z&compareEvalTo=2026-02-01T00%3A00%3A00Z",
      ),
      currentWindow,
      currentFilters,
    );

    expect(result?.window).toEqual({
      ...currentWindow,
      from: 395_199,
      to: 999_999,
    });
  });

  it("returns null when no previous window is available", () => {
    expect(
      resolveDashboardComparisonQuery(
        new URLSearchParams("compare=previous"),
        { ...currentWindow, from: 0, to: 100 },
        currentFilters,
      ),
    ).toBeNull();
  });

  it("labels an unfiltered previous comparison as the previous period", () => {
    const comparisonQuery: DashboardComparisonQuery = {
      mode: "previous",
      window: currentWindow,
      filters: EMPTY_FILTER_DOCUMENT,
    };

    expect(dashboardComparisonLabel(messages, comparisonQuery)).toBe(
      "Previous period",
    );
    expect(
      dashboardComparisonLabel(messages, { ...comparisonQuery, mode: "year" }),
    ).toBe("Same period last year");
    expect(dashboardComparisonLabel(messages, null)).toBe("Compare");
  });

  it("labels filtered comparisons consistently as comparisons", () => {
    const comparisonQuery: DashboardComparisonQuery = {
      mode: "previous",
      window: currentWindow,
      filters: currentFilters,
    };

    expect(dashboardComparisonLabel(messages, comparisonQuery)).toBe("Compare");
  });
});
