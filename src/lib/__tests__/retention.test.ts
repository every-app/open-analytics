import { describe, expect, it } from "vitest";

import { notificationRuleExpiresAtSeconds } from "@/lib/notifications/schedule";
import {
  DEFAULT_RETENTION_CONFIG,
  mergeRetentionConfig,
  normalizeRetentionConfig,
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
});
