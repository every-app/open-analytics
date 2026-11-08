import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
const queryOverviewAggregate = vi.hoisted(() => vi.fn());
const queryTopPagesFromD1 = vi.hoisted(() => vi.fn());
const queryTopReferrersFromD1 = vi.hoisted(() => vi.fn());
vi.mock("@/lib/edge/analytics/providers/d1/internal/overview", () => ({
  queryOverviewAggregate,
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/pages", () => ({
  queryTopPagesFromD1,
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/referrers", () => ({
  queryTopReferrersFromD1,
}));
import {
  createNotificationInvocationCache,
  getOrCreateCachedPromise,
} from "@/lib/notifications/edge/notification-cache";
import {
  loadReportData,
  loadVisitorChange,
  notificationReportWindowFor,
} from "@/lib/notifications/edge/report-data";

function envWithSite(site: { name: string; domain: string } | null) {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ first: vi.fn(() => Promise.resolve(site)) })),
      })),
    },
  } as never;
}

describe("notification report data", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("covers the last full week (Monday to Sunday) or month", () => {
    const now = Date.UTC(2026, 6, 15, 12) / 1000; // Wednesday

    expect(
      notificationReportWindowFor({
        reportType: "weekly",
        now,
        timezone: "UTC",
      }),
    ).toMatchObject({
      startMs: Date.UTC(2026, 6, 6),
      endExclusiveMs: Date.UTC(2026, 6, 13),
      label: "2026-07-06 to 2026-07-12",
    });
    expect(
      notificationReportWindowFor({
        reportType: "monthly",
        now,
        timezone: "UTC",
      }),
    ).toMatchObject({
      startMs: Date.UTC(2026, 5, 1),
      endExclusiveMs: Date.UTC(2026, 6, 1),
      label: "2026-06",
    });
    // January reports on the previous December, in the schedule's zone.
    expect(
      notificationReportWindowFor({
        reportType: "monthly",
        now: Date.UTC(2027, 0, 1, 3) / 1000,
        timezone: "Asia/Tokyo",
      }),
    ).toMatchObject({
      startMs: Date.UTC(2026, 10, 30, 15),
      endExclusiveMs: Date.UTC(2026, 11, 31, 15),
      timeZone: "Asia/Tokyo",
      label: "2026-12",
    });
    // An unknown zone reads as UTC.
    expect(
      notificationReportWindowFor({
        reportType: "weekly",
        now,
        timezone: "Mars/Base",
      }).timeZone,
    ).toBe("UTC");
  });

  it("loads a report from the site and its aggregate queries", async () => {
    queryOverviewAggregate.mockResolvedValue({
      value: { views: 100, visitors: 40, sessions: 55 },
    });
    queryTopPagesFromD1.mockResolvedValue([
      { pathname: "/pricing", views: 20 },
      { pathname: "", views: 10 },
    ]);
    queryTopReferrersFromD1.mockResolvedValue([
      { referrer: "example.com", sessions: 8 },
      { referrer: "", sessions: 4 },
    ]);
    const env = envWithSite({ name: "Demo", domain: "example.test" });

    const report = await loadReportData(env, {
      siteId: "site-1",
      now: Date.UTC(2026, 6, 15, 12) / 1000,
      timezone: "UTC",
      reportType: "weekly",
    });

    expect(report).toEqual({
      siteName: "Demo",
      siteDomain: "example.test",
      reportType: "weekly",
      range: {
        from: Date.UTC(2026, 6, 6) / 1000,
        to: Date.UTC(2026, 6, 13) / 1000,
        label: "2026-07-06 to 2026-07-12",
      },
      metrics: { views: 100, visitors: 40, sessions: 55 },
      topPages: [
        { path: "/pricing", views: 20 },
        { path: "/", views: 10 },
      ],
      topReferrers: [
        { referrer: "example.com", visits: 8 },
        { referrer: "Direct", visits: 4 },
      ],
    });
    expect(queryTopPagesFromD1).toHaveBeenCalledWith(
      env,
      "site-1",
      expect.objectContaining({ label: "2026-07-06 to 2026-07-12" }),
      EMPTY_FILTER_DOCUMENT,
      5,
    );
  });

  it("returns no report when the site is missing", async () => {
    await expect(
      loadReportData(envWithSite(null), {
        siteId: "missing",
        now: 1,
        reportType: "monthly",
      }),
    ).resolves.toBeNull();
    expect(queryOverviewAggregate).not.toHaveBeenCalled();
  });

  it("shares one report between members who set up the same one", async () => {
    queryOverviewAggregate.mockResolvedValue({
      value: { views: 1, visitors: 1, sessions: 1 },
    });
    queryTopPagesFromD1.mockResolvedValue([]);
    queryTopReferrersFromD1.mockResolvedValue([]);
    const env = envWithSite({ name: "Demo", domain: "example.test" });
    const cache = createNotificationInvocationCache();
    const input = {
      siteId: "site-1",
      timezone: "UTC",
      reportType: "weekly" as const,
      cache,
    };

    // Two checks seconds apart in the same tick read the same week.
    const first = await loadReportData(env, {
      ...input,
      now: Date.UTC(2026, 6, 15, 12) / 1000,
    });
    const second = await loadReportData(env, {
      ...input,
      now: Date.UTC(2026, 6, 15, 12, 0, 5) / 1000,
    });

    expect(second).toBe(first);
    expect(queryTopPagesFromD1).toHaveBeenCalledTimes(1);
  });

  it("compares visitors in a window with the window before it", async () => {
    queryOverviewAggregate.mockImplementation(async (_env, _site, window) => ({
      value: {
        views: 0,
        sessions: 0,
        visitors: window.endExclusiveMs === 7_200_000 ? 30 : 20,
      },
    }));

    await expect(
      loadVisitorChange({} as never, {
        siteId: "site-1",
        window: "last_1h",
        now: 7_200,
      }),
    ).resolves.toEqual({
      current: 30,
      previous: 20,
      range: { from: 3_600, to: 7_200 },
      previousRange: { from: 0, to: 3_600 },
    });

    await loadVisitorChange({} as never, {
      siteId: "site-1",
      window: "last_24h",
      now: 200_000,
    });
    expect(queryOverviewAggregate).toHaveBeenLastCalledWith(
      {},
      "site-1",
      expect.objectContaining({
        startMs: (200_000 - 2 * 86_400) * 1000,
        endExclusiveMs: (200_000 - 86_400) * 1000,
      }),
      EMPTY_FILTER_DOCUMENT,
    );
  });

  it("reuses overview queries within one invocation and window", async () => {
    queryOverviewAggregate.mockResolvedValue({
      value: { views: 0, visitors: 5, sessions: 0 },
    });
    const cache = createNotificationInvocationCache();
    const input = { siteId: "site-1", window: "last_1h" as const, now: 7_200 };

    await loadVisitorChange({} as never, { ...input, cache });
    await loadVisitorChange({} as never, { ...input, cache });
    expect(queryOverviewAggregate).toHaveBeenCalledTimes(2);

    await loadVisitorChange({} as never, input);
    expect(queryOverviewAggregate).toHaveBeenCalledTimes(4);
  });

  it("does not retain a rejected cache entry", async () => {
    const cache = new Map<string, Promise<number>>();
    const failure = Promise.reject(new Error("temporary"));
    await expect(
      getOrCreateCachedPromise(cache, "key", () => failure),
    ).rejects.toThrow("temporary");
    await Promise.resolve();
    expect(cache).toHaveLength(0);
  });
});
