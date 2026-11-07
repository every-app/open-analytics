import { canReadTeam } from "@/lib/edge/admin/access";
import { requireActor } from "@/lib/edge/admin/auth";
import {
  bad,
  forb,
  jsonResponseFor,
  na,
  nf,
  parseJson,
} from "@/lib/edge/admin/response";
import type { Env } from "@/lib/edge/types";
import {
  countUnreadAttentionMessages,
  listNotificationMessagesForUser,
  markAllNotificationMessagesRead,
  markNotificationMessageRead,
} from "@/lib/notifications/edge/message-store";
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from "@/lib/notifications/edge/preferences";
import {
  createNotificationRule,
  deleteNotificationRule,
  listNotificationRules,
  updateNotificationRule,
  type UpdateNotificationRuleInput,
} from "@/lib/notifications/edge/rule-store";
import {
  InvalidNotificationRuleError,
  parseNotificationRuleConfig,
} from "@/lib/notifications/rules";
function stringParam(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function hasOwn(input: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}
function parseLimit(url: URL): number {
  const raw = Math.trunc(Number(url.searchParams.get("limit") ?? 50));
  if (!Number.isFinite(raw)) return 50;
  return Math.max(1, Math.min(100, raw));
}
function mapError(error: unknown, req: Request): Response {
  if (error instanceof InvalidNotificationRuleError) {
    return bad(error.message, undefined, req);
  }
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Forbidden") return forb("Forbidden", undefined, req);
  if (message === "Not Found") return nf("Not Found", undefined, req);
  return bad(message || "Invalid notification request", undefined, req);
}
export async function handleNotificationRulesAdmin(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;

  try {
    if (req.method === "GET") {
      const teamId = url.searchParams.get("teamId")?.trim() || undefined;
      const siteId = url.searchParams.get("siteId")?.trim() || undefined;
      const rules = await listNotificationRules(env, actor, { teamId, siteId });
      return jsonResponseFor(req, { ok: true, data: rules });
    }

    if (req.method === "POST") {
      const body = await parseJson(req);
      const teamId = stringParam(body.teamId);
      const siteId = stringParam(body.siteId);
      if (!teamId) return bad("teamId is required", undefined, req);
      if (!siteId) return bad("siteId is required", undefined, req);
      const rule = await createNotificationRule(env, actor, {
        teamId,
        siteId,
        name: stringParam(body.name),
        enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
        config: parseNotificationRuleConfig(body),
      });
      return jsonResponseFor(req, { ok: true, data: rule });
    }

    if (req.method === "PATCH") {
      const body = await parseJson(req);
      const ruleId = stringParam(body.ruleId);
      if (!ruleId) return bad("ruleId is required", undefined, req);
      const input: UpdateNotificationRuleInput = { ruleId };
      if (hasOwn(body, "siteId")) {
        const siteId = stringParam(body.siteId);
        if (!siteId) return bad("siteId is required", undefined, req);
        input.siteId = siteId;
      }
      if (hasOwn(body, "name")) input.name = stringParam(body.name);
      if (typeof body.enabled === "boolean") input.enabled = body.enabled;
      // A rule's type, schedule and condition change together.
      if (hasOwn(body, "type")) {
        input.config = parseNotificationRuleConfig(body);
      }
      const rule = await updateNotificationRule(env, actor, input);
      return jsonResponseFor(req, { ok: true, data: rule });
    }

    if (req.method === "DELETE") {
      const ruleId = url.searchParams.get("id")?.trim() || "";
      if (!ruleId) return bad("id is required", undefined, req);
      const removed = await deleteNotificationRule(env, actor, ruleId);
      return jsonResponseFor(req, { ok: true, data: { id: ruleId, removed } });
    }
  } catch (error) {
    return mapError(error, req);
  }
  return na(req);
}
export async function handleNotifications(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (req.method !== "GET") return na(req);

  const requestedUserId = url.searchParams.get("userId")?.trim() || "";
  const teamId = url.searchParams.get("teamId")?.trim() || "";
  const siteId = url.searchParams.get("siteId")?.trim() || "";
  const ruleId = url.searchParams.get("ruleId")?.trim() || "";
  const type = url.searchParams.get("type")?.trim() || "";
  const severity = url.searchParams.get("severity")?.trim() || "";
  const unread = url.searchParams.get("unread") === "1";
  const beforeRaw = Math.trunc(Number(url.searchParams.get("before") ?? 0));
  const before =
    Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;
  const limit = parseLimit(url);

  // The inbox is personal: each member reads their own, never another's,
  // and only within their organization (everyone manages the organization,
  // so a manager check would not separate the two).
  if (teamId && !canReadTeam(actor, teamId)) {
    return forb("Forbidden", undefined, req);
  }
  if (requestedUserId && requestedUserId !== actor.user.id) {
    return forb("You can only read your own notifications", undefined, req);
  }
  try {
    const messages = await listNotificationMessagesForUser(env, {
      userId: actor.user.id,
      teamId: teamId || undefined,
      siteId: siteId || undefined,
      ruleId: ruleId || undefined,
      type: type || undefined,
      severity: severity || undefined,
      unread,
      limit,
      before,
    });
    return jsonResponseFor(req, {
      ok: true,
      data: {
        messages,
        unreadAttentionCount: await countUnreadAttentionMessages(
          env,
          actor.user.id,
        ),
      },
    });
  } catch (error) {
    return mapError(error, req);
  }
}
export async function handleNotificationPreferences(
  req: Request,
  env: Env,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (req.method === "GET") {
    const preferences = await getUserNotificationPreferences(
      env,
      actor.user.id,
    );
    return jsonResponseFor(req, { ok: true, data: preferences });
  }
  if (req.method !== "PATCH") return na(req);
  const preferences = await updateUserNotificationPreferences(env, {
    userId: actor.user.id,
    preferences: await parseJson(req),
  });
  return jsonResponseFor(req, { ok: true, data: preferences });
}
export async function handleNotificationRead(
  req: Request,
  env: Env,
  messageId: string,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (req.method !== "PATCH") return na(req);
  if (!messageId) return bad("messageId is required", undefined, req);
  const message = await markNotificationMessageRead(env, {
    messageId,
    userId: actor.user.id,
  });
  return jsonResponseFor(req, { ok: true, data: message });
}
export async function handleNotificationsReadAll(
  req: Request,
  env: Env,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (req.method !== "PATCH") return na(req);
  const body = await parseJson(req);
  const teamId = stringParam(body.teamId) || undefined;
  const updated = await markAllNotificationMessagesRead(env, {
    userId: actor.user.id,
    teamId,
  });
  return jsonResponseFor(req, { ok: true, data: { updated } });
}
