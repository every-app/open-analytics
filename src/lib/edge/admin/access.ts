import {
  compileD1Query,
  createD1DatabaseClient,
  eq,
  filter,
  limit,
  param,
  project,
  scan,
  schema,
} from "@/lib/db";
import type { Actor } from "@/lib/edge/admin/auth";
import type { Env } from "@/lib/edge/types";

function database(env: Pick<Env, "DB">) {
  return createD1DatabaseClient(env.DB);
}

export const toSlug = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

async function siteTeam(env: Env, siteId: string): Promise<string | null> {
  const sites = scan(schema.sites);
  const matching = filter(sites, eq(sites.columns.id, param(siteId)));
  const query = compileD1Query(
    limit(project(matching, { team_id: matching.columns.team_id }), 1),
    { tag: "admin.sites.first" },
  );
  const row = await database(env).first(query);
  return row?.team_id ?? null;
}

// Everyone in the organization reads its workspace; owners and admins manage
// it. There is one workspace per organization (viewer.ts).

export function canReadTeam(a: Actor, teamId: string): boolean {
  return a.teamId === teamId;
}

export function canManageTeam(a: Actor, teamId: string): boolean {
  return a.isAdmin && a.teamId === teamId;
}

export async function canReadSite(
  env: Env,
  a: Actor,
  siteId: string,
): Promise<boolean> {
  return (await siteTeam(env, siteId)) === a.teamId;
}

export async function canManageSite(
  env: Env,
  a: Actor,
  siteId: string,
): Promise<boolean> {
  return a.isAdmin && (await canReadSite(env, a, siteId));
}
