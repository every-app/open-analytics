import type { Locale } from "@/lib/i18n/config";
import type { NotificationMessage } from "@/lib/notifications/message";

function baseMessage(
  input: Partial<NotificationMessage> & Pick<NotificationMessage, "type">,
): NotificationMessage {
  return {
    id: `preview-${input.type}`,
    teamId: "team-preview",
    siteId: "site-preview",
    userId: "user-preview",
    ruleId: "rule-preview",
    batchId: "batch-preview",
    type: input.type,
    severity: input.severity ?? "info",
    requiresAttention: input.requiresAttention ?? false,
    title: input.title ?? "OpenAnalytics notification",
    summary: input.summary ?? "Preview notification",
    bodyText: input.bodyText ?? "Preview notification body.",
    bodyHtml: "",
    data: { locale: "en", ...(input.data ?? {}) },
    channels: { inApp: true },
    deliveryStatus: "created",
    deliveryResults: {},
    errorMessage: "",
    readAt: null,
    dismissedAt: null,
    archivedAt: null,
    triggeredAt: 1782691200,
    createdAt: 1782691200,
    updatedAt: 1782691200,
    sentAt: null,
    failedAt: null,
    expiresAt: null,
  };
}

export const notificationEmailPreviewMessages = {
  report: baseMessage({
    type: "report",
    title: "example.com weekly traffic report",
    data: {
      siteDomain: "example.com",
      reportType: "weekly",
      range: { label: "2026-06-22 to 2026-06-28" },
      metrics: { views: 3820, visitors: 1240, sessions: 1510 },
      topPages: [
        { path: "/", views: 1200 },
        { path: "/pricing", views: 420 },
      ],
      topReferrers: [
        { referrer: "Google", visits: 520 },
        { referrer: "Direct", visits: 160 },
      ],
      locale: "en",
    },
  }),
  change: baseMessage({
    type: "change",
    severity: "warning",
    requiresAttention: true,
    data: {
      siteDomain: "example.com",
      direction: "spike",
      window: "last_24h",
      threshold: 50,
      current: 1860,
      previous: 920,
      change: 102.2,
      locale: "en",
    },
  }),
};

export type NotificationEmailPreviewType =
  keyof typeof notificationEmailPreviewMessages;

export function notificationEmailPreviewMessage(
  type: NotificationEmailPreviewType,
  locale: Locale,
): NotificationMessage {
  const message = notificationEmailPreviewMessages[type];
  return {
    ...message,
    data: {
      ...message.data,
      locale,
    },
  };
}
