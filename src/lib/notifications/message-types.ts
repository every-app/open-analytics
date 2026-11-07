import { NOTIFICATION_RULE_TYPES, type NotificationRuleType } from "./rules";

/** Every message comes from a rule, and carries that rule's type. */
export type NotificationMessageType = NotificationRuleType;

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationDeliveryStatus =
  "created" | "sending" | "sent" | "partial" | "failed" | "skipped";

export type NotificationChannel = "inApp" | "email" | "webPush";

const SEVERITIES = new Set<NotificationSeverity>([
  "info",
  "success",
  "warning",
  "critical",
]);

const DELIVERY_STATUSES = new Set<NotificationDeliveryStatus>([
  "created",
  "sending",
  "sent",
  "partial",
  "failed",
  "skipped",
]);

export function parseNotificationMessageType(
  value: unknown,
): NotificationMessageType {
  if (NOTIFICATION_RULE_TYPES.includes(value as NotificationMessageType)) {
    return value as NotificationMessageType;
  }
  throw new Error(`Unknown notification message type: ${String(value)}`);
}

export function normalizeNotificationSeverity(
  value: unknown,
): NotificationSeverity {
  return SEVERITIES.has(value as NotificationSeverity)
    ? (value as NotificationSeverity)
    : "info";
}

export function normalizeNotificationDeliveryStatus(
  value: unknown,
): NotificationDeliveryStatus {
  return DELIVERY_STATUSES.has(value as NotificationDeliveryStatus)
    ? (value as NotificationDeliveryStatus)
    : "created";
}
