import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EMPTY_FILTER_DOCUMENT,
  withoutFilterKey,
  withoutGeoFilter,
} from "@/lib/edge/analytics/contract";
import { type QueryWindow } from "@/lib/edge/analytics/contract";
import {
  parseBooleanFlag,
  parseEventName,
  parseEventRecordSort,
  parseFilterOptionKey,
  parseInterval,
  parseLimit,
  parseListSearch,
  parseQueryLimit,
  parseWindow,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/parsers";
import {
  appendSqlConditions,
  buildTimeBuckets,
  clientDimensionDefinition,
  DIRECT_REFERRER_FILTER_VALUE,
  emptyOverviewAggregateRow,
  eventRecordOrderBy,
  filteredVisitsCte,
  formatPageLabel,
  geoTabLabel,
  intervalBucketMs,
  mapEventAnalyticsContextCards,
  mapEventRecord,
  mapGeoTabs,
  mapOverviewAggregate,
  mapReferrers,
  mapTabs,
  shareTrendSeriesKey,
  sourceLabel,
  timeBucketCase,
  timeBucketTimestamp,
} from "@/lib/edge/analytics/providers/d1/internal/core";
import { parseGeoFilterValue } from "@/lib/edge/analytics/providers/d1/internal/core-filters";
import { visitFilterSql } from "@/lib/edge/analytics/providers/d1/internal/filter-compiler";
import { fetchPublicSite } from "@/lib/edge/auth/site-access";
import type { Env } from "@/lib/edge/types";

import { filterFixture } from "./filter-fixtures";
const fixedNow = Date.UTC(2026, 4, 26, 8);
function url(search = "") {
  return new URL(`https://edge.test/query${search}`);
}
describe("edge query core parsers", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses valid windows, defaults, and invalid ranges", () => {
    expect(
      parseWindow(
        url("?from=1700000000123.9&to=1700003600999.5&timeZone=Asia/Tokyo"),
      ),
    ).toEqual({
      startMs: 1_700_000_000_123,
      endExclusiveMs: 1_700_003_600_999,
      nowMs: fixedNow,
      timeZone: "Asia/Tokyo",
    });

    expect(parseWindow(url("?timeZone=Bad/Zone"))).toEqual({
      startMs: fixedNow - 86_400_000,
      endExclusiveMs: fixedNow,
      nowMs: fixedNow,
      timeZone: "UTC",
    });

    expect(parseWindow(url("?from=nope&to=wat"))).toBeNull();
    expect(parseWindow(url("?from=-1&to=10"))).toBeNull();
    expect(parseWindow(url("?from=20&to=10"))).toBeNull();
    expect(parseWindow(url("?from=10&to=10"))).toBeNull();
  });

  it("ignores legacy evaluation-range parameters", () => {
    expect(
      parseWindow(
        url(
          "?from=100&to=200&evaluationFromMs=10&evaluationToMs=90&compareEvaluationFromMs=20&compareEvaluationToMs=80",
        ),
      ),
    ).toEqual({
      startMs: 100,
      endExclusiveMs: 200,
      nowMs: fixedNow,
      timeZone: "UTC",
    });
  });

  it("parses intervals and clamps limits", () => {
    expect(parseInterval(url("?interval=HOUR"))).toBe("hour");
    expect(parseInterval(url("?interval=minute"))).toBe("minute");
    expect(parseInterval(url("?interval=bad"))).toBe("day");

    expect(parseLimit(url("?limit=12.9"), 20, 50)).toBe(12);
    expect(parseLimit(url("?limit=0"), 20, 50)).toBe(20);
    expect(parseLimit(url("?limit=250"), 20, 50)).toBe(50);

    expect(parseQueryLimit(url("?pageSize=12.9"), "pageSize", 20, 5, 50)).toBe(
      12,
    );
    expect(parseQueryLimit(url("?pageSize=1"), "pageSize", 20, 5, 50)).toBe(5);
    expect(parseQueryLimit(url("?pageSize=500"), "pageSize", 20, 5, 50)).toBe(
      50,
    );
    expect(parseQueryLimit(url("?pageSize=nope"), "pageSize", 20, 5, 50)).toBe(
      20,
    );
  });

  it("parses event record sort keys and falls back to defaults", () => {
    expect(parseEventRecordSort(url("?sortBy=pathname&sortDir=asc"))).toEqual({
      key: "pathname",
      direction: "asc",
    });
    expect(parseEventRecordSort(url("?sortBy=views&sortDir=asc"))).toEqual({
      key: "occurredAt",
      direction: "desc",
    });
  });

  it("parses focused query params and filter option helpers", () => {
    expect(parseListSearch(url("?search=%20checkout%20"))).toBe("checkout");
    expect(parseListSearch(url("?search=%20%20"))).toBeUndefined();
    expect(parseListSearch(url())).toBeUndefined();
    expect(parseEventName(url("?eventName=%20signup%20"))).toBe("signup");
    expect(parseEventName(url("?eventName=%20%20"))).toBeUndefined();
    expect(parseFilterOptionKey(url("?filterKey=geo.timeZone"))).toBe(
      "geo.timeZone",
    );
    expect(parseFilterOptionKey(url("?filterKey=unknown"))).toBeNull();
    expect(parseBooleanFlag(url("?includeDetail=yes"), "includeDetail")).toBe(
      true,
    );
    expect(
      withoutFilterKey(
        filterFixture({ country: "US", browser: "Chrome" }),
        "geo.country",
      ),
    ).toEqual(filterFixture({ browser: "Chrome" }));

    expect(
      withoutFilterKey(filterFixture({ country: "CA" }), "geo.country"),
    ).toEqual(EMPTY_FILTER_DOCUMENT);
  });
});
describe("edge public site lookup", () => {
  function envWithPublicSite(row: Record<string, unknown> | null) {
    const first = vi.fn().mockResolvedValue(row);
    const bind = vi.fn(() => ({ first }));
    const prepare = vi.fn((_sql: string) => ({ bind }));
    const env = { DB: { prepare } } as unknown as Env;
    return { env, prepare, bind, first };
  }

  it("requires enabled public sharing for slug lookup", async () => {
    const { env, prepare, bind } = envWithPublicSite({
      id: "site-1",
      name: "Blog",
      domain: "blog.test",
    });

    const site = await fetchPublicSite(
      env,
      new URL("https://edge.test/api/public/blog/site"),
    );

    expect(site).toMatchObject({ id: "site-1" });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[0]).toContain('FROM "sites"');
    expect(prepare.mock.calls[0]?.[0]).toContain('"public_enabled"');
    expect(prepare.mock.calls[0]?.[0]).toContain('"public_slug"');
    expect(bind).toHaveBeenCalledWith(1, "blog", 1);
  });

  it("returns 404 for disabled, deleted, old, empty, or malformed slugs", async () => {
    const { env, first } = envWithPublicSite(null);

    for (const path of [
      "/api/public/disabled/site",
      "/api/public/old-slug/overview",
      "/api/public/deleted/pages",
    ]) {
      const response = await fetchPublicSite(
        env,
        new URL(`https://edge.test${path}`),
      );
      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status, path).toBe(404);
    }
    expect(first).toHaveBeenCalledTimes(3);

    const empty = await fetchPublicSite(
      env,
      new URL("https://edge.test/api/public/%20/site"),
    );
    expect((empty as Response).status).toBe(404);

    const malformed = await fetchPublicSite(
      env,
      new URL("https://edge.test/api/public/%E0%A4%A/site"),
    );
    expect((malformed as Response).status).toBe(404);
  });
});
describe("edge query core dimensions", () => {
  it("formats page labels with optional query and hash details", () => {
    expect(formatPageLabel("", "", "", false)).toBe("/");
    expect(formatPageLabel("/docs", "?tab=api", "", true)).toBe(
      "/docs?tab=api",
    );
    expect(formatPageLabel("/docs", "", "#install", true)).toBe(
      "/docs#install",
    );
  });

  it("emits aliased and unaliased client dimension expressions", () => {
    expect(clientDimensionDefinition("browser")).toEqual({
      labelExpr: "TRIM(COALESCE(browser, ''))",
      fallbackKeyBase: "browser",
    });
    expect(clientDimensionDefinition("deviceType")).toEqual({
      labelExpr: "TRIM(COALESCE(device_type, ''))",
      fallbackKeyBase: "device",
    });
    expect(clientDimensionDefinition("language")).toEqual({
      labelExpr: "TRIM(COALESCE(language, ''))",
      fallbackKeyBase: "language",
    });
    expect(clientDimensionDefinition("browser", "v").labelExpr).toBe(
      "TRIM(COALESCE(v.browser, ''))",
    );
  });
});
describe("edge query core time helpers", () => {
  const nowMs = Date.UTC(2026, 4, 26);

  function window(startMs: number, endExclusiveMs: number): QueryWindow {
    return { startMs, endExclusiveMs, nowMs, timeZone: "UTC" };
  }

  it("labels query windows as detail data", () => {
    expect(sourceLabel(window(0, nowMs))).toBe("detail");
  });

  it("builds zoned buckets and SQL bucket cases", () => {
    const queryWindow: QueryWindow = {
      startMs: Date.UTC(2026, 0, 2, 1, 30),
      endExclusiveMs: Date.UTC(2026, 0, 2, 3, 5),
      nowMs,
      timeZone: "UTC",
    };

    const buckets = buildTimeBuckets(queryWindow, "hour");

    expect(buckets).toEqual([
      {
        index: 0,
        timestampMs: Date.UTC(2026, 0, 2, 1),
        startMs: Date.UTC(2026, 0, 2, 1),
        endExclusiveMs: Date.UTC(2026, 0, 2, 2),
      },
      {
        index: 1,
        timestampMs: Date.UTC(2026, 0, 2, 2),
        startMs: Date.UTC(2026, 0, 2, 2),
        endExclusiveMs: Date.UTC(2026, 0, 2, 3),
      },
      {
        index: 2,
        timestampMs: Date.UTC(2026, 0, 2, 3),
        startMs: Date.UTC(2026, 0, 2, 3),
        endExclusiveMs: Date.UTC(2026, 0, 2, 4),
      },
    ]);

    expect(timeBucketTimestamp(buckets, 1)).toBe(Date.UTC(2026, 0, 2, 2));
    expect(timeBucketTimestamp(buckets, 99)).toBe(0);

    expect(timeBucketCase(buckets.slice(0, 2), "started_at")).toEqual({
      sql:
        `CASE WHEN started_at >= ${Date.UTC(2026, 0, 2, 1)} ` +
        `AND started_at < ${Date.UTC(2026, 0, 2, 2)} THEN 0 ` +
        `WHEN started_at >= ${Date.UTC(2026, 0, 2, 2)} ` +
        `AND started_at < ${Date.UTC(2026, 0, 2, 3)} THEN 1 ELSE NULL END`,
      bindings: [],
    });
  });

  it("keeps calendar-day boundaries across daylight saving changes", () => {
    const buckets = buildTimeBuckets(
      {
        startMs: Date.UTC(2026, 2, 7, 12),
        endExclusiveMs: Date.UTC(2026, 2, 10, 12),
        nowMs,
        timeZone: "America/New_York",
      },
      "day",
    );

    expect(
      buckets.map((bucket) => [bucket.startMs, bucket.endExclusiveMs]),
    ).toEqual([
      [Date.UTC(2026, 2, 7, 5), Date.UTC(2026, 2, 8, 5)],
      [Date.UTC(2026, 2, 8, 5), Date.UTC(2026, 2, 9, 4)],
      [Date.UTC(2026, 2, 9, 4), Date.UTC(2026, 2, 10, 4)],
      [Date.UTC(2026, 2, 10, 4), Date.UTC(2026, 2, 11, 4)],
    ]);
  });

  it("maps interval widths and rejects empty query windows", () => {
    expect(intervalBucketMs("minute")).toBe(60_000);
    expect(intervalBucketMs("hour")).toBe(3_600_000);
    expect(intervalBucketMs("day")).toBe(86_400_000);
    expect(intervalBucketMs("week")).toBe(7 * 86_400_000);
    expect(intervalBucketMs("month")).toBe(30 * 86_400_000);

    expect(() =>
      buildTimeBuckets(
        {
          startMs: Date.UTC(2026, 0, 2, 1, 30),
          endExclusiveMs: Date.UTC(2026, 0, 2, 1, 30),
          nowMs,
          timeZone: "UTC",
        },
        "hour",
      ),
    ).toThrow("half-open");
  });

  it("uses a start-inclusive, end-exclusive source window", () => {
    const source = filteredVisitsCte(
      "site-1",
      window(100, 200),
      EMPTY_FILTER_DOCUMENT,
    );
    expect(source.sql).toContain("v.started_at >= ? AND v.started_at < ?");
    expect(source.bindings).toEqual(["site-1", 100, 200]);
  });
});
describe("edge query core mappers", () => {
  it("maps overview aggregate rows with derived rates", () => {
    expect(
      mapOverviewAggregate(
        {
          views: 10,
          sessions: 4,
          visitors: 3,
          bounces: 1,
          totalDuration: 1_001,
          durationViews: 2,
        },
        { approximateVisitors: true },
      ),
    ).toEqual({
      views: 10,
      sessions: 4,
      visitors: 3,
      bounces: 1,
      totalDurationMs: 1_001,
      avgDurationMs: 250,
      bounceRate: 0.25,
      approximateVisitors: true,
    });
  });

  it("maps tab rows", () => {
    expect(
      mapTabs([
        { value: "/docs", views: 7, sessions: 4, visitors: 3 },
        { value: "", views: 1, sessions: 1, visitors: 1 },
      ]),
    ).toEqual([
      { label: "/docs", views: 7, sessions: 4, visitors: 3 },
      { label: "", views: 1, sessions: 1, visitors: 1 },
    ]);
  });

  it("maps core rows", () => {
    expect(emptyOverviewAggregateRow()).toEqual({
      views: 0,
      sessions: 0,
      visitors: 0,
      bounces: 0,
      totalDuration: 0,
      durationViews: 0,
    });
    expect(
      mapGeoTabs([
        {
          value: "US",
          label: "United States",
          views: 3,
          sessions: 2,
          visitors: 1,
        },
      ]),
    ).toEqual([
      {
        value: "US",
        label: "United States",
        views: 3,
        sessions: 2,
        visitors: 1,
      },
    ]);
    expect(
      mapReferrers([
        { referrer: "news.example", views: 4, sessions: 2, visitors: 2 },
      ]),
    ).toEqual([{ referrer: "news.example", views: 4, sessions: 2 }]);
  });

  it("maps defensive geo labels", () => {
    expect(geoTabLabel("US::CA", "region")).toBe("US");
    expect(geoTabLabel("US::Austin", "city")).toBe("Austin");
    expect(geoTabLabel("unknown", "timezone")).toBe("unknown");
  });

  it("maps event records and analytics context cards", () => {
    expect(
      mapEventRecord({
        eventId: "event-1",
        eventName: "signup",
        occurredAt: 10,
        receivedAt: 12,
        sequence: 2,
        visitId: "visit-1",
        sessionId: "session-1",
        visitorId: "visitor-1",
        pathname: "/signup",
        title: "Signup",
        hostname: "example.com",
        referrerHost: "news.example",
        country: "US",
        region: "CA",
        city: "San Francisco",
        browser: "Chrome",
        browserVersion: "124",
        os: "macOS",
        osVersion: "14",
        deviceType: "desktop",
        propertiesJson: '{"plan":"pro"}',
      }),
    ).toEqual({
      eventId: "event-1",
      eventName: "signup",
      occurredAt: 10,
      receivedAt: 12,
      sequence: 2,
      visitId: "visit-1",
      sessionId: "session-1",
      visitorId: "visitor-1",
      pathname: "/signup",
      title: "Signup",
      hostname: "example.com",
      referrerHost: "news.example",
      country: "US",
      region: "CA",
      city: "San Francisco",
      browser: "Chrome",
      browserVersion: "124",
      os: "macOS",
      osVersion: "14",
      deviceType: "desktop",
      properties: { plan: "pro" },
    });

    const dim = [{ value: "A", views: 1, sessions: 1, visitors: 1 }];
    const geo = [
      {
        value: "US",
        label: "United States",
        views: 1,
        sessions: 1,
        visitors: 1,
      },
    ];
    expect(
      mapEventAnalyticsContextCards({
        page: {
          path: dim,
          query: [],
          title: [],
          hostname: [],
          entry: [],
          exit: [],
        },
        source: { domain: dim, link: [] },
        client: {
          browser: dim,
          osVersion: [],
          deviceType: [],
          language: [],
          screenSize: [],
        },
        geo: {
          country: geo,
          region: [],
          city: [],
          continent: [],
          timezone: [],
        },
      }),
    ).toMatchObject({
      page: { path: [{ label: "A", views: 1, sessions: 1, visitors: 1 }] },
      source: { domain: [{ label: "A", views: 1, sessions: 1, visitors: 1 }] },
      client: { browser: [{ label: "A", views: 1, sessions: 1, visitors: 1 }] },
      geo: {
        country: [
          {
            value: "US",
            label: "United States",
            views: 1,
            sessions: 1,
            visitors: 1,
          },
        ],
      },
    });
  });
});
describe("edge query core share trend keys", () => {
  it("normalizes labels and avoids collisions", () => {
    const usedKeys = new Set<string>();

    expect(shareTrendSeriesKey("Chrome 124", usedKeys, "series")).toBe(
      "chrome-124",
    );
    expect(shareTrendSeriesKey("Chrome/124", usedKeys, "series")).toBe(
      "chrome-124-2",
    );
    expect(shareTrendSeriesKey("   !!!   ", usedKeys, "series")).toBe("series");
    expect(shareTrendSeriesKey("", usedKeys, "series")).toBe("series-2");
    expect([...usedKeys]).toEqual([
      "chrome-124",
      "chrome-124-2",
      "series",
      "series-2",
    ]);
  });
});
describe("edge query core SQL helpers", () => {
  const sql = (filters: Parameters<typeof visitFilterSql>[0]) => {
    const predicate = visitFilterSql(filters, {
      siteId: "site-1",
      startMs: 100,
      endExclusiveMs: 200,
    });
    return {
      clause: predicate?.text ?? "",
      bindings: predicate?.bindings ?? [],
    };
  };

  it("appends SQL conditions without dropping existing clauses", () => {
    expect(
      appendSqlConditions("", ["", " started_at >= ? ", "site_id = ?"]),
    ).toBe("WHERE started_at >= ? AND site_id = ?");
    expect(
      appendSqlConditions("WHERE status = 'active'", [
        "started_at >= ?",
        "  ",
        "started_at < ?",
      ]),
    ).toBe("WHERE status = 'active' AND started_at >= ? AND started_at < ?");
    expect(appendSqlConditions("SELECT * FROM t", ["  ", "\t"])).toBe(
      "SELECT * FROM t",
    );
  });

  it("builds visit filters for direct traffic, client dimensions, and geo values", () => {
    const filter = sql(
      filterFixture({
        country: "US",
        sourceDomain: DIRECT_REFERRER_FILTER_VALUE,
        sourceLink: "HTTPS://REF.EXAMPLE/POST",
        clientOsVersion: "macOS 14",
        clientScreenSize: "1440x900",
        geo: "US::CA::California::San Francisco",
      }),
    );

    expect(filter.clause).toContain("LOWER(v.country) = ?");
    expect(filter.clause).toContain("LOWER(v.referrer_host) = ?");
    expect(filter.clause).toContain("LOWER(v.referrer_url) = ?");
    expect(filter.clause).toContain("v.os || ' ' || v.os_version");
    expect(filter.clause).toContain(
      "CAST(v.screen_width AS TEXT) || 'x' || CAST(v.screen_height AS TEXT)",
    );
    expect(filter.clause).toContain("LOWER(v.region) = ?");
    expect(filter.clause).toContain("LOWER(v.city) = ?");
    expect(filter.bindings).toEqual(
      expect.arrayContaining([
        "us",
        "",
        "https://ref.example/post",
        "macOS 14",
        "1440x900",
        "ca",
        "san francisco",
      ]),
    );
  });

  it("parses geo filter values and removes geo filters without mutating other keys", () => {
    expect(parseGeoFilterValue("US::CA::California::San Francisco")).toEqual({
      country: "US",
      regionCode: "CA",
      regionName: "California",
      city: "San Francisco",
    });
    expect(parseGeoFilterValue("bad")).toBeNull();
    expect(
      withoutGeoFilter(filterFixture({ geo: "US", browser: "Chrome" })),
    ).toEqual(filterFixture({ browser: "Chrome" }));
  });

  it("builds visit filters for page metadata, session edges, and direct source links", () => {
    const filter = sql(
      filterFixture({
        title: "Docs",
        entry: "/",
        exit: "/pricing",
        sourceDomain: "News.Example",
        sourceLink: DIRECT_REFERRER_FILTER_VALUE,
        clientLanguage: "en-US",
        geoTimezone: "America/Los_Angeles",
      }),
    );

    expect(filter.clause).toContain("v.title = ?");
    expect(filter.clause).toContain("v.session_id IN");
    expect(filter.clause).toContain("ORDER BY started_at ASC, visit_id ASC");
    expect(filter.clause).toContain("ORDER BY started_at DESC, visit_id DESC");
    expect(filter.clause).toContain("LOWER(v.referrer_host) = ?");
    expect(filter.clause).toContain("LOWER(v.referrer_url) = ?");
    expect(filter.clause).toContain("v.language = ?");
    expect(filter.clause).toContain("v.timezone = ?");
    expect(filter.bindings).toEqual(
      expect.arrayContaining([
        "Docs",
        "/",
        "/pricing",
        "news.example",
        "en-US",
        "America/Los_Angeles",
      ]),
    );

    expect(sql(EMPTY_FILTER_DOCUMENT)).toEqual({ clause: "", bindings: [] });
  });

  it("builds deterministic event ordering clauses", () => {
    expect(eventRecordOrderBy({ key: "eventName", direction: "asc" })).toBe(
      "eventName ASC, occurredAt DESC, eventId DESC, eventPk DESC",
    );
    expect(eventRecordOrderBy({ key: "pathname", direction: "desc" })).toBe(
      "pathname DESC, occurredAt DESC, eventId DESC, eventPk DESC",
    );
    expect(eventRecordOrderBy({ key: "occurredAt", direction: "asc" })).toBe(
      "occurredAt ASC, eventId ASC, eventPk ASC",
    );
  });
});
