import { describe, expect, it } from "vitest";

import { notificationRuleExpiresAtSeconds } from "@/lib/notifications/schedule";
import {
  DEFAULT_RETENTION_CONFIG,
  mergeRetentionConfig,
  normalizeRetentionConfig,
  shortensAnalyticsRetention,
} from "@/lib/retention";

describe("retention configuration", () => {
  it("falls back per field and drops settings that no longer exist", () => {
    expect(
      normalizeRetentionConfig({
        scheduledTaskLogsDays: 45,
        notificationTestDays: 7,
        notificationAttentionDays: "180",
        notificationDefaultDays: 0,
        analyticsDetailDays: 90,
      }),
    ).toEqual({ ...DEFAULT_RETENTION_CONFIG, analyticsDetailDays: 90 });
  });

  it("merges configured retention without changing the defaults", () => {
    const config = mergeRetentionConfig(DEFAULT_RETENTION_CONFIG, {
      notificationDefaultDays: 7,
    });
    expect(config).toEqual({
      notificationAttentionDays: 180,
      notificationDefaultDays: 7,
      analyticsDetailDays: 396,
    });
    expect(DEFAULT_RETENTION_CONFIG.notificationDefaultDays).toBe(120);
    expect(
      notificationRuleExpiresAtSeconds({
        severity: "info",
        createdAtSeconds: 1000,
        retention: config,
      }),
    ).toBe(1000 + 7 * 24 * 60 * 60);
  });

  it("keeps page views and events forever on request, with no upper limit on days", () => {
    const forever = mergeRetentionConfig(DEFAULT_RETENTION_CONFIG, {
      analyticsDetailDays: null,
    });
    expect(forever.analyticsDetailDays).toBeNull();
    // An absent or invalid value is the default, not forever.
    expect(normalizeRetentionConfig({}).analyticsDetailDays).toBe(396);
    expect(
      normalizeRetentionConfig({ analyticsDetailDays: "forever" })
        .analyticsDetailDays,
    ).toBe(396);
    expect(
      normalizeRetentionConfig({
        analyticsDetailDays: 40_000,
        notificationDefaultDays: 9_000,
      }),
    ).toMatchObject({
      analyticsDetailDays: 40_000,
      notificationDefaultDays: 9_000,
    });
    // Merging other settings keeps forever.
    expect(
      mergeRetentionConfig(forever, { notificationDefaultDays: 7 })
        .analyticsDetailDays,
    ).toBeNull();
  });

  it("says when new settings delete page views the current ones keep", () => {
    const days = (analyticsDetailDays: number | null) => ({
      ...DEFAULT_RETENTION_CONFIG,
      analyticsDetailDays,
    });
    expect(shortensAnalyticsRetention(days(396), days(30))).toBe(true);
    expect(shortensAnalyticsRetention(days(null), days(3650))).toBe(true);
    expect(shortensAnalyticsRetention(days(30), days(396))).toBe(false);
    expect(shortensAnalyticsRetention(days(30), days(null))).toBe(false);
    expect(shortensAnalyticsRetention(days(null), days(null))).toBe(false);
  });
});
