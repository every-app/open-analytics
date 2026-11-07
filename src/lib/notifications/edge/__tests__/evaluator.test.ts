import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  evaluateNotificationRule,
  visitorChangePercent,
} from "@/lib/notifications/edge/evaluator";
import type { NotificationRule } from "@/lib/notifications/edge/rule-store";
import type { ChangeCondition } from "@/lib/notifications/rules";

const loadReportData = vi.hoisted(() => vi.fn());
const loadSiteInfo = vi.hoisted(() => vi.fn());
const loadVisitorChange = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications/edge/report-data", () => ({
  loadReportData,
  loadSiteInfo,
  loadVisitorChange,
}));

const NOW = 1_800_000_000;
const env = {} as never;

const common = {
  id: "rule-1",
  teamId: "team-1",
  siteId: "site-1",
  name: "Rule",
  enabled: true,
  lastCheckedAt: null,
  lastTriggeredAt: null,
  nextRunAt: null,
  cooldownUntil: null,
  createdByUserId: "user-1",
  createdAt: 1,
  updatedAt: 1,
};

function reportRule(): NotificationRule {
  return {
    ...common,
    type: "report",
    schedule: {
      kind: "monthly",
      dayOfMonth: 1,
      time: "08:00",
      timezone: "Asia/Tokyo",
    },
  };
}

function alertRule(condition: Partial<ChangeCondition> = {}): NotificationRule {
  return {
    ...common,
    type: "change",
    condition: {
      direction: "spike",
      window: "last_1h",
      percent: 50,
      ...condition,
    },
  };
}

function visitors(current: number, previous: number) {
  return {
    current,
    previous,
    range: { from: NOW - 3600, to: NOW },
    previousRange: { from: NOW - 7200, to: NOW - 3600 },
  };
}

describe("notification rule evaluator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadSiteInfo.mockResolvedValue({ name: "Example", domain: "example.com" });
  });

  it("sends a report for the schedule's period in its time zone", async () => {
    loadReportData.mockResolvedValue({
      siteName: "Example",
      siteDomain: "example.com",
      reportType: "monthly",
      range: { from: 1, to: 2, label: "2026-10" },
      metrics: { views: 3200, visitors: 1200, sessions: 1500 },
      topPages: [{ path: "/", views: 900 }],
      topReferrers: [{ referrer: "Direct", visits: 400 }],
    });

    const result = await evaluateNotificationRule(env, reportRule(), NOW);

    expect(loadReportData).toHaveBeenCalledWith(env, {
      siteId: "site-1",
      now: NOW,
      reportType: "monthly",
      timezone: "Asia/Tokyo",
      cache: undefined,
    });
    expect(result).toMatchObject({
      status: "triggered",
      cooldownUntil: null,
      message: {
        type: "report",
        severity: "info",
        title: "example.com monthly traffic report",
        summary: "2026-10: 1,200 visitors and 3,200 views.",
        data: { reportType: "monthly", topPages: [{ path: "/", views: 900 }] },
      },
    });
  });

  it("skips a report or alert whose site is gone", async () => {
    loadReportData.mockResolvedValue(null);
    loadSiteInfo.mockResolvedValue(null);

    await expect(
      evaluateNotificationRule(env, reportRule(), NOW),
    ).resolves.toEqual({ status: "skipped", reason: "site_not_found" });
    await expect(
      evaluateNotificationRule(env, alertRule(), NOW),
    ).resolves.toEqual({ status: "skipped", reason: "site_not_found" });
    expect(loadVisitorChange).not.toHaveBeenCalled();
  });

  it("fires a spike alert at its percentage and waits 12 hours after", async () => {
    loadVisitorChange.mockResolvedValue(visitors(150, 100));

    const result = await evaluateNotificationRule(env, alertRule(), NOW);

    expect(loadVisitorChange).toHaveBeenCalledWith(env, {
      siteId: "site-1",
      window: "last_1h",
      now: NOW,
      cache: undefined,
    });
    expect(result).toMatchObject({
      status: "triggered",
      cooldownUntil: NOW + 12 * 60 * 60,
      message: {
        type: "change",
        severity: "warning",
        title: "example.com traffic spike",
        summary: "Visitors rose 50% (100 to 150).",
        data: {
          direction: "spike",
          threshold: 50,
          current: 150,
          previous: 100,
          change: 50,
        },
      },
    });
  });

  it("checks without firing below the percentage or in the other direction", async () => {
    loadVisitorChange.mockResolvedValue(visitors(149, 100));
    await expect(
      evaluateNotificationRule(env, alertRule(), NOW),
    ).resolves.toEqual({ status: "checked", triggered: false });

    loadVisitorChange.mockResolvedValue(visitors(40, 100));
    await expect(
      evaluateNotificationRule(env, alertRule(), NOW),
    ).resolves.toEqual({ status: "checked", triggered: false });
  });

  it("fires a drop alert when visitors fall by the percentage", async () => {
    loadVisitorChange.mockResolvedValue(visitors(40, 100));

    const result = await evaluateNotificationRule(
      env,
      alertRule({ direction: "drop", window: "last_24h", percent: 60 }),
      NOW,
    );

    expect(result).toMatchObject({
      status: "triggered",
      message: {
        title: "example.com traffic drop",
        summary: "Visitors fell 60% (100 to 40).",
        data: { direction: "drop", window: "last_24h", change: -60 },
      },
    });
  });

  it("counts traffic out of nothing as a 100% rise", () => {
    expect(visitorChangePercent(0, 0)).toBe(0);
    expect(visitorChangePercent(25, 0)).toBe(100);
    expect(visitorChangePercent(0, 25)).toBe(-100);
  });
});
