import { listMembers } from "@every-app/sdk/server";

import {
  and,
  caseWhen,
  coalesce,
  compileD1Mutation,
  compileD1Query,
  createD1DatabaseClient,
  deleteFrom,
  eq,
  filter,
  inList,
  insert,
  isNotNull,
  isNull,
  limit,
  lte,
  neq,
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
import { safeJsonStringify, safeParseRecord } from "@/lib/notifications/json";
import {
  normalizeNotificationRuleType,
  type NotificationRuleType,
} from "@/lib/notifications/message-types";
import {
  computeNextNotificationRunAt,
  normalizeNotificationSchedule,
  type NotificationScheduleConfig,
} from "@/lib/notifications/schedule";
export type NotificationRecipientConfig =
  | { mode: "creator" }
  | { mode: "team_admins" }
  | { mode: "all_team_members" }
  | { mode: "users"; userIds: string[] };
export interface NotificationRule {
  id: string;
  teamId: string;
  siteId: string | null;
  name: string;
  description: string;
  type: NotificationRuleType;
  enabled: boolean;
  schedule: NotificationScheduleConfig;
  condition: Record<string, unknown>;
  recipient: NotificationRecipientConfig;
  state: Record<string, unknown>;
  lastCheckedAt: number | null;
  lastTriggeredAt: number | null;
  nextRunAt: number | null;
  cooldownUntil: number | null;
  createdByUserId: string | null;
  createdAt: number;
  updatedAt: number;
}
interface RuleRow {
  id: string;
  teamId: string;
  siteId: string | null;
  name: string;
  description: string | null;
  type: string;
  enabled: number;
  scheduleJson: string;
  conditionJson: string;
  recipientJson: string;
  stateJson?: string | null;
  lastCheckedAt: number | null;
  lastTriggeredAt: number | null;
  nextRunAt: number | null;
  cooldownUntil: number | null;
  createdByUserId: string | null;
  createdAt: number;
  updatedAt: number;
}
interface NotificationRuleStorageRow extends Omit<RuleRow, "id"> {
  id: string | null;
}
interface NotificationRecipient {
  id: string;
  email: string;
  preferencesJson: string;
  preferredLocale?: string | null;
  timeZone?: string | null;
}
interface NotificationRecipientStorageRow extends Omit<
  NotificationRecipient,
  "id"
> {
  id: string | null;
  email: string;
  preferencesJson: string;
}
export interface CreateNotificationRuleInput {
  teamId: string;
  siteId?: string | null;
  name: string;
  description?: string;
  type?: NotificationRuleType;
  enabled?: boolean;
  schedule?: unknown;
  condition?: Record<string, unknown>;
  recipient?: NotificationRecipientConfig;
}
export interface UpdateNotificationRuleInput {
  ruleId: string;
  teamId?: string;
  siteId?: string | null;
  name?: string;
  description?: string;
  type?: NotificationRuleType;
  enabled?: boolean;
  schedule?: unknown;
  condition?: Record<string, unknown>;
  recipient?: NotificationRecipientConfig;
}
function notificationRuleDatabase(env: Env) {
  return createD1DatabaseClient(env.DB);
}

function requireNotificationRuleRow(row: NotificationRuleStorageRow): RuleRow {
  if (typeof row.id !== "string") {
    throw new Error("notification_rule_row_missing_id");
  }
  return { ...row, id: row.id };
}

function cleanUserIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .map((item) => clampString(item, 120)),
    ),
  ).slice(0, 200);
}
export function normalizeNotificationRecipientConfig(
  input: unknown,
): NotificationRecipientConfig {
  const raw = safeParseRecord(input);
  if (raw.mode === "creator") return { mode: "creator" };
  if (raw.mode === "team_admins") return { mode: "team_admins" };
  if (raw.mode === "all_team_members") return { mode: "all_team_members" };
  if (raw.mode === "users") {
    return { mode: "users", userIds: cleanUserIds(raw.userIds) };
  }
  return { mode: "creator" };
}
export function mapNotificationRule(row: RuleRow): NotificationRule {
  return {
    id: String(row.id ?? ""),
    teamId: String(row.teamId ?? ""),
    siteId:
      row.siteId === null || row.siteId === undefined
        ? null
        : String(row.siteId),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    type: normalizeNotificationRuleType(row.type),
    enabled: Number(row.enabled ?? 0) === 1,
    schedule: normalizeNotificationSchedule(row.scheduleJson),
    condition: safeParseRecord(row.conditionJson),
    recipient: normalizeNotificationRecipientConfig(row.recipientJson),
    state: safeParseRecord(row.stateJson),
    lastCheckedAt:
      row.lastCheckedAt === null || row.lastCheckedAt === undefined
        ? null
        : Number(row.lastCheckedAt),
    lastTriggeredAt:
      row.lastTriggeredAt === null || row.lastTriggeredAt === undefined
        ? null
        : Number(row.lastTriggeredAt),
    nextRunAt:
      row.nextRunAt === null || row.nextRunAt === undefined
        ? null
        : Number(row.nextRunAt),
    cooldownUntil:
      row.cooldownUntil === null || row.cooldownUntil === undefined
        ? null
        : Number(row.cooldownUntil),
    createdByUserId:
      row.createdByUserId === null || row.createdByUserId === undefined
        ? null
        : String(row.createdByUserId),
    createdAt: Number(row.createdAt ?? 0),
    updatedAt: Number(row.updatedAt ?? 0),
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
  return row ? mapNotificationRule(requireNotificationRuleRow(row)) : null;
}
async function requireCanManageRuleScope(
  env: Env,
  actor: Actor,
  input: { teamId: string; siteId?: string | null },
): Promise<boolean> {
  if (!canManageTeam(actor, input.teamId)) return false;
  if (input.siteId && !(await canManageSite(env, actor, input.siteId))) {
    return false;
  }
  return true;
}
export async function createNotificationRule(
  env: Env,
  actor: Actor,
  input: CreateNotificationRuleInput,
): Promise<NotificationRule> {
  if (!(await requireCanManageRuleScope(env, actor, input))) {
    throw new Error("Forbidden");
  }
  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  const schedule = normalizeNotificationSchedule(input.schedule);
  const nextRunAt = computeNextNotificationRunAt(schedule, now);
  const type = normalizeNotificationRuleType(input.type ?? "test");
  const recipient = normalizeNotificationRecipientConfig(
    input.recipient ?? { mode: "creator" },
  );
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      insert(schema.notification_rules, {
        id,
        team_id: input.teamId,
        site_id: input.siteId ?? null,
        name: clampString(input.name.trim() || "Notification rule", 160),
        description: clampString((input.description ?? "").trim(), 1000),
        type,
        enabled: input.enabled === false ? 0 : 1,
        schedule_json: safeJsonStringify(schedule),
        condition_json: safeJsonStringify(input.condition ?? {}),
        recipient_json: safeJsonStringify(recipient),
        state_json: safeJsonStringify({}),
        next_run_at: nextRunAt,
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
  const where = [];
  if (filters.teamId) {
    if (!canManageTeam(actor, filters.teamId)) {
      throw new Error("Forbidden");
    }
    where.push(eq(rules.columns.teamId, param(filters.teamId)));
  } else {
    // Everyone in the organization manages its rules (isAdmin, viewer.ts).
    if (!actor.isAdmin) return [];
    where.push(eq(rules.columns.teamId, param(actor.teamId)));
  }
  if (filters.siteId) {
    where.push(eq(rules.columns.siteId, param(filters.siteId)));
  }
  const matching =
    where.length === 0
      ? rules
      : filter(
          rules,
          where.length === 1 ? where[0]! : and(where[0]!, ...where.slice(1)),
        );
  const ordered = sort(matching, [
    { expression: matching.columns.updatedAt, direction: "DESC" },
  ]);
  const rows = await notificationRuleDatabase(env).all(
    compileD1Query(limit(ordered, 200), {
      tag: "notifications.notification_rules.all",
    }),
  );
  return rows.results.map((row) =>
    mapNotificationRule(requireNotificationRuleRow(row)),
  );
}
export async function updateNotificationRule(
  env: Env,
  actor: Actor,
  input: UpdateNotificationRuleInput,
): Promise<NotificationRule> {
  const current = await getNotificationRule(env, input.ruleId);
  if (!current) throw new Error("Not Found");
  const teamId = input.teamId ?? current.teamId;
  const siteId = Object.prototype.hasOwnProperty.call(input, "siteId")
    ? (input.siteId ?? null)
    : current.siteId;
  if (!(await requireCanManageRuleScope(env, actor, { teamId, siteId }))) {
    throw new Error("Forbidden");
  }
  const now = Math.floor(Date.now() / 1000);
  const nextType =
    input.type !== undefined
      ? normalizeNotificationRuleType(input.type)
      : current.type;
  const nextCondition =
    input.condition !== undefined ? input.condition : current.condition;
  const schedule =
    input.schedule !== undefined
      ? normalizeNotificationSchedule(input.schedule)
      : current.schedule;
  const nextRunAt =
    input.schedule !== undefined
      ? computeNextNotificationRunAt(schedule, now)
      : current.nextRunAt;
  const recipient =
    input.recipient !== undefined
      ? normalizeNotificationRecipientConfig(input.recipient)
      : current.recipient;
  const stateShouldReset =
    nextType !== current.type ||
    siteId !== current.siteId ||
    safeJsonStringify(nextCondition) !== safeJsonStringify(current.condition);
  const nextState = stateShouldReset ? {} : current.state;
  const nextCooldownUntil = stateShouldReset ? null : current.cooldownUntil;
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          team_id: teamId,
          site_id: siteId,
          name: clampString((input.name ?? current.name).trim(), 160),
          description: clampString(
            (input.description ?? current.description).trim(),
            1000,
          ),
          type: nextType,
          enabled: (input.enabled ?? current.enabled) ? 1 : 0,
          schedule_json: safeJsonStringify(schedule),
          condition_json: safeJsonStringify(nextCondition),
          recipient_json: safeJsonStringify(recipient),
          state_json: safeJsonStringify(nextState),
          cooldown_until: nextCooldownUntil,
          next_run_at: nextRunAt,
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
  if (
    !(await requireCanManageRuleScope(env, actor, {
      teamId: rule.teamId,
      siteId: rule.siteId,
    }))
  ) {
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
      neq(rules.columns.type, param("test")),
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
  return rows.results.map((row) =>
    mapNotificationRule(requireNotificationRuleRow(row)),
  );
}
export async function advanceNotificationRuleSchedule(
  env: Env,
  input: {
    rule: NotificationRule;
    checkedAt: number;
    triggeredAt?: number | null;
    cooldownUntil?: number | null;
    state?: Record<string, unknown>;
  },
): Promise<void> {
  const nextRunAt = computeNextNotificationRunAt(
    input.rule.schedule,
    input.checkedAt,
  );
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          last_checked_at: input.checkedAt,
          last_triggered_at: coalesce(
            param(input.triggeredAt ?? null),
            columns.last_triggered_at,
          ),
          next_run_at: nextRunAt,
          state_json: safeJsonStringify(input.state ?? input.rule.state),
          cooldown_until: caseWhen(
            [
              {
                when: isNotNull(param(input.cooldownUntil ?? null)),
                then: param(input.cooldownUntil ?? null),
              },
              {
                when: and(
                  isNotNull(columns.cooldown_until),
                  lte(columns.cooldown_until, param(input.checkedAt)),
                ),
                then: param(null),
              },
            ],
            columns.cooldown_until,
          ),
          updated_at: input.checkedAt,
        },
        where: eq(columns.id, param(input.rule.id)),
      })),
      { tag: "notifications.rules.advance_schedule" },
    ),
  );
}

export async function applyNotificationRuleManualRunResult(
  env: Env,
  input: {
    rule: NotificationRule;
    checkedAt: number;
    triggeredAt?: number | null;
    cooldownUntil?: number | null;
    state?: Record<string, unknown>;
  },
): Promise<void> {
  const shouldAdvanceNextRunAt =
    input.rule.nextRunAt === null || input.rule.nextRunAt <= input.checkedAt;
  const nextRunAt = shouldAdvanceNextRunAt
    ? computeNextNotificationRunAt(input.rule.schedule, input.checkedAt)
    : input.rule.nextRunAt;
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          last_checked_at: input.checkedAt,
          last_triggered_at: coalesce(
            param(input.triggeredAt ?? null),
            columns.last_triggered_at,
          ),
          next_run_at: nextRunAt,
          state_json: safeJsonStringify(input.state ?? input.rule.state),
          cooldown_until: caseWhen(
            [
              {
                when: isNotNull(param(input.cooldownUntil ?? null)),
                then: param(input.cooldownUntil ?? null),
              },
              {
                when: and(
                  isNotNull(columns.cooldown_until),
                  lte(columns.cooldown_until, param(input.checkedAt)),
                ),
                then: param(null),
              },
            ],
            columns.cooldown_until,
          ),
          updated_at: input.checkedAt,
        },
        where: eq(columns.id, param(input.rule.id)),
      })),
      { tag: "notifications.rules.apply_manual_run" },
    ),
  );
}
export async function updateNotificationRuleState(
  env: Env,
  input: {
    ruleId: string;
    state: Record<string, unknown>;
    now?: number;
  },
): Promise<void> {
  const now = Math.trunc(input.now ?? Date.now() / 1000);
  await notificationRuleDatabase(env).run(
    compileD1Mutation(
      update(schema.notification_rules, (columns) => ({
        set: {
          state_json: safeJsonStringify(input.state),
          updated_at: now,
        },
        where: eq(columns.id, param(input.ruleId)),
      })),
      { tag: "notifications.rules.update_state" },
    ),
  );
}
export async function resolveNotificationRecipients(
  env: Env,
  rule: NotificationRule,
): Promise<NotificationRecipient[]> {
  // Who may receive it: the gateway's members who can open the app now, so
  // people who left, were deactivated or lost the app get nothing.
  const { members } = await listMembers({
    env,
    for: { background: true, organizationId: rule.teamId },
  });
  const recipient = rule.recipient;
  const audience = members.filter((member) => {
    if (recipient.mode === "creator") return member.id === rule.createdByUserId;
    if (recipient.mode === "users")
      return recipient.userIds.includes(member.id);
    if (recipient.mode === "team_admins") return member.role !== "member";
    return true;
  });
  if (audience.length === 0) return [];

  // Their own settings (preferences, language, time zone), kept from their
  // visits (viewer.ts); someone who never opened the app has the defaults.
  const database = notificationRuleDatabase(env);
  const users = notificationRecipientRows();
  const settings = new Map<string, NotificationRecipientStorageRow>();
  for (let offset = 0; offset < audience.length; offset += 90) {
    const ids = audience.slice(offset, offset + 90).map((member) => member.id);
    const rows = await database.all(
      compileD1Query(filter(users, inList(users.columns.id, ids)), {
        tag: "notifications.users.all",
      }),
    );
    for (const row of rows.results) {
      if (typeof row.id === "string") settings.set(row.id, row);
    }
  }
  return audience.map((member) => {
    const row = settings.get(member.id);
    return {
      id: member.id,
      email: member.email,
      preferencesJson: row?.preferencesJson ?? "{}",
      preferredLocale: row?.preferredLocale ?? null,
      timeZone: row?.timeZone ?? null,
    };
  });
}
