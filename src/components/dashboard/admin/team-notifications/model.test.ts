import { describe, expect, it } from "vitest";

import {
  buildRulePayload,
  defaultName,
  EMPTY_FORM,
  inferFormFromRule,
  ruleConditionLabel,
  siteLabel,
  TIME_OPTIONS,
} from "@/components/dashboard/admin/team-notifications/model";
import type {
  NotificationRuleData,
  SiteData,
} from "@/lib/dashboard-api/client/edge";
import { getMessages } from "@/lib/i18n/messages";
import { parseNotificationRuleConfig } from "@/lib/notifications/rules";

const copy = getMessages("en").teamManagement.notifications;

const sites = [
  { id: "site-1", name: "Docs", domain: "docs.example.com" },
  { id: "site-2", name: "example.com", domain: "example.com" },
] as SiteData[];

const common = {
  id: "rule-1",
  teamId: "team-1",
  siteId: "site-1",
  name: "Docs weekly",
  enabled: true,
  lastCheckedAt: null,
  lastTriggeredAt: null,
  nextRunAt: null,
  cooldownUntil: null,
  createdByUserId: "user-1",
  createdAt: 1,
  updatedAt: 1,
};
const weekly: NotificationRuleData = {
  ...common,
  type: "report",
  schedule: {
    kind: "weekly",
    dayOfWeek: 3,
    time: "09:30",
    timezone: "Asia/Tokyo",
  },
};
const monthly: NotificationRuleData = {
  ...common,
  type: "report",
  schedule: { kind: "monthly", dayOfMonth: 15, time: "07:00", timezone: "UTC" },
};
const drop: NotificationRuleData = {
  ...common,
  type: "change",
  condition: { direction: "drop", window: "last_24h", percent: 40 },
};

describe("team notification rule model", () => {
  it("offers a send time every half hour", () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS.slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
  });

  it("describes when each rule sends", () => {
    expect(ruleConditionLabel(copy, weekly)).toBe("Weekly Wed 09:30");
    expect(ruleConditionLabel(copy, monthly)).toBe("Monthly day 15 07:00");
    expect(ruleConditionLabel(copy, drop)).toBe(
      "Drop of 40% or more (Last 24 hours)",
    );
  });

  it("labels sites, and names a rule after its site", () => {
    const siteById = new Map(sites.map((site) => [site.id, site]));
    expect(siteLabel(siteById, "site-1")).toBe("Docs (docs.example.com)");
    expect(siteLabel(siteById, "site-2")).toBe("example.com");
    expect(siteLabel(siteById, "gone")).toBe("gone");
    expect(defaultName(copy, "report", sites[0])).toBe("Docs report");
    expect(defaultName(copy, "change")).toBe("Site traffic alert");
  });

  it("fills the form from a saved rule and builds it back", () => {
    for (const rule of [weekly, monthly, drop]) {
      const payload = buildRulePayload(copy, inferFormFromRule(rule), sites);
      expect(payload.name).toBe(rule.name);
      expect(payload.siteId).toBe(rule.siteId);
      // What the form sends back is what the server stores.
      expect(parseNotificationRuleConfig(payload)).toEqual(
        rule.type === "report"
          ? { type: "report", schedule: rule.schedule }
          : { type: "change", condition: rule.condition },
      );
    }
  });

  it("builds a new rule from the defaults, named after its site", () => {
    expect(
      buildRulePayload(copy, { ...EMPTY_FORM, siteId: "site-1" }, sites),
    ).toEqual({
      name: "Docs report",
      siteId: "site-1",
      type: "report",
      schedule: {
        kind: "weekly",
        dayOfWeek: 1,
        time: "08:00",
        timezone: "UTC",
      },
    });
    expect(
      buildRulePayload(
        copy,
        {
          ...EMPTY_FORM,
          siteId: "site-2",
          name: "  ",
          type: "change",
          percent: "75",
        },
        sites,
      ),
    ).toEqual({
      name: "example.com traffic alert",
      siteId: "site-2",
      type: "change",
      condition: { direction: "spike", window: "last_1h", percent: 75 },
    });
    expect(
      buildRulePayload(
        copy,
        {
          ...EMPTY_FORM,
          siteId: "site-1",
          frequency: "monthly",
          dayOfMonth: "31",
        },
        sites,
      ),
    ).toMatchObject({ schedule: { kind: "monthly", dayOfMonth: 31 } });
  });
});
