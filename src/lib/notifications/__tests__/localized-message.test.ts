import { describe, expect, it } from "vitest";

import {
  formatNotificationDateTime,
  formatNotificationNumber,
} from "@/lib/notifications/email-format";
import { renderNotificationPlainText } from "@/lib/notifications/email-text";
import { buildLocalizedNotificationMessageFields } from "@/lib/notifications/localized-message";
import type { NotificationMessageDraft } from "@/lib/notifications/message";
import type { NotificationMessage } from "@/lib/notifications/message";

function draft(
  input: Partial<NotificationMessageDraft>,
): NotificationMessageDraft {
  return {
    type: "report",
    severity: "info",
    requiresAttention: false,
    title: "Fallback title",
    summary: "Fallback summary",
    bodyText: "Fallback body",
    data: {},
    ...input,
  };
}

function message(input: Partial<NotificationMessage>): NotificationMessage {
  return {
    id: "msg-1",
    teamId: "team-1",
    siteId: "site-1",
    userId: "user-1",
    ruleId: null,
    runId: null,
    batchId: null,
    type: "system",
    severity: "info",
    requiresAttention: false,
    title: "Fallback",
    summary: "Summary",
    bodyText: "Body",
    bodyHtml: "",
    data: {},
    channels: {},
    deliveryStatus: "created",
    deliveryResults: {},
    errorMessage: "",
    readAt: null,
    dismissedAt: null,
    archivedAt: null,
    triggeredAt: null,
    createdAt: 1,
    updatedAt: 1,
    sentAt: null,
    failedAt: null,
    expiresAt: null,
    ...input,
  };
}

describe("localized notification messages", () => {
  it("builds report fields", () => {
    const input = draft({
      type: "report",
      data: {
        siteDomain: "example.com",
        range: { label: "2026-06-29" },
        metrics: { views: 1234, visitors: 567, sessions: 89 },
        topPages: [{ path: "/pricing", views: 123 }],
        topReferrers: [{ referrer: "Search", visits: 45 }],
      },
    });

    const en = buildLocalizedNotificationMessageFields({
      draft: input,
      locale: "en",
    });

    expect(en.title).toBe("example.com daily traffic report");
    expect(en.bodyText).toContain("Core metrics");
    expect(en.bodyText).toContain("1. /pricing - 123 views");
  });

  it("builds threshold and health fields without English draft body leakage", () => {
    const threshold = draft({
      type: "threshold",
      severity: "warning",
      bodyText: "Metric: visitors",
      data: {
        siteDomain: "example.com",
        metric: "visitors",
        window: "last_1h",
        value: 1240,
        operator: ">=",
        target: 1000,
      },
    });
    const health = draft({
      type: "health",
      severity: "critical",
      bodyText: "Last seen: never",
      data: {
        siteDomain: "example.com",
        hours: 6,
        lastSeenAt: 1_782_793_800,
      },
    });

    const enThreshold = buildLocalizedNotificationMessageFields({
      draft: threshold,
      locale: "en",
    });
    const enHealth = buildLocalizedNotificationMessageFields({
      draft: health,
      locale: "en",
      timeZone: "Asia/Shanghai",
    });

    expect(enThreshold.bodyText).toContain("Window: Last hour");
    expect(enThreshold.bodyText).toContain("Current value: 1,240");
    expect(enHealth.bodyText).toContain("Last seen: Jun 30, 2026");
    expect(enHealth.bodyText).not.toContain("Last seen: never");
  });

  it("keeps fallback messages on unsupported types", () => {
    const localized = buildLocalizedNotificationMessageFields({
      draft: draft({
        type: "system",
        title: "System title",
        summary: "System summary",
        bodyText: "System body",
      }),
      locale: "en",
    });

    expect(localized).toMatchObject({
      locale: "en",
      title: "System title",
      summary: "System summary",
      bodyText: "System title\n\nSystem body",
    });
  });

  it("falls back to draft fields when content rendering fails", () => {
    const localized = buildLocalizedNotificationMessageFields({
      draft: draft({
        type: "report",
        title: "Fallback title",
        summary: "Fallback summary",
        bodyText: "Fallback body",
      }),
      locale: "missing" as never,
    });

    expect(localized).toEqual({
      locale: "missing",
      title: "Fallback title",
      summary: "Fallback summary",
      bodyText: "Fallback body",
    });
  });
});

describe("notification plain text and email rendering", () => {
  it("formats health timestamps with locale and timezone", () => {
    expect(
      formatNotificationDateTime(1_782_793_800, "en", "Asia/Shanghai"),
    ).toContain("Jun");
    expect(formatNotificationDateTime("bad", "en")).toBe("");
    expect(formatNotificationDateTime(0, "en")).toBe("");
    expect(
      formatNotificationDateTime(1_782_793_800, "en", "Bad/Zone"),
    ).toContain("Jun");
  });

  it("formats notification numbers defensively", () => {
    expect(formatNotificationNumber(1234.9, "en")).toBe("1,234");
    expect(formatNotificationNumber("bad", "en")).toBe("0");
  });

  it("renders plain text without html or object string output", () => {
    const text = renderNotificationPlainText({
      locale: "en",
      timeZone: "Asia/Shanghai",
      content: {
        subject: "example.com traffic threshold reached",
        title: "example.com traffic threshold reached",
        summary:
          "visitors for Last hour is 1,240, matching threshold >= 1,000.",
        bodyText: "",
      },
      message: message({
        type: "threshold",
        severity: "warning",
        data: {
          metric: "visitors",
          window: "last_1h",
          value: 1240,
          operator: ">=",
          target: 1000,
        },
      }),
    });

    expect(text).toContain("Metric: visitors");
    expect(text).not.toContain("<html");
    expect(text).not.toContain("[object Object]");
  });

  it("renders localized health plain text with timezone", () => {
    const localized = buildLocalizedNotificationMessageFields({
      locale: "en",
      timeZone: "Asia/Shanghai",
      draft: draft({
        type: "health",
        severity: "critical",
        data: {
          siteDomain: "example.com",
          hours: 6,
          lastSeenAt: 1_782_793_800,
        },
      }),
    });

    expect(localized.title).toContain("has not received traffic data");
    expect(localized.bodyText).toContain("Last seen: Jun 30, 2026");
    expect(localized.bodyText).not.toContain("<html");
    expect(localized.bodyText).not.toContain("[object Object]");
  });
});
