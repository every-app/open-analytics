import { describe, expect, it } from "vitest";

import { buildNotificationContentForMessage } from "@/lib/notifications/edge/email-renderer";
import { renderNotificationEmail } from "@/lib/notifications/edge/email-renderer";
import { renderNotificationPlainText } from "@/lib/notifications/email-text";
import type { NotificationMessage } from "@/lib/notifications/message";
import { notificationEmailPreviewMessage } from "@/lib/notifications/preview-data";

describe("renderNotificationEmail", () => {
  it("renders report html and text", async () => {
    const rendered = await renderNotificationEmail({
      message: notificationEmailPreviewMessage("report", "en"),
      locale: "en",
    });

    expect(rendered.subject).toContain("weekly traffic report");
    expect(rendered.html).toContain("weekly traffic report");
    expect(rendered.html).toContain("views");
    expect(rendered.html).toContain("visitors");
    expect(rendered.html).toContain("sessions");
    expect(rendered.html).toContain("Top pages");
    expect(rendered.html).toContain("Top referrers");
    expect(rendered.html).toContain("<!doctype html>");
    expect(rendered.html).toContain('<html lang="en">');
    expect(rendered.html).toContain('<meta charSet="utf-8"/>');
    expect(rendered.html).toContain('name="viewport"');
    expect(rendered.html).toContain('name="color-scheme" content="light"');
    expect(rendered.html).toContain(
      'name="supported-color-schemes" content="light"',
    );
    expect(rendered.html).toContain(
      'name="x-apple-disable-message-reformatting"',
    );
    expect(rendered.html).toContain('role="presentation"');
    expect(rendered.html).toContain("table-layout:fixed");
    expect(rendered.html).toContain("overflow-wrap:anywhere");
    expect(rendered.html).toContain("max-width:640px");
    expect(rendered.html).not.toContain("max-width:680px");
    expect(rendered.html).not.toContain("light dark");
    expect(rendered.html).not.toContain("stylesheet");
    expect(rendered.text).toContain("Core metrics:");
    expect(rendered.text).not.toContain("<html");
    expect(rendered.text).not.toContain("[object Object]");
  });

  it("renders long report rows with wrapping-safe table styles", async () => {
    const previewMessage = notificationEmailPreviewMessage("report", "en");
    const message: NotificationMessage = {
      ...previewMessage,
      data: {
        ...previewMessage.data,
        topPages: [
          {
            path: "/posts/very-long-path-without-natural-breaks-abcdefghijklmnopqrstuvwxyz-0123456789",
            views: 123,
          },
        ],
        topReferrers: [
          {
            referrer:
              "very-long-referrer-domain-without-natural-breaks.example.test",
            visits: 45,
          },
        ],
      },
    };

    const rendered = await renderNotificationEmail({
      message,
      locale: "en",
    });

    expect(rendered.html).toContain("very-long-path-without-natural-breaks");
    expect(rendered.html).toContain("overflow-wrap:anywhere");
    expect(rendered.html).toContain("word-break:break-word");
    expect(rendered.html).toContain("width:116px");
  });

  it("renders change html with the shared email design", async () => {
    const rendered = await renderNotificationEmail({
      message: notificationEmailPreviewMessage("change", "en"),
      locale: "en",
    });

    expect(rendered.html).toContain("traffic change alert");
    expect(rendered.html).toContain("Warning");
    expect(rendered.html).toContain("Previous value");
    expect(rendered.html).toContain("Change");
    expect(rendered.text).toContain("changed by +102%");
    expect(rendered.text).toContain("Previous value: 920");
    expect(rendered.text).toContain("Current value: 1,860");
    expect(rendered.text).toContain("Change: +102%");
  });

  it("returns the same text as the direct plain text renderer", async () => {
    const message = notificationEmailPreviewMessage("change", "en");
    const rendered = await renderNotificationEmail({
      message,
      locale: "en",
    });
    const content = buildNotificationContentForMessage({
      message,
      locale: "en",
    });

    expect(rendered.text).toBe(
      renderNotificationPlainText({
        content,
        message,
        locale: "en",
      }),
    );
  });
});
