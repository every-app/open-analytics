import { GatewayRefusalError, sendEmail } from "@every-app/sdk/server";

import type { ScheduledTaskLogger } from "@/lib/edge/scheduled-tasks/runner";
import type { Env } from "@/lib/edge/types";
import { renderNotificationEmail } from "@/lib/notifications/edge/email-renderer";
import { isValidEmail } from "@/lib/notifications/email-config";
import { resolveNotificationMessageLocale } from "@/lib/notifications/locale";
import type { NotificationMessage } from "@/lib/notifications/message";

import { updateNotificationDeliveryResult } from "./message-store";
import { normalizeNotificationPreferences } from "./preferences";
type NotificationDeliveryLogger = Pick<
  ScheduledTaskLogger,
  "info" | "warn" | "error"
>;
export interface NotificationDeliveryUser {
  id: string;
  email: string;
  preferencesJson?: string | null;
  preferredLocale?: string | null;
  timeZone?: string | null;
}
const PROVIDER = "every-app";
function maskEmail(value: string): string {
  const [local = "", domain = ""] = value.split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 2)}***@${domain}`;
}
function fallbackRenderedEmail(message: NotificationMessage) {
  return {
    subject: message.title,
    text:
      message.bodyText ||
      message.summary ||
      "You have a new Open Analytics notification.",
    html: message.bodyHtml || undefined,
  };
}
/**
 * Records the in-app message as delivered and, when the person wants email,
 * sends it through the Every App gateway's email capability: its sender,
 * within its daily budgets. A gateway without email set up skips the email.
 */
export async function deliverNotificationMessage(
  env: Env,
  message: NotificationMessage,
  user: NotificationDeliveryUser,
  context: { logger?: NotificationDeliveryLogger },
): Promise<NotificationMessage | null> {
  const preferences = normalizeNotificationPreferences(user.preferencesJson);
  const channels = { inApp: true, email: preferences.email };
  const results: Record<string, unknown> = {
    inApp: { status: "sent" },
  };
  const finish = (
    status: "sent" | "failed",
    errorMessage?: string,
  ): Promise<NotificationMessage | null> =>
    updateNotificationDeliveryResult(env, {
      messageId: message.id,
      status,
      channels,
      deliveryResults: results,
      ...(errorMessage ? { errorMessage } : {}),
    });

  if (!preferences.email) {
    results.email = { status: "skipped", reason: "user_preference_disabled" };
    await context.logger?.info(
      "notification_delivery_skipped",
      "Email delivery skipped by user preference",
      {
        messageId: message.id,
        userId: user.id,
        channel: "email",
        reason: "user_preference_disabled",
      },
    );
    return finish("sent");
  }

  if (!isValidEmail(user.email)) {
    results.email = { status: "skipped", reason: "recipient_email_invalid" };
    await context.logger?.warn(
      "notification_delivery_skipped",
      "Email delivery skipped because recipient email is invalid",
      {
        messageId: message.id,
        userId: user.id,
        channel: "email",
        reason: "recipient_email_invalid",
      },
    );
    return finish("sent");
  }

  let rendered = fallbackRenderedEmail(message);
  try {
    rendered = await renderNotificationEmail({
      message,
      locale: resolveNotificationMessageLocale({
        messageLocale: message.data.locale,
        userLocale: user.preferredLocale,
      }),
      timeZone: user.timeZone,
    });
  } catch (error) {
    await context.logger?.warn(
      "notification_email_render_failed",
      "Notification email render failed; falling back to plain text delivery",
      {
        messageId: message.id,
        userId: user.id,
        channel: "email",
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  await context.logger?.info("notification_delivery_attempt", "Sending email", {
    messageId: message.id,
    userId: user.id,
    channel: "email",
    provider: PROVIDER,
    recipient: maskEmail(user.email),
  });
  try {
    const sent = await sendEmail({
      env,
      // No person started this send: it's the organization's.
      for: { background: true, organizationId: message.teamId },
      message: {
        to: user.email,
        subject: rendered.subject,
        text: rendered.text,
        ...(rendered.html ? { html: rendered.html } : {}),
      },
    });
    results.email = {
      status: "sent",
      provider: PROVIDER,
      messageId: sent.messageId,
      deliveryStatus: sent.status,
    };
    await context.logger?.info(
      "notification_delivery_success",
      "Email delivery succeeded",
      {
        messageId: message.id,
        userId: user.id,
        channel: "email",
        provider: PROVIDER,
        recipient: maskEmail(user.email),
      },
    );
    return finish("sent");
  } catch (error) {
    if (
      error instanceof GatewayRefusalError &&
      error.code === "integration_not_configured"
    ) {
      results.email = {
        status: "skipped",
        reason: "system_email_unconfigured",
      };
      await context.logger?.info(
        "notification_delivery_skipped",
        "Email delivery skipped because the gateway has no email set up",
        {
          messageId: message.id,
          userId: user.id,
          channel: "email",
          reason: "system_email_unconfigured",
        },
      );
      return finish("sent");
    }
    const reason =
      error instanceof GatewayRefusalError ? error.code : "send_failed";
    const errorMessage =
      error instanceof Error ? error.message : "Email delivery failed";
    results.email = {
      status: "failed",
      provider: PROVIDER,
      reason,
      errorMessage,
    };
    await context.logger?.error(
      "notification_delivery_failed",
      "Email delivery failed",
      {
        messageId: message.id,
        userId: user.id,
        channel: "email",
        provider: PROVIDER,
        recipient: maskEmail(user.email),
        reason,
        errorMessage,
      },
    );
    return finish("failed", errorMessage);
  }
}
