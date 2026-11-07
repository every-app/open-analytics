import type {
  ScheduledTaskContext,
  ScheduledTaskOutcome,
} from "@/lib/edge/scheduled-tasks/runner";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { buildLocalizedNotificationMessageFields } from "@/lib/notifications/localized-message";
import type {
  NotificationMessage,
  NotificationMessageDraft,
} from "@/lib/notifications/message";
import { DEFAULT_RETENTION_CONFIG } from "@/lib/retention";

import { deliverNotificationMessage } from "./delivery";
import { evaluateNotificationRule } from "./evaluator";
import { createNotificationMessage } from "./message-store";
import { createNotificationInvocationCache } from "./notification-cache";
import {
  normalizeNotificationPreferences,
  shouldCreateUnreadAttention,
} from "./preferences";
import {
  listDueNotificationRules,
  type NotificationRule,
  recordNotificationRuleCheck,
  resolveNotificationRecipient,
  scheduleUnscheduledReports,
} from "./rule-store";

export interface NotificationTaskSummary {
  rulesScanned: number;
  rulesChecked: number;
  rulesSkipped: number;
  rulesTriggered: number;
  messagesCreated: number;
  emailSent: number;
  emailFailed: number;
  emailSkipped: number;
}
function emptySummary(): NotificationTaskSummary {
  return {
    rulesScanned: 0,
    rulesChecked: 0,
    rulesSkipped: 0,
    rulesTriggered: 0,
    messagesCreated: 0,
    emailSent: 0,
    emailFailed: 0,
    emailSkipped: 0,
  };
}
function countEmail(
  summary: NotificationTaskSummary,
  message: NotificationMessage | null,
) {
  const email = message?.deliveryResults.email;
  if (!email || typeof email !== "object" || Array.isArray(email)) return;
  const status = (email as Record<string, unknown>).status;
  if (status === "sent") summary.emailSent += 1;
  else if (status === "failed") summary.emailFailed += 1;
  else if (status === "skipped") summary.emailSkipped += 1;
}
/** One message in the creator's inbox, then email if they want it. */
async function sendToCreator(input: {
  context: ScheduledTaskContext;
  rule: NotificationRule;
  draft: NotificationMessageDraft;
  triggeredAt: number;
  summary: NotificationTaskSummary;
}): Promise<void> {
  const { context, rule, draft, triggeredAt, summary } = input;
  const { env, logger } = context;
  const user = await resolveNotificationRecipient(env, rule);
  if (!user) {
    summary.rulesSkipped += 1;
    await logger.warn(
      "notification_rule_skipped",
      "The rule's creator can no longer open the app",
      { ruleId: rule.id },
    );
    return;
  }
  const localized = buildLocalizedNotificationMessageFields({
    draft,
    locale: DEFAULT_LOCALE,
  });
  const message = await createNotificationMessage(env, {
    teamId: rule.teamId,
    siteId: rule.siteId,
    userId: user.id,
    ruleId: rule.id,
    batchId: crypto.randomUUID(),
    type: draft.type,
    severity: draft.severity,
    requiresAttention: shouldCreateUnreadAttention({
      preferences: normalizeNotificationPreferences(user.preferencesJson),
      type: draft.type,
    }),
    title: localized.title,
    summary: localized.summary,
    bodyText: localized.bodyText,
    data: { ...(draft.data ?? {}), locale: localized.locale },
    triggeredAt,
    retention: context.retention ?? DEFAULT_RETENTION_CONFIG,
  });
  summary.messagesCreated += 1;
  await logger.info(
    "notification_messages_created",
    "Notification message created",
    { ruleId: rule.id, messageId: message.id },
  );
  countEmail(
    summary,
    await deliverNotificationMessage(env, message, user, { logger }),
  );
}
/**
 * Checks every due rule: a report whose time has come, and every alert out
 * of its cooldown. A rule that fails is logged and the rest still run.
 */
export async function runNotificationTick(
  context: ScheduledTaskContext,
): Promise<ScheduledTaskOutcome> {
  const { env, logger } = context;
  const summary = emptySummary();
  const cache = createNotificationInvocationCache();
  const now = Math.floor(Date.now() / 1000);
  await scheduleUnscheduledReports(env, now);
  const rules = await listDueNotificationRules(env, now);
  summary.rulesScanned = rules.length;

  for (const rule of rules) {
    const checkedAt = Math.floor(Date.now() / 1000);
    try {
      const evaluation = await evaluateNotificationRule(
        env,
        rule,
        checkedAt,
        cache,
      );
      summary.rulesChecked += 1;
      if (evaluation.status === "skipped") {
        summary.rulesSkipped += 1;
        await logger.info(
          "notification_rule_skipped",
          "Notification rule was skipped",
          { ruleId: rule.id, reason: evaluation.reason },
        );
      }
      if (evaluation.status !== "triggered") {
        await recordNotificationRuleCheck(env, { rule, checkedAt });
        continue;
      }
      summary.rulesTriggered += 1;
      await sendToCreator({
        context,
        rule,
        draft: evaluation.message,
        triggeredAt: checkedAt,
        summary,
      });
      await recordNotificationRuleCheck(env, {
        rule,
        checkedAt,
        triggeredAt: checkedAt,
        cooldownUntil: evaluation.cooldownUntil,
      });
    } catch (error) {
      summary.rulesSkipped += 1;
      await logger.error(
        "notification_rule_failed",
        "Notification rule failed; continuing with remaining rules",
        {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      await recordNotificationRuleCheck(env, { rule, checkedAt });
    }
  }

  await logger.info("notification_tick_finish", "Notification tick finished", {
    ...summary,
  });
  return {
    status: summary.emailFailed > 0 ? "partial" : "success",
    summary: { ...summary },
  };
}
