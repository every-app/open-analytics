import type { Locale } from "@/lib/i18n/config";

import type { NotificationContent } from "./content";
import { formatNotificationChange, notificationWindowLabel } from "./content";
import { formatNotificationNumber } from "./email-format";
import { NOTIFICATION_EMAIL_MESSAGES } from "./email-i18n";
import type { NotificationMessage } from "./message";

interface RenderNotificationEmailTextInput {
  content: NotificationContent;
  message: Pick<NotificationMessage, "type" | "data">;
  locale: Locale;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function renderReportText(input: RenderNotificationEmailTextInput): string {
  const messages = NOTIFICATION_EMAIL_MESSAGES[input.locale];
  const data = input.message.data;
  const range = record(data.range);
  const metrics = record(data.metrics);
  const topPages = rows(data.topPages);
  const topReferrers = rows(data.topReferrers);
  const pageLines =
    topPages.length > 0
      ? topPages.map((page, index) => {
          const path = textValue(page.path, "/");
          const views = formatNotificationNumber(page.views, input.locale);
          return `${index + 1}. ${path} - ${views} ${messages.common.viewsUnit}`;
        })
      : [messages.common.noPageData];
  const referrerLines =
    topReferrers.length > 0
      ? topReferrers.map((referrer, index) => {
          const name = textValue(referrer.referrer, messages.common.direct);
          const visits = formatNotificationNumber(
            referrer.visits,
            input.locale,
          );
          return `${index + 1}. ${name} - ${visits} ${messages.common.visits}`;
        })
      : [messages.common.noReferrerData];

  return [
    input.content.title,
    "",
    `${messages.common.date}: ${textValue(range.label)}`,
    "",
    `${messages.common.coreMetrics}:`,
    `- ${messages.common.views}: ${formatNotificationNumber(metrics.views, input.locale)}`,
    `- ${messages.common.visitors}: ${formatNotificationNumber(metrics.visitors, input.locale)}`,
    `- ${messages.common.sessions}: ${formatNotificationNumber(metrics.sessions, input.locale)}`,
    "",
    `${messages.common.topPages}:`,
    ...pageLines,
    "",
    `${messages.common.topReferrers}:`,
    ...referrerLines,
  ].join("\n");
}

function renderChangeText(input: RenderNotificationEmailTextInput): string {
  const messages = NOTIFICATION_EMAIL_MESSAGES[input.locale];
  const data = input.message.data;
  return [
    input.content.title,
    "",
    input.content.summary,
    "",
    `${messages.common.window}: ${notificationWindowLabel(input.locale, data.window)}`,
    `${messages.common.previousValue}: ${formatNotificationNumber(data.previous, input.locale)}`,
    `${messages.common.currentValue}: ${formatNotificationNumber(data.current, input.locale)}`,
    `${messages.common.change}: ${formatNotificationChange(data.change, input.locale)}`,
  ].join("\n");
}

export function renderNotificationPlainText(
  input: RenderNotificationEmailTextInput,
): string {
  return input.message.type === "report"
    ? renderReportText(input)
    : renderChangeText(input);
}
