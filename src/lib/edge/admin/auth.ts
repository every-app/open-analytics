import {
  aggregate,
  coalesce,
  compileD1Query,
  count,
  createD1DatabaseClient,
  eq,
  filter,
  join,
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
    timezone: users.columns.timezone,
    preferred_locale: users.columns.preferred_locale,
    created_at: users.columns.created_at,
    updated_at: users.columns.updated_at,
  });
}

/** The name people see: the one they set, or their email. */
export function displayNameFor(user: Pick<UserRow, "name" | "email">): string {
  return user.name?.trim() || user.email;
}

export const toPublicUser = (u: UserRow, isAdmin: boolean) => ({
  id: u.id,
  email: u.email,
  name: u.name || "",
  systemRole: isAdmin ? ("admin" as const) : ("user" as const),
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

export interface MemberRow {
  userId: string;
  email: string;
  name: string | null;
  role: OrgRole;
  lastSeenAt: number;
}

/** Everyone in the organization who has opened the app, for recipient pickers. */
export async function listMembers(
  env: Env,
  teamId: string,
): Promise<MemberRow[]> {
  const members = scan(schema.members);
  const users = scan(schema.users);
  const joined = join(
    members,
    users,
    eq(members.columns.user_id, users.columns.id),
  );
  const matching = filter(
    joined,
    eq(joined.columns.left_team_id, param(teamId)),
  );
  const rows = await database(env).all(
    compileD1Query(
      project(matching, {
        userId: matching.columns.left_user_id,
        email: matching.columns.right_email,
        name: matching.columns.right_name,
        role: matching.columns.left_role,
        lastSeenAt: matching.columns.left_last_seen_at,
      }),
      { tag: "admin.members.all" },
    ),
  );
  return rows.results.map((row) => ({
    ...row,
    email: row.email ?? "",
    role: toOrgRole(row.role),
  }));
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
