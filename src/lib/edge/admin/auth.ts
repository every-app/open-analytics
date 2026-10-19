import {
  aggregate,
  coalesce,
  compileD1Query,
  count,
  createD1DatabaseClient,
  eq,
  filter,
  limit,
  param,
  project,
  scalar,
  scan,
  schema,
} from "@/lib/db";
import { type OrgRole, resolveViewer, toOrgRole } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";
import { isValidLocale } from "@/lib/i18n/config";
import { una } from "@/lib/response";

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  org_role: string;
  last_seen_at: number;
  timezone: string;
  preferred_locale?: string | null;
  created_at: number;
  updated_at: number;
};

/**
 * The person behind an admin request: their mirrored row, their
 * organization's workspace (`teamId`) and their gateway role.
 */
export type Actor = {
  user: UserRow;
  teamId: string;
  role: OrgRole;
  isAdmin: boolean;
};

function database(env: Env) {
  return createD1DatabaseClient(env.DB);
}

function userQuery() {
  const users = scan(schema.users);
  return project(users, {
    id: users.columns.id,
    email: users.columns.email,
    name: users.columns.name,
    org_role: users.columns.org_role,
    last_seen_at: users.columns.last_seen_at,
    timezone: users.columns.timezone,
    preferred_locale: users.columns.preferred_locale,
    created_at: users.columns.created_at,
    updated_at: users.columns.updated_at,
  });
}

/** The role the gateway gave the person when they last opened the app. */
export function toOrgRoleOf(user: Pick<UserRow, "org_role">): OrgRole {
  return toOrgRole(user.org_role);
}

/** The name people see: the one they set, or their email. */
export function displayNameFor(user: Pick<UserRow, "name" | "email">): string {
  return user.name?.trim() || user.email;
}

export const toPublicUser = (u: UserRow, role: OrgRole) => ({
  id: u.id,
  email: u.email,
  name: u.name || "",
  systemRole: role === "member" ? ("user" as const) : ("admin" as const),
  timeZone: u.timezone || "",
  preferredLocale: isValidLocale(u.preferred_locale) ? u.preferred_locale : "",
  createdAt: u.created_at,
  updatedAt: u.updated_at,
});

export async function byId(env: Env, id: string): Promise<UserRow | null> {
  const users = userQuery();
  const matching = filter(users, eq(users.columns.id, param(id)));
  const row = await database(env).first(
    compileD1Query(limit(matching, 1), { tag: "admin.users.first" }),
  );
  if (!row || row.id === null) return null;
  return { ...row, id: row.id };
}

/** Everyone who has opened the app, for recipient pickers. */
export async function listUsers(env: Env): Promise<UserRow[]> {
  const rows = await database(env).all(
    compileD1Query(userQuery(), { tag: "admin.users.all" }),
  );
  return rows.results
    .filter((row) => row.id !== null)
    .map((row) => ({ ...row, id: row.id as string }));
}

export async function requireActor(
  env: Env,
  req: Request,
): Promise<Actor | Response> {
  const viewer = await resolveViewer(req, env);
  if (!viewer) return una();
  const user = await byId(env, viewer.userId);
  if (!user) return una("User not found");
  return {
    user,
    teamId: viewer.teamId,
    role: viewer.role,
    isAdmin: viewer.isAdmin,
  };
}

/** The organization's workspace, as the dashboard shell shows it. */
export async function workspaceFor(env: Env, actor: Actor) {
  const teams = scan(schema.teams);
  const matching = filter(teams, eq(teams.columns.id, param(actor.teamId)));
  const sites = scan(schema.sites);
  const teamSites = filter(
    sites,
    eq(sites.columns.team_id, param(actor.teamId)),
  );
  const siteCount = coalesce(
    scalar(
      aggregate(teamSites, { groupBy: {}, aggregates: { count: count() } }),
    ),
    param(0),
  );
  const row = await database(env).first(
    compileD1Query(
      limit(
        project(matching, {
          id: matching.columns.id,
          name: matching.columns.name,
          slug: matching.columns.slug,
          createdAt: matching.columns.created_at,
          updatedAt: matching.columns.updated_at,
          siteCount,
        }),
        1,
      ),
      { tag: "admin.teams.workspace" },
    ),
  );
  if (!row || row.id === null) return null;
  return { ...row, id: row.id, membershipRole: actor.role };
}
