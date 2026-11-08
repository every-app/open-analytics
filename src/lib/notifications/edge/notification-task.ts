import {
  D1_QUERIES_PER_INVOCATION,
  D1QueryBudget,
  withD1QueryBudget,
} from "@/lib/edge/scheduled-tasks/d1-query-budget";
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
import type { NotificationRuleType } from "@/lib/notifications/rules";
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
  DUE_NOTIFICATION_RULES_PER_READ,
  listDueNotificationRules,
  type NotificationRule,
  recordNotificationRuleCheck,
  resolveNotificationRecipient,
  scheduleUnscheduledReports,
} from "./rule-store";

/**
 * The most D1 queries one rule takes, from its evaluation to its recorded
 * check; a rule starts only with this many left. A report reads its site,
 * the overview (rolled-up days, their totals and the raw days at both
 * edges), and top pages and top referrers (each its rolled-up days, then
 * its rows): 8. An alert reads its site and two overviews: 5. Sending reads
 * the recipient, creates the message and reads it back, records its
 * delivery and reads it back: 5. The check: 1. The notification tick tests
 * measure each type's longest path.
 */
export const NOTIFICATION_RULE_D1_QUERIES: Record<
  NotificationRuleType,
  number
> = { report: 14, change: 11 };

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
 * of its cooldown. A rule that fails is logged and the rest still run. A
 * rule starts only with the queries to finish it, its check recorded, out
 * of the run's `maxQueries`; with rules left it reports `workRemains`.
 */
export async function runNotificationTick(
  taskContext: ScheduledTaskContext,
  maxQueries = D1_QUERIES_PER_INVOCATION,
): Promise<ScheduledTaskOutcome> {
  const queries = new D1QueryBudget(maxQueries);
  const context = {
    ...taskContext,
    env: withD1QueryBudget(taskContext.env, queries),
  };
  const { env, logger } = context;
  const summary = emptySummary();
  const cache = createNotificationInvocationCache();
  const now = Math.floor(Date.now() / 1000);
  await scheduleUnscheduledReports(env, now);
  const rules = await listDueNotificationRules(env, now);
  summary.rulesScanned = rules.length;
  // A full read may have left due rules unread.
  let workRemains = rules.length === DUE_NOTIFICATION_RULES_PER_READ;

  for (const rule of rules) {
    if (queries.left < NOTIFICATION_RULE_D1_QUERIES[rule.type]) {
      workRemains = true;
      break;
    }
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
    workRemains,
  };
}
