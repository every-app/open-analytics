import { describe, expect, it } from "vitest";

import {
  buildNotificationContent,
  formatNotificationChange,
  formatNotificationNumber,
  notificationSiteName,
} from "@/lib/notifications/content";
import { renderNotificationPlainText } from "@/lib/notifications/email-text";
import { buildLocalizedNotificationMessageFields } from "@/lib/notifications/localized-message";
import { notificationEmailPreviewMessages } from "@/lib/notifications/preview-data";

const report = notificationEmailPreviewMessages.report;
const change = notificationEmailPreviewMessages.change;

describe("notification content", () => {
  it("formats numbers, signed changes and site names", () => {
    expect(formatNotificationNumber(1234.9, "en")).toBe("1,234");
    expect(formatNotificationNumber("bad", "en")).toBe("0");
    expect(formatNotificationChange(102.2, "en")).toBe("+102%");
    expect(formatNotificationChange(-40, "en")).toBe("-40%");
    expect(formatNotificationChange(0, "en")).toBe("0%");
    expect(notificationSiteName({ siteName: "Example" })).toBe("Example");
    expect(notificationSiteName({ siteDomain: " example.com " })).toBe(
      "example.com",
    );
    expect(notificationSiteName({})).toBe("Site");
  });

  it("titles a report by its site and period", () => {
    expect(buildNotificationContent({ ...report, locale: "en" })).toMatchObject(
      {
        subject: "example.com weekly traffic report",
        summary: "2026-06-22 to 2026-06-28: 1,240 visitors and 3,820 views.",
      },
    );
    expect(
      buildNotificationContent({
        ...report,
        data: { ...report.data, reportType: "monthly" },
        locale: "en",
      }).title,
    ).toBe("example.com monthly traffic report");
  });

  it("says how far visitors moved, and over which window", () => {
    expect(buildNotificationContent({ ...change, locale: "en" })).toEqual({
      subject: "example.com traffic change alert",
      title: "example.com traffic change alert",
      summary: "visitors for Last 24 hours changed by +102%.",
      bodyText: "visitors for Last 24 hours changed by +102%.",
    });
  });

  it("renders plain text for a report and an alert", () => {
    const reportText = renderNotificationPlainText({
      content: buildNotificationContent({ ...report, locale: "en" }),
      message: report,
      locale: "en",
    });
    expect(reportText).toContain("Date: 2026-06-22 to 2026-06-28");
    expect(reportText).toContain("1. / - 1,200 views");
    expect(reportText).toContain("1. Google - 520 visits");

    const emptyReport = renderNotificationPlainText({
      content: buildNotificationContent({ ...report, locale: "en" }),
      message: {
        ...report,
        data: { ...report.data, topPages: [], topReferrers: "x" },
      },
      locale: "en",
    });
    expect(emptyReport).toContain("No page data yet.");
    expect(emptyReport).toContain("No referrer data yet.");

    const alertText = renderNotificationPlainText({
      content: buildNotificationContent({ ...change, locale: "en" }),
      message: change,
      locale: "en",
    });
    expect(alertText.split("\n").slice(-4)).toEqual([
      "Window: Last 24 hours",
      "Previous value: 920",
      "Current value: 1,860",
      "Change: +102%",
    ]);
    expect(alertText).not.toContain("[object Object]");
  });

  it("builds a rule's message from its data", () => {
    expect(
      buildLocalizedNotificationMessageFields({
        draft: {
          type: "change",
          severity: "warning",
          title: "English title",
          summary: "English summary",
          bodyText: "English body",
          data: change.data,
        },
        locale: "en",
      }),
    ).toMatchObject({
      locale: "en",
      title: "example.com traffic change alert",
      summary: "visitors for Last 24 hours changed by +102%.",
    });
  });
});
