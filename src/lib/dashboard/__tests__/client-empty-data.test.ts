import { describe, expect, it } from "vitest";

import {
  emptyDashboardFilterOptions,
  emptyDimension,
  emptyEventFieldValues,
  emptyOverview,
  emptyOverviewClientDimensionTabs,
  emptyOverviewGeoDimensionTabs,
  emptyOverviewGeoPoints,
  emptyOverviewGeoTab,
  emptyOverviewTab,
  emptyPageCardTabs,
  emptyPages,
  emptyReferrers,
  emptyTrend,
} from "@/lib/dashboard/client/data/empty";
describe("dashboard client empty data builders", () => {
  it("builds an empty trend payload", () => {
    expect(emptyTrend("hour")).toEqual({
      ok: true,
      interval: "hour",
      data: [],
    });
  });

  it("preserves requested empty metadata values", () => {
    expect(emptyEventFieldValues("payload.plan", "string")).toEqual({
      ok: true,
      fieldPath: "payload.plan",
      fieldValueType: "string",
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
  });

  it("builds empty dashboard dimension containers", () => {
    expect(emptyOverviewGeoPoints()).toEqual({
      ok: true,
      data: [],
      countryCounts: [],
      regionCounts: [],
      cityCounts: [],
    });
    expect(emptyOverviewClientDimensionTabs()).toEqual({
      browser: [],
      osVersion: [],
      deviceType: [],
      language: [],
      screenSize: [],
    });
    expect(emptyOverviewGeoDimensionTabs()).toEqual({
      country: [],
      region: [],
      city: [],
      continent: [],
      timezone: [],
      organization: [],
    });
  });

  it("builds empty top-level dashboard payloads", () => {
    expect(emptyOverview().data).toMatchObject({
      views: 0,
      sessions: 0,
      visitors: 0,
      approximateVisitors: false,
    });
    expect(emptyPages()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyReferrers()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyDimension()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyOverviewTab()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyOverviewGeoTab()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyDashboardFilterOptions()).toEqual({
      ok: true,
      data: {
        items: [],
        pagination: {
          limit: 1,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
    expect(emptyPageCardTabs()).toEqual({
      path: [],
      title: [],
      hostname: [],
      entry: [],
      exit: [],
    });
  });
});
