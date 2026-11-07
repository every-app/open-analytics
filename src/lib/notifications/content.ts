import type { Locale } from "@/lib/i18n/config";

import { formatNotificationNumber } from "./email-format";
import { NOTIFICATION_EMAIL_MESSAGES } from "./email-i18n";
import type { NotificationMessageType } from "./message-types";
import type { ChangeWindow, ReportFrequency } from "./rules";

export { formatNotificationNumber } from "./email-format";

export interface NotificationContentInput {
  type: NotificationMessageType;
  data: Record<string, unknown>;
  locale: Locale;
}

export interface NotificationContent {
  subject: string;
  title: string;
  summary: string;
  bodyText: string;
}

function format(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{([a-zA-Z0-9_]+)\}/g,
    (_, key: string) => values[key] ?? "",
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function notificationSiteName(data: Record<string, unknown>): string {
  for (const key of ["siteDomain", "siteName"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Site";
}

export function notificationWindowLabel(locale: Locale, value: unknown) {
  return NOTIFICATION_EMAIL_MESSAGES[locale].change.windows[
    value as ChangeWindow
  ];
}

/** A change in percent with its sign: +102%, -40%. */
export function formatNotificationChange(value: unknown, locale: Locale) {
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${formatNotificationNumber(number, locale)}%`;
}

function reportContent(input: NotificationContentInput): NotificationContent {
  const messages = NOTIFICATION_EMAIL_MESSAGES[input.locale].report;
  const site = notificationSiteName(input.data);
  const periodLabel =
    messages.periodLabels[input.data.reportType as ReportFrequency];
  const metrics = record(input.data.metrics);
  const summary = format(messages.summary, {
    date: String(record(input.data.range).label ?? ""),
    visitors: formatNotificationNumber(metrics.visitors, input.locale),
    views: formatNotificationNumber(metrics.views, input.locale),
  });
  return {
    subject: format(messages.subject, { site, periodLabel }),
    title: format(messages.title, { site, periodLabel }),
    summary,
    bodyText: summary,
  };
}

function changeContent(input: NotificationContentInput): NotificationContent {
  const messages = NOTIFICATION_EMAIL_MESSAGES[input.locale].change;
  const site = notificationSiteName(input.data);
  const summary = format(messages.summary, {
    metric: messages.metric,
    window: notificationWindowLabel(input.locale, input.data.window),
    change: formatNotificationChange(input.data.change, input.locale),
  });
  return {
    subject: format(messages.subject, { site }),
    title: format(messages.title, { site }),
    summary,
    bodyText: summary,
  };
}

export function buildNotificationContent(
  input: NotificationContentInput,
): NotificationContent {
  return input.type === "report" ? reportContent(input) : changeContent(input);
}
