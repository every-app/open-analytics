import { describe, expect, it } from "vitest";

import {
  changeRateClass,
  emptyOverviewMetrics,
  emptySiteMetricChangeRates,
  epochSecondsToMs,
  formatChangeRate,
  getSiteSlug,
  safeSlug,
  sortSitesForInitialOrder,
  withSiteSlug,
} from "@/components/dashboard/admin/team-management/model";
import {
  formatDateSpan,
  INTERVAL_ORDER,
  intervalLabel,
  MENU_RANGE_PRESETS,
  rangeForShortcut,
  rangeLabel,
  ROLLING_RANGE_PRESETS,
  shiftTimeWindow,
  stepTimeWindow,
  toCalendarDate,
  toDateRange,
} from "@/components/dashboard/shell/dashboard-header-controls/range";
import {
  canonicalizeGeoFilterValue,
  extractGeoCountryCodeFromFilterValue,
  resolveGeoCityBreadcrumbData,
  resolveGeoDimensionRowRawValue,
  resolveGeoLocationHighlightValue,
  resolveGeoRegionBreadcrumbData,
} from "@/components/dashboard/site-pages/overview/overview-filter-model";
import { zonedTimeToUtcMs } from "@/lib/analytics/time-zone";
import { EMPTY_DASHBOARD_FILTER_DOCUMENT } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { AppMessages } from "@/lib/i18n/messages";

const windowFor = (
  from: number,
  to: number,
  interval: TimeWindow["interval"] = "day",
): TimeWindow => ({
  preset: "custom",
  from,
  to,
  interval,
  timeZone: "UTC",
});

const messages = {
  ranges: {
    today: "today",
    yesterday: "yesterday",
    last7d: "7d",
    last30d: "30d",
    last90d: "90d",
    last12m: "12m",
    lastMonth: "lastMonth",
    custom: "custom",
  },
  intervals: {
    minute: "minute",
    hour: "hour",
    day: "day",
    week: "week",
    month: "month",
  },
  performance: {
    great: "great",
    needsImprovement: "needs improvement",
    poor: "poor",
    clsUnit: "score",
    msUnit: "ms",
    secondsUnit: "s",
    samplesLabel: "samples",
  },
  common: { noData: "no data" },
} as unknown as AppMessages;

describe("dashboard domain model helpers", () => {
  it("normalizes dashboard date ranges and shifts windows safely", () => {
    expect(ROLLING_RANGE_PRESETS.has("30d")).toBe(true);
    expect(ROLLING_RANGE_PRESETS.has("custom")).toBe(false);
    expect(INTERVAL_ORDER).toEqual(["minute", "hour", "day", "week", "month"]);
    expect(MENU_RANGE_PRESETS).toEqual([
      "today",
      "yesterday",
      "24h",
      "7d",
      "30d",
      "90d",
      "mtd",
      "lastMonth",
      "ytd",
      "12m",
      "all",
    ]);
    const key = (keyValue: string, target: EventTarget | null = null) => ({
      key: keyValue,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target,
    });
    expect(rangeForShortcut(key("T"))).toBe("today");
    expect(rangeForShortcut(key("3"))).toBe("30d");
    expect(rangeForShortcut(key("a"))).toBe("all");
    expect(rangeForShortcut({ ...key("t"), metaKey: true })).toBeNull();
    expect(
      rangeForShortcut(key("t", document.createElement("input"))),
    ).toBeNull();
    expect(rangeForShortcut(key("q"))).toBeNull();
    expect(rangeLabel(messages, "lastMonth")).toBe("lastMonth");
    expect(rangeLabel(messages, "today")).toBe("today");
    expect(rangeLabel(messages, "custom")).toBe("custom");
    expect(rangeLabel(messages, "12m")).toBe("12m");
    expect(intervalLabel(messages, "minute")).toBe("minute");
    expect(intervalLabel(messages, "month")).toBe("month");

    expect(toCalendarDate(Number.NaN, "UTC")).toBeNull();
    expect(toCalendarDate(Date.UTC(2024, 4, 6), "UTC")?.getDate()).toBe(6);
    expect(toDateRange(undefined, 1, "UTC")).toBeUndefined();
    expect(
      toDateRange(Date.UTC(2024, 4, 6), Date.UTC(2024, 4, 8), "UTC"),
    ).toMatchObject({ from: new Date(2024, 4, 6), to: new Date(2024, 4, 7) });
    expect(formatDateSpan("en", "UTC", undefined, 1)).toBe("");
    expect(
      formatDateSpan("en", "UTC", Date.UTC(2024, 4, 6), Date.UTC(2024, 4, 7)),
    ).toContain(" - ");
    expect(shiftTimeWindow(100, 200, "previous", 500)).toEqual({
      from: 0,
      to: 99,
    });
    expect(shiftTimeWindow(0, 1, "previous", 500)).toBeNull();
    expect(shiftTimeWindow(100, 200, "next", 500)).toEqual({
      from: 201,
      to: 301,
    });
    expect(shiftTimeWindow(100, 200, "next", 201)).toEqual({
      from: 101,
      to: 201,
    });
    expect(shiftTimeWindow(100, 200, "next", 200)).toBeNull();
  });

  it("steps calendar ranges by whole months in the zone", () => {
    const timeZone = "America/Los_Angeles";
    const monthStart = (year: number, month: number) =>
      zonedTimeToUtcMs(timeZone, {
        year,
        month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      });
    const now = Date.UTC(2026, 10, 6, 20);
    const month = (year: number, monthOfYear: number) => ({
      from: monthStart(year, monthOfYear),
      to: monthStart(year, monthOfYear + 1),
    });
    const october = { ...month(2026, 10), timeZone };

    // Last month is October; a step back is September, not 30 days earlier.
    const september = stepTimeWindow("lastMonth", october, "previous", now);
    expect(september).toEqual(month(2026, 9));
    expect(formatDateSpan("en", timeZone, september!.from, september!.to)).toBe(
      "Sep 1, 2026 - Sep 30, 2026",
    );
    // The custom range it became keeps stepping by month.
    expect(
      stepTimeWindow(
        "custom",
        { ...month(2026, 9), timeZone },
        "previous",
        now,
      ),
    ).toEqual(month(2026, 8));
    expect(stepTimeWindow("lastMonth", october, "next", now)).toEqual(
      month(2026, 11),
    );
    expect(
      stepTimeWindow("custom", { ...month(2026, 11), timeZone }, "next", now),
    ).toBeNull();
    // Month to date and Year to date step back to the whole month or year.
    expect(
      stepTimeWindow(
        "mtd",
        { from: monthStart(2026, 11), to: now, timeZone },
        "previous",
        now,
      ),
    ).toEqual(month(2026, 10));
    expect(
      stepTimeWindow(
        "ytd",
        { from: monthStart(2026, 1), to: now, timeZone },
        "previous",
        now,
      ),
    ).toEqual({ from: monthStart(2025, 1), to: monthStart(2026, 1) });
    // Fixed-length ranges still step by their length.
    expect(
      stepTimeWindow("7d", { from: 100, to: 200, timeZone }, "previous", 500),
    ).toEqual({ from: 0, to: 99 });
  });

  it("covers site-management metric, slug, and sorting helpers", () => {
    expect(emptyOverviewMetrics().views).toBe(0);
    expect(emptySiteMetricChangeRates().views).toBeNull();
    expect(formatChangeRate(null)).toBeNull();
    expect(formatChangeRate(1.25)).toBe("+1.3%");
    expect(formatChangeRate(-1.25)).toBe("-1.3%");
    expect(changeRateClass(null)).toContain("muted");
    expect(changeRateClass(2)).toContain("success");
    expect(changeRateClass(-2)).toContain("destructive");
    expect(changeRateClass(-2, true)).toContain("success");
    expect(epochSecondsToMs(10)).toBe(10_000);
    expect(epochSecondsToMs(100_000_000_000)).toBe(100_000_000_000);
    expect(safeSlug(" My Site.EXAMPLE ")).toBe("my-site-example");
    const emptyDomain = { id: "abcdefgh-1", domain: "!!!" } as SiteData;
    expect(getSiteSlug(emptyDomain)).toBe("abcdefgh");
    const site = { id: "id1", domain: "example.com" } as SiteData;
    expect(withSiteSlug(site).slug).toBe("example-com");
    expect(
      sortSitesForInitialOrder([
        { id: "b", name: "Beta", overview: { views: 2, visitors: 1 } },
        { id: "a", name: "alpha", overview: { views: 2, visitors: 1 } },
        { id: "c", name: "Zed", overview: { views: 1, visitors: 5 } },
      ]).map((item) => item.id),
    ).toEqual(["a", "b", "c"]);
  });

  it("normalizes overview geo filters and breadcrumbs", () => {
    expect(extractGeoCountryCodeFromFilterValue(null)).toBeNull();
    expect(extractGeoCountryCodeFromFilterValue("  us::ca::California ")).toBe(
      "US",
    );
    expect(extractGeoCountryCodeFromFilterValue("California")).toBeNull();
    expect(canonicalizeGeoFilterValue(null)).toBeNull();
    expect(canonicalizeGeoFilterValue(" us::ca::California ")).toBe(
      "US::CA::California",
    );
    expect(
      resolveGeoLocationHighlightValue(
        "country",
        "US::CA::California::San Francisco",
      ),
    ).toBe("US");
    expect(
      resolveGeoLocationHighlightValue(
        "region",
        "US::CA::California::San Francisco",
      ),
    ).toBe("US::CA::California");
    expect(resolveGeoLocationHighlightValue("region", "US::CA")).toBeNull();
    expect(resolveGeoLocationHighlightValue("country", null)).toBeNull();
    expect(resolveGeoLocationHighlightValue("city", "::")).toBeNull();
    expect(
      resolveGeoLocationHighlightValue(
        "city",
        "US::CA::California::San Francisco",
      ),
    ).toBe("US::CA::California::San Francisco");
    expect(resolveGeoLocationHighlightValue("city", "US::CA")).toBeNull();

    const region = resolveGeoRegionBreadcrumbData(
      "US::CA::California",
      "en",
      "Unknown",
    );
    expect(region.breadcrumb.hideRegion).toBe(false);
    expect(region.filterValue).toContain("US::CA");
    expect(
      resolveGeoRegionBreadcrumbData("US", "en", "Unknown").breadcrumb
        .hideRegion,
    ).toBe(true);
    expect(
      resolveGeoRegionBreadcrumbData("US::California", "en", "Unknown"),
    ).toMatchObject({
      breadcrumb: { hideRegion: false, stateCode: "" },
    });
    expect(
      resolveGeoRegionBreadcrumbData("::CA::California", "en", "Unknown")
        .breadcrumb.countryIconName,
    ).toBeNull();

    expect(
      resolveGeoCityBreadcrumbData("San Francisco", "en", "Unknown"),
    ).toMatchObject({ breadcrumb: null, displayLabel: "San Francisco" });
    expect(
      resolveGeoCityBreadcrumbData("bad::", "en", "Unknown").breadcrumb,
    ).toBeNull();
    expect(
      resolveGeoCityBreadcrumbData("US::San Francisco", "en", "Unknown")
        .breadcrumb,
    ).toMatchObject({ hideRegion: true, hideCity: false });
    expect(
      resolveGeoCityBreadcrumbData("US::United States", "en", "Unknown")
        .breadcrumb,
    ).toMatchObject({ hideCity: true });
    expect(
      resolveGeoCityBreadcrumbData("US::", "en", "Unknown").breadcrumb,
    ).toBeNull();
    expect(
      resolveGeoCityBreadcrumbData("USA::Los Angeles", "en", "Unknown")
        .breadcrumb,
    ).toBeNull();
    expect(
      resolveGeoCityBreadcrumbData(
        "US::CA::California::California",
        "en",
        "Unknown",
      ),
    ).toMatchObject({ breadcrumb: { hideCity: true, hideRegion: false } });
    expect(
      resolveGeoCityBreadcrumbData("US::::Unknown", "en", "Unknown"),
    ).toMatchObject({ breadcrumb: { hideRegion: true, cityLabel: "Unknown" } });
    expect(
      resolveGeoCityBreadcrumbData(
        "US::CA::California::San Francisco",
        "en",
        "Unknown",
      ).breadcrumb,
    ).toMatchObject({ hideRegion: false, hideCity: false });
    expect(
      resolveGeoCityBreadcrumbData(
        "::CA::California::Springfield",
        "en",
        "Unknown",
      ),
    ).toMatchObject({
      filterValue: "Springfield",
      breadcrumb: { countryCode: "" },
    });

    expect(resolveGeoDimensionRowRawValue({ label: " fallback " })).toBe(
      "fallback",
    );
    expect(resolveGeoDimensionRowRawValue({ value: " raw " })).toBe("raw");
  });
});
