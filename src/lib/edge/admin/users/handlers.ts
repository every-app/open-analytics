import { normalizeTimeZone } from "@/lib/analytics/time-zone";
import {
  compileD1Mutation,
  createD1DatabaseClient,
  eq,
  param,
  schema,
  unixepoch,
  update,
} from "@/lib/db";
import {
  byId,
  listMembers,
  requireActor,
  toPublicUser,
  workspaceFor,
} from "@/lib/edge/admin/auth";
import {
  bad,
  forb,
  jsonResponseFor,
  na,
  parseJson,
} from "@/lib/edge/admin/response";
import type { Env } from "@/lib/edge/types";
import { clampString } from "@/lib/edge/utils";
import { isValidLocale } from "@/lib/i18n/config";

function database(env: Env) {
  return createD1DatabaseClient(env.DB);
}

/** The signed-in person and their organization's workspace. */
export async function handleAuthMeAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  if (req.method !== "GET") return na(req);
  const a = await requireActor(env, req);
  if (a instanceof Response) return a;
  const workspace = await workspaceFor(env, a);
  return jsonResponseFor(req, {
    ok: true,
    data: {
      user: toPublicUser(a.user, a.isAdmin),
      teams: workspace ? [workspace] : [],
    },
  });
}

/**
 * Everyone in the organization who has opened the app, for notification
 * recipients. The gateway owns membership: this list only mirrors it.
 */
export async function handleMembersAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  if (req.method !== "GET") return na(req);
  const a = await requireActor(env, req);
  if (a instanceof Response) return a;
  if (!a.isAdmin) {
    return forb(
      "Only members of the organization can list members",
      undefined,
      req,
    );
  }
  const members = await listMembers(env, a.teamId);
  return jsonResponseFor(req, {
    ok: true,
    data: members.map((member) => ({ teamId: a.teamId, ...member })),
  });
}

/** The person's own settings: display name, time zone and language. */
export async function handleProfileAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  const a = await requireActor(env, req);
  if (a instanceof Response) return a;
  if (req.method === "GET") {
    return jsonResponseFor(req, {
      ok: true,
      data: { user: toPublicUser(a.user, a.isAdmin) },
    });
  }
  if (req.method !== "POST" && req.method !== "PATCH") return na(req);
  const body = await parseJson(req);
  const name = clampString(String(body.name ?? a.user.name ?? ""), 120);
  const rawTimeZone = String(
    body.timeZone ?? body.timezone ?? a.user.timezone ?? "",
  ).trim();
  const timeZone = rawTimeZone ? normalizeTimeZone(rawTimeZone) : "";
  const rawPreferredLocale = Object.prototype.hasOwnProperty.call(
    body,
    "preferredLocale",
  )
    ? String(body.preferredLocale ?? "").trim()
    : a.user.preferred_locale || "";
  const preferredLocale =
    rawPreferredLocale === "" || isValidLocale(rawPreferredLocale)
      ? rawPreferredLocale
      : null;
  if (rawTimeZone && !timeZone) return bad("Invalid timezone", undefined, req);
  if (preferredLocale === null) {
    return bad("Invalid preferred locale", undefined, req);
  }
  await database(env).run(
    compileD1Mutation(
      update(schema.users, (columns) => ({
        set: {
          name,
          timezone: timeZone,
          preferred_locale: preferredLocale,
          updated_at: unixepoch(),
        },
        where: eq(columns.id, param(a.user.id)),
      })),
      { tag: "admin.users.update_profile" },
    ),
  );
  const u = await byId(env, a.user.id);
  if (!u) return bad("Failed to update profile", undefined, req);
  return jsonResponseFor(req, { ok: true, data: toPublicUser(u, a.isAdmin) });
}
