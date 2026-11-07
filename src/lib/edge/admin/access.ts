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
import { forb } from "@/lib/response";

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

// Everyone in the organization reads its workspace, the one per
// organization; its owners and admins manage it (`isAdmin`, viewer.ts).

/** What the API answers (403) someone who reads but doesn't manage. */
export enum ManagerOnly {
  Sites = "Only the organization's owners and admins can add, change, share or delete sites.",
  TrackingSettings = "Only the organization's owners and admins can change a site's tracking settings.",
  Goals = "Only the organization's owners and admins can create, change or delete goals.",
  Funnels = "Only the organization's owners and admins can create, change or delete funnels.",
  Retention = "Only the organization's owners and admins can see or change data retention.",
  GetStarted = "Only the organization's owners and admins set up sites.",
  Members = "Only the organization's owners and admins can list members.",
}

/** The 403 for a change only owners and admins make. */
export function managerOnly(message: ManagerOnly, req: Request): Response {
  return forb(message, "owner_or_admin_required", req);
}

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
