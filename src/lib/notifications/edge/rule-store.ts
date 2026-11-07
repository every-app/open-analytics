import { listMembers } from "@every-app/sdk/server";

import type { NotificationRuleData } from "@/lib/dashboard-api/contract/types";
import {
  and,
  coalesce,
  compileD1Mutation,
  compileD1Query,
  createD1DatabaseClient,
  deleteFrom,
  eq,
  filter,
  insert,
  isNotNull,
  isNull,
  limit,
  lte,
  or,
  param,
  schema,
  sort,
  update,
} from "@/lib/db";
import { canManageSite, canManageTeam } from "@/lib/edge/admin/access";
import type { Actor } from "@/lib/edge/admin/auth";
import type { Env } from "@/lib/edge/types";
import { clampString } from "@/lib/edge/utils";
import {
  notificationRecipientRows,
  notificationRuleRows,
} from "@/lib/notifications/edge/database-projections";
import {
  type NotificationRuleConfig,
  parseNotificationRuleConfig,
} from "@/lib/notifications/rules";
import { nextReportRunAt } from "@/lib/notifications/schedule";

export type NotificationRule = NotificationRuleData;
type RuleRow = NonNullable<ReturnType<typeof notificationRuleRows>["__row"]>;

export interface NotificationRecipient {
  id: string;
  email: string;
  preferencesJson: string;
}
export interface CreateNotificationRuleInput {
  teamId: string;
  siteId: string;
  name: string;
  enabled?: boolean;
  config: NotificationRuleConfig;
}
export interface UpdateNotificationRuleInput {
  ruleId: string;
  siteId?: string;
  name?: string;
  enabled?: boolean;
  config?: NotificationRuleConfig;
}

function notificationRuleDatabase(env: Env) {
  return createD1DatabaseClient(env.DB);
}

function nullableNumber(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** A report's next send; an alert is checked on every notification tick. */
function nextRunAtFor(config: NotificationRuleConfig, now: number): number {
  return config.type === "report" ? nextReportRunAt(config.schedule, now) : now;
}

function configColumns(config: NotificationRuleConfig) {
  return {
    type: config.type,
    schedule_json: JSON.stringify(
      config.type === "report" ? config.schedule : {},
    ),
    condition_json: JSON.stringify(
      config.type === "change" ? config.condition : {},
    ),
  };
}

export function mapNotificationRule(row: RuleRow): NotificationRule {
  if (typeof row.id !== "string" || !row.siteId) {
    throw new Error("notification_rule_row_invalid");
  }
  return {
    id: row.id,
    teamId: row.teamId,
    siteId: row.siteId,
    name: row.name,
    enabled: Number(row.enabled) === 1,
    ...parseNotificationRuleConfig({
      type: row.type,
      schedule: JSON.parse(row.scheduleJson) as unknown,
      condition: JSON.parse(row.conditionJson) as unknown,
    }),
    lastCheckedAt: nullableNumber(row.lastCheckedAt),
    lastTriggeredAt: nullableNumber(row.lastTriggeredAt),
    nextRunAt: nullableNumber(row.nextRunAt),
    cooldownUntil: nullableNumber(row.cooldownUntil),
    createdByUserId: row.createdByUserId ?? null,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}
export async function getNotificationRule(
  env: Env,
  ruleId: string,
): Promise<NotificationRule | null> {
  const selected = notificationRuleRows();
  const matching = filter(selected, eq(selected.columns.id, param(ruleId)));
  const row = await notificationRuleDatabase(env).first(
    compileD1Query(limit(matching, 1), {
      tag: "notifications.notification_rules.first",
    }),
  );
  return row ? mapNotificationRule(row) : null;
}
async function canManageRuleScope(
  env: Env,
  actor: Actor,
  input: { teamId: string; siteId: string },
): Promise<boolean> {
  return (
    canManageTeam(actor, input.teamId) &&
    (await canManageSite(env, actor, input.siteId))
  );
}
export async function createNotificationRule(
  env: Env,
  actor: Actor,
  input: CreateNotificationRuleInput,
): Promise<NotificationRule> {
  if (!(await canManageRuleScope(env, actor, input))) {
    throw new Error("Forbidden");
  }
  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      insert(schema.notification_rules, {
        id,
        team_id: input.teamId,
        site_id: input.siteId,
        name: clampString(input.name.trim() || "Notification rule", 160),
        enabled: input.enabled === false ? 0 : 1,
        ...configColumns(input.config),
        next_run_at: nextRunAtFor(input.config, now),
        created_by_user_id: actor.user.id,
        created_at: now,
        updated_at: now,
      }),
      { tag: "notifications.rules.insert" },
    ),
  );
  const rule = await getNotificationRule(env, id);
  if (!rule) throw new Error("Notification rule was not created");
  return rule;
}
export async function listNotificationRules(
  env: Env,
  actor: Actor,
  filters: { teamId?: string; siteId?: string } = {},
): Promise<NotificationRule[]> {
  const rules = notificationRuleRows();
  const teamId = filters.teamId ?? actor.teamId;
  // Everyone in the organization manages its rules (isAdmin, viewer.ts).
  if (filters.teamId ? !canManageTeam(actor, teamId) : !actor.isAdmin) {
    throw new Error("Forbidden");
  }
  const byTeam = eq(rules.columns.teamId, param(teamId));
  const matching = filter(
    rules,
    filters.siteId
      ? and(byTeam, eq(rules.columns.siteId, param(filters.siteId)))
      : byTeam,
  );
  const ordered = sort(matching, [
    { expression: matching.columns.updatedAt, direction: "DESC" },
  ]);
  const rows = await notificationRuleDatabase(env).all(
    compileD1Query(limit(ordered, 200), {
      tag: "notifications.notification_rules.all",
    }),
  );
  return rows.results.map(mapNotificationRule);
}
export async function updateNotificationRule(
  env: Env,
  actor: Actor,
  input: UpdateNotificationRuleInput,
): Promise<NotificationRule> {
  const current = await getNotificationRule(env, input.ruleId);
  if (!current) throw new Error("Not Found");
  const siteId = input.siteId ?? current.siteId;
  // Moving a rule to another site needs both sites.
  for (const id of new Set([current.siteId, siteId])) {
    if (
      !(await canManageRuleScope(env, actor, {
        teamId: current.teamId,
        siteId: id,
      }))
    ) {
      throw new Error("Forbidden");
    }
  }
  const now = Math.floor(Date.now() / 1000);
  const config = input.config ?? current;
  // What the rule watches changed: its next run and any cooldown start over.
  const restart =
    siteId !== current.siteId ||
    JSON.stringify(configColumns(config)) !==
      JSON.stringify(configColumns(current));
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          site_id: siteId,
          name: clampString((input.name ?? current.name).trim(), 160),
          enabled: (input.enabled ?? current.enabled) ? 1 : 0,
          ...configColumns(config),
          next_run_at: restart ? nextRunAtFor(config, now) : current.nextRunAt,
          cooldown_until: restart ? null : current.cooldownUntil,
          updated_at: now,
        },
        where: eq(columns.id, param(input.ruleId)),
      })),
      { tag: "notifications.rules.update" },
    ),
  );
  const updated = await getNotificationRule(env, input.ruleId);
  if (!updated) throw new Error("Notification rule disappeared");
  return updated;
}
export async function deleteNotificationRule(
  env: Env,
  actor: Actor,
  ruleId: string,
): Promise<boolean> {
  const rule = await getNotificationRule(env, ruleId);
  if (!rule) return false;
  if (!(await canManageRuleScope(env, actor, rule))) {
    throw new Error("Forbidden");
  }
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      deleteFrom(schema.notification_rules, (columns) =>
        eq(columns.id, param(ruleId)),
      ),
      { tag: "notifications.rules.delete" },
    ),
  );
  return true;
}
export async function listDueNotificationRules(
  env: Env,
  now: number,
): Promise<NotificationRule[]> {
  const rules = notificationRuleRows();
  const matching = filter(
    rules,
    and(
      eq(rules.columns.enabled, param(1)),
      isNotNull(rules.columns.nextRunAt),
      lte(rules.columns.nextRunAt, param(now)),
      or(
        // Keep NULL cooldowns eligible and exclude only future cooldowns.
        isNull(rules.columns.cooldownUntil),
        lte(rules.columns.cooldownUntil, param(now)),
      ),
    ),
  );
  const ordered = sort(matching, [
    { expression: matching.columns.nextRunAt, direction: "ASC" },
  ]);
  const rows = await notificationRuleDatabase(env).all(
    compileD1Query(limit(ordered, 100), {
      tag: "notifications.notification_rules.all",
    }),
  );
  return rows.results.map(mapNotificationRule);
}
/**
 * Gives an enabled report with no next run (a report the rules migration
 * moved to another schedule) its next slot in its own time zone, without
 * sending anything.
 */
export async function scheduleUnscheduledReports(
  env: Env,
  now: number,
): Promise<void> {
  const rules = notificationRuleRows();
  const database = notificationRuleDatabase(env);
  const rows = await database.all(
    compileD1Query(
      filter(
        rules,
        and(
          eq(rules.columns.enabled, param(1)),
          eq(rules.columns.type, param("report")),
          isNull(rules.columns.nextRunAt),
        ),
      ),
      { tag: "notifications.notification_rules.unscheduled" },
    ),
  );
  for (const row of rows.results) {
    const rule = mapNotificationRule(row);
    await database.run(
      compileD1Mutation(
        update(schema.notification_rules, (columns) => ({
          set: { next_run_at: nextRunAtFor(rule, now), updated_at: now },
          where: eq(columns.id, param(rule.id)),
        })),
        { tag: "notifications.rules.schedule" },
      ),
    );
  }
}
/** Records a check: when it ran, whether it sent, and when it runs next. */
export async function recordNotificationRuleCheck(
  env: Env,
  input: {
    rule: NotificationRule;
    checkedAt: number;
    triggeredAt?: number;
    cooldownUntil?: number | null;
  },
): Promise<void> {
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          last_checked_at: input.checkedAt,
          last_triggered_at: coalesce(
            param(input.triggeredAt ?? null),
            columns.last_triggered_at,
          ),
          next_run_at: nextRunAtFor(input.rule, input.checkedAt),
          cooldown_until: input.cooldownUntil ?? null,
          updated_at: input.checkedAt,
        },
        where: eq(columns.id, param(input.rule.id)),
      })),
      { tag: "notifications.rules.record_check" },
    ),
  );
}
/**
 * Who receives a rule's messages: its creator, while they can still open the
 * app (a member who left, was deactivated or lost the app gets nothing), with
 * their own preferences.
 */
export async function resolveNotificationRecipient(
  env: Env,
  rule: NotificationRule,
): Promise<NotificationRecipient | null> {
  if (!rule.createdByUserId) return null;
  const { members } = await listMembers({
    env,
    for: { background: true, organizationId: rule.teamId },
  });
  const member = members.find(({ id }) => id === rule.createdByUserId);
  if (!member) return null;
  const users = notificationRecipientRows();
  const row = await notificationRuleDatabase(env).first(
    compileD1Query(
      limit(filter(users, eq(users.columns.id, param(member.id))), 1),
      { tag: "notifications.users.first" },
    ),
  );
  return {
    id: member.id,
    email: member.email,
    preferencesJson: row?.preferencesJson ?? "{}",
  };
}
