import { describe, expect, it, vi } from "vitest";

import type { QueryOperation } from "@/lib/edge/analytics/contract";
import {
  analyticsFilterRegistry,
  assertFilterAudience,
  createTimeRange,
  executeOverview,
  executeTrend,
  FilterAdapterError,
  isReportingTimeZone,
  normalizeReportingTimeZone,
  parseFilterParams,
  parseFilterUrlForAudience,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import {
  EVENT_SOURCE_COLUMNS,
  VISIT_SOURCE_COLUMNS,
} from "@/lib/edge/analytics/providers/d1/internal/core-sources";
import { FilterValidationError, parseFilterDsl } from "@/lib/filter-contract";

describe("query contract boundary coverage", () => {
  it("keeps private fields out of public filters", () => {
    expect(
      analyticsFilterRegistry.get("page.query")?.audiences.has("public-share"),
    ).toBe(false);
    const privateQuery = parseFilterDsl(
      'page.query eq "a=1"',
      analyticsFilterRegistry,
    );
    expect(() =>
      assertFilterAudience(
        privateQuery,
        analyticsFilterRegistry,
        "public-share",
      ),
    ).toThrow(/not allowed/);
    expect(() =>
      assertFilterAudience(
        privateQuery,
        analyticsFilterRegistry,
        "private-dashboard",
      ),
    ).not.toThrow();
  });

  it("keeps visit fields available through every event's visit", () => {
    const visitColumns = [
      "duration_ms",
      "scroll_depth",
      "is_eu",
      "screen_width",
      "screen_height",
      "channel",
    ];
    for (const column of visitColumns) {
      expect(VISIT_SOURCE_COLUMNS).toMatch(new RegExp(`\\b${column}\\b`));
      expect(EVENT_SOURCE_COLUMNS).toContain(`v.${column}`);
    }
  });

  it("no longer knows the network organization field", () => {
    expect(analyticsFilterRegistry.has("geo.organization")).toBe(false);
    expect(() =>
      parseFilterParams(
        "filter[geo.organization]=Example ISP",
        analyticsFilterRegistry,
      ),
    ).toThrow(FilterValidationError);
    expect(() =>
      parseFilterUrlForAudience(
        "private-dashboard",
        "filter[geo.organization]=Example ISP",
      ),
    ).toThrow(FilterAdapterError);
    expect(VISIT_SOURCE_COLUMNS).not.toMatch(
      /as_organization|ua_raw|postal_code|metro_code/,
    );
    expect(EVENT_SOURCE_COLUMNS).not.toContain("as_organization");
  });

  it("covers denied overview and trend execution paths", async () => {
    const time = {
      range: { startMs: 0, endExclusiveMs: 1 },
      reportingTimeZone: "UTC",
      capturedAtMs: 1,
    } as never;
    const context = siteQueryContext("site-1", "private-dashboard");
    const deniedContext = {
      ...context,
      policy: {
        ...context.policy,
        allowedOperations: new Set<QueryOperation>(),
      },
    };
    const reader = {
      readOverview: vi.fn(),
      readTrend: vi.fn(),
    };
    await expect(
      executeOverview(reader, { context: deniedContext, time }),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "capability-denied", capability: "overview" },
    });
    await expect(
      executeTrend(reader, { context: deniedContext, time, interval: "hour" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "capability-denied", capability: "trend" },
    });
    expect(reader.readOverview).not.toHaveBeenCalled();
    expect(reader.readTrend).not.toHaveBeenCalled();
    expect(isReportingTimeZone("UTC")).toBe(true);
    expect(isReportingTimeZone("not/a-zone")).toBe(false);
  });

  it("returns a single-source overview without optional branches", async () => {
    const time = {
      range: { startMs: 0, endExclusiveMs: 1 },
      reportingTimeZone: "UTC",
      capturedAtMs: 1,
    } as never;
    const reader = {
      readOverview: vi.fn().mockResolvedValue({
        value: {
          views: 1,
          sessions: 1,
          visitors: 1,
          bounces: 0,
          totalDurationMs: 0,
          durationViews: 0,
        },
        source: "raw",
        approximateVisitors: false,
      }),
      readTrend: vi.fn(),
    };
    await expect(
      executeOverview(reader, {
        context: siteQueryContext("site-1", "private-dashboard"),
        time,
      }),
    ).resolves.toMatchObject({ ok: true, meta: { source: "raw" } });
  });

  it("rejects non-integral time ranges and invalid timezone fallbacks", () => {
    expect(() => createTimeRange(0.5, 2)).toThrow(/safe integer/i);
    expect(normalizeReportingTimeZone("bad/zone", "also/bad")).toBe("UTC");
    expect(new FilterAdapterError("private-dashboard", "invalid").message).toBe(
      "Invalid filter input.",
    );
  });
});
