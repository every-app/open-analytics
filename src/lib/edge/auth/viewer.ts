import { getEveryAppUser } from "@every-app/sdk/server";

import {
  compileD1Mutation,
  createD1DatabaseClient,
  insert,
  insertOrIgnore,
  onConflictDoUpdate,
  schema,
  unixepoch,
} from "@/lib/db";
import type { Env } from "@/lib/edge/types";

/** The gateway's organization roles. Owners and admins manage the app. */
export type OrgRole = "owner" | "admin" | "member";

/**
 * The signed-in person, from the identity the Every App gateway signs onto
 * every request. The organization is the tenant: `teamId` is the gateway's
 * organization id, and it keys the organization's workspace row (`teams`)
 * that every site belongs to.
 */
export interface Viewer {
  userId: string;
  email: string;
  teamId: string;
  role: OrgRole;
  /** Owners and admins: manage sites, notifications and settings. */
  isAdmin: boolean;
}

export function toOrgRole(value: unknown): OrgRole {
  const role = String(value ?? "").toLowerCase();
  if (role === "owner" || role === "admin") return role;
  return "member";
}

// What this isolate last wrote for each person, so steady traffic doesn't
// write the mirror on every request. Bounded by the organization's members.
const MIRROR_REFRESH_MS = 60 * 60 * 1000;
const mirrored = new Map<string, { key: string; at: number }>();
const viewers = new WeakMap<Request, Promise<Viewer | null>>();

/**
 * Mirrors the person, their organization's workspace and their membership in
 * it, so rows that name them (notifications, saved filters, rules) can join
 * on them. Access always comes from the signed identity, never from the
 * mirror: someone the gateway removes can't reach the app again.
 */
async function mirror(env: Env, viewer: Viewer): Promise<void> {
  const key = `${viewer.email}|${viewer.role}|${viewer.teamId}`;
  const last = mirrored.get(viewer.userId);
  if (last?.key === key && Date.now() - last.at < MIRROR_REFRESH_MS) return;
  const db = createD1DatabaseClient(env.DB);
  await db.batch([
    compileD1Mutation(
      insertOrIgnore(schema.teams, {
        id: viewer.teamId,
        name: viewer.teamId,
        slug: viewer.teamId,
        created_at: unixepoch(),
        updated_at: unixepoch(),
      }),
      { tag: "viewer.teams.ensure" },
    ),
    compileD1Mutation(
      onConflictDoUpdate(
        insert(schema.users, {
          id: viewer.userId,
          email: viewer.email,
          created_at: unixepoch(),
          updated_at: unixepoch(),
        }),
        ["id"],
        { email: viewer.email },
      ),
      { tag: "viewer.users.mirror" },
    ),
    compileD1Mutation(
      onConflictDoUpdate(
        insert(schema.members, {
          team_id: viewer.teamId,
          user_id: viewer.userId,
          role: viewer.role,
          last_seen_at: unixepoch(),
        }),
        ["team_id", "user_id"],
        { role: viewer.role, last_seen_at: unixepoch() },
      ),
      { tag: "viewer.members.mirror" },
    ),
  ]);
  mirrored.set(viewer.userId, { key, at: Date.now() });
}

async function loadViewer(request: Request, env: Env): Promise<Viewer | null> {
  let user;
  try {
    user = await getEveryAppUser(request, env);
  } catch {
    return null;
  }
  if (!user) return null;
  // A deployment pinned to one organization serves no other (`everyapp dev`
  // pins none).
  if (env.EVERY_APP_ORG_ID && user.orgId !== env.EVERY_APP_ORG_ID) return null;
  const role = toOrgRole(user.orgRole);
  const viewer: Viewer = {
    userId: user.id,
    email: user.email,
    teamId: user.orgId,
    role,
    isAdmin: role === "owner" || role === "admin",
  };
  await mirror(env, viewer);
  return viewer;
}

/** The signed-in person, or null on a public route or without an identity. */
export function resolveViewer(
  request: Request,
  env: Env,
): Promise<Viewer | null> {
  let viewer = viewers.get(request);
  if (!viewer) {
    viewer = loadViewer(request, env);
    viewers.set(request, viewer);
  }
  return viewer;
}
