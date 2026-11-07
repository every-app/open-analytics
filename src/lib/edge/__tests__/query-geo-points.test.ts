import { describe, expect, it, vi } from "vitest";

import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryGeoPointsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/geo-points";
import type { Env } from "@/lib/edge/types";

import { filterFixture } from "./filter-fixtures";
type D1Row = Record<string, unknown>;
type QueryBinding = string | number | null;
interface QueryCall {
  sql: string;
  bindings: QueryBinding[];
}
const siteId = "site-geo";
const baseMs = Date.UTC(2026, 0, 1);
function queryWindow(): QueryWindow {
  return {
    startMs: baseMs,
    endExclusiveMs: baseMs + 2 * 60 * 60 * 1000,
    nowMs: baseMs + 24 * 60 * 60 * 1000,
    timeZone: "UTC",
  };
}
function createD1Env(resultSets: D1Row[][]): {
  env: Env;
  calls: QueryCall[];
} {
  const calls: QueryCall[] = [];
  const pendingResults = [...resultSets];
  const prepare = vi.fn((sql: string) => ({
    bind: vi.fn((...bindings: QueryBinding[]) => ({
      all: vi.fn(async () => {
        calls.push({ sql, bindings });
        return { results: pendingResults.shift() ?? [] };
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
  };
}
function visitBindings(window: QueryWindow): QueryBinding[] {
  return [siteId, window.startMs, window.endExclusiveMs];
}
describe("geo point D1 queries", () => {
  it("maps sparse point rows with defaults", async () => {
    const window = queryWindow();
    const { env } = createD1Env([
      [{ latitude: 1, longitude: 2, timestampMs: 3 }],
      [],
    ]);

    await expect(
      queryGeoPointsFromD1(env, siteId, window, EMPTY_FILTER_DOCUMENT),
    ).resolves.toEqual({
      points: [
        {
          latitude: 1,
          longitude: 2,
          timestampMs: 3,
          country: "",
          region: "",
          regionCode: "",
          city: "",
          pointCount: 1,
        },
      ],
      countryCounts: [],
      regionCounts: [],
      cityCounts: [],
    });
  });

  it("returns point data and country counts when no geo drilldown is active", async () => {
    const window = queryWindow();
    const { env, calls } = createD1Env([
      [
        {
          latitude: "42.5",
          longitude: "13.5",
          timestampMs: "100",
          country: "IT",
        },
      ],
      [{ country: "IT", views: "8", sessions: "4", visitors: "3" }],
    ]);

    await expect(
      queryGeoPointsFromD1(env, siteId, window, EMPTY_FILTER_DOCUMENT),
    ).resolves.toEqual({
      points: [
        {
          latitude: 42.5,
          longitude: 13.5,
          timestampMs: 100,
          country: "IT",
          region: "",
          regionCode: "",
          city: "",
          pointCount: 1,
        },
      ],
      countryCounts: [{ country: "IT", views: 8, sessions: 4, visitors: 3 }],
      regionCounts: [],
      cityCounts: [],
    });
    // Every point and every country: no LIMIT.
    expect(calls[0].bindings).toEqual(visitBindings(window));
    expect(calls[0].sql).not.toContain("LIMIT");
    expect(calls[1].sql).not.toContain("LIMIT");
    expect(calls[0].sql).not.toContain(
      "WHERE LOWER(TRIM(COALESCE(country, ''))) = ?\n  WHERE",
    );
    expect(calls[0].sql).toContain("WHERE\n    latitude IS NOT NULL");
    expect(calls[1].sql).toContain("GROUP BY country");
  });

  it("defaults missing geo country count fields", async () => {
    const window = queryWindow();
    const { env } = createD1Env([[], [{ country: null }]]);

    await expect(
      queryGeoPointsFromD1(env, siteId, window, EMPTY_FILTER_DOCUMENT),
    ).resolves.toMatchObject({
      countryCounts: [{ country: "", views: 0, sessions: 0, visitors: 0 }],
      regionCounts: [],
      cityCounts: [],
    });
  });

  it("returns region counts when drilled into a country", async () => {
    const window = queryWindow();
    const { env } = createD1Env([
      [],
      [
        {
          country: "us",
          regionCode: "ca",
          region: "California",
          views: "5",
          sessions: "3",
          visitors: "2",
        },
        { country: "", regionCode: "", region: "", views: 1 },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(env, siteId, window, filterFixture({ geo: "US" })),
    ).resolves.toMatchObject({
      countryCounts: [],
      regionCounts: [
        {
          value: "US::CA::California",
          label: "California",
          views: 5,
          sessions: 3,
          visitors: 2,
        },
      ],
      cityCounts: [],
    });
  });

  it("returns city counts when drilled into a region or city scope", async () => {
    const window = queryWindow();
    const { env, calls } = createD1Env([
      [],
      [
        {
          country: "us",
          regionCode: "ca",
          region: "California",
          city: "San Francisco",
          views: "6",
          sessions: "4",
          visitors: "3",
        },
        { country: "US", city: "", views: 100 },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(
        env,
        siteId,
        window,
        filterFixture({ geo: "US::CA::California" }),
      ),
    ).resolves.toMatchObject({
      countryCounts: [],
      regionCounts: [],
      cityCounts: [
        {
          value: "US::CA::California::San Francisco",
          label: "San Francisco",
          views: 6,
          sessions: 4,
          visitors: 3,
        },
      ],
    });
    expect(calls[1].sql).toContain(
      "GROUP BY country, regionCode, region, city",
    );
  });

  it("defaults missing geo dimension count fields", async () => {
    const window = queryWindow();
    const regionEnv = createD1Env([
      [],
      [
        {
          country: "us",
          regionCode: "ny",
        },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(
        regionEnv.env,
        siteId,
        window,
        filterFixture({ geo: "US" }),
      ),
    ).resolves.toMatchObject({
      regionCounts: [
        {
          value: "US::NY::NY",
          label: "NY",
          views: 0,
          sessions: 0,
          visitors: 0,
        },
      ],
      cityCounts: [],
    });

    const cityEnv = createD1Env([
      [],
      [
        {
          country: "us",
          city: "New York",
        },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(
        cityEnv.env,
        siteId,
        window,
        filterFixture({ geo: "US::NY::NY" }),
      ),
    ).resolves.toMatchObject({
      regionCounts: [],
      cityCounts: [
        {
          value: "US::New York",
          label: "New York",
          views: 0,
          sessions: 0,
          visitors: 0,
        },
      ],
    });
  });

  it("falls back to region names when building geo aggregate values", async () => {
    const window = queryWindow();
    const regionEnv = createD1Env([
      [],
      [
        {
          country: "ca",
          regionCode: "",
          region: "Ontario",
          views: "4",
          sessions: "2",
          visitors: "1",
        },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(
        regionEnv.env,
        siteId,
        window,
        filterFixture({ geo: "CA" }),
      ),
    ).resolves.toMatchObject({
      regionCounts: [
        {
          value: "CA::ONTARIO::Ontario",
          label: "Ontario",
          views: 4,
          sessions: 2,
          visitors: 1,
        },
      ],
      cityCounts: [],
    });

    const cityEnv = createD1Env([
      [],
      [
        {
          country: "ca",
          regionCode: "",
          region: "",
          city: "Toronto",
          views: "7",
          sessions: "3",
          visitors: "2",
        },
      ],
    ]);

    await expect(
      queryGeoPointsFromD1(
        cityEnv.env,
        siteId,
        window,
        filterFixture({ geo: "CA::ON::Ontario" }),
      ),
    ).resolves.toMatchObject({
      regionCounts: [],
      cityCounts: [
        {
          value: "CA::Toronto",
          label: "Toronto",
          views: 7,
          sessions: 3,
          visitors: 2,
        },
      ],
    });
  });
});
