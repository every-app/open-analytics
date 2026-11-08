import "@tanstack/react-start/server-only";

import { cache } from "react";
import { getRequest } from "@tanstack/react-start/server";

import {
  type AccountUserData,
  type SiteData,
  type TeamData,
} from "@/lib/dashboard-api/contract/types";
import {
  type AdminServiceReadMap,
  readAdminService,
} from "@/lib/edge/admin/service/index";
import { readTeamFirstDataAt } from "@/lib/edge/admin/setup/get-started";
import { resolveEdgeRuntime } from "@/lib/edge/runtime";
export { buildSitePath } from "@/lib/dashboard/paths";
export interface SiteWithSlug extends SiteData {
  slug: string;
}
/** The organization's workspace, its sites and the signed-in person. */
export interface DashboardTeamContext {
  user: AccountUserData;
  activeTeam: TeamData;
  sites: SiteWithSlug[];
  /** The first page view of any of its sites, or null before one; All time on All sites starts there. */
  firstDataAt: number | null;
  unreadAttentionCount: number;
  /** The Every App gateway's home, for leaving the app. */
  gatewayUrl: string;
}
function safeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function getSiteSlug(site: SiteData): string {
  const domain = String(site.domain || "").trim();
  const candidate = safeSlug(domain);
  if (candidate.length > 0) return candidate;
  return site.id.slice(0, 8);
}
function withSiteSlug(site: SiteData): SiteWithSlug {
  return {
    ...site,
    slug: getSiteSlug(site),
  };
}
const getMe = cache(() => readAdmin("session"));
const getUnreadAttentionCount = cache(async (): Promise<number> => {
  const notifications = await readDashboardAdmin("notifications", {
    limit: 1,
  });
  return notifications?.unreadAttentionCount ?? 0;
});
const getAdminRuntime = cache(async () => {
  const runtime = await resolveEdgeRuntime(getRequest());
  return {
    request: runtime.request,
    env: runtime.env,
    url: runtime.url,
  };
});
/**
 * Null when the admin service refuses the read (no identity, no access). A
 * read that fails, such as D1 being overloaded, throws.
 */
async function readAdmin<K extends keyof AdminServiceReadMap>(
  route: K,
  params?: Record<string, string | number>,
): Promise<AdminServiceReadMap[K] | null> {
  const runtime = await getAdminRuntime();
  const url = new URL(runtime.url);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return readAdminService({
    route,
    request: runtime.request,
    env: runtime.env,
    url,
  });
}
/**
 * Server-only typed reads shared by route-level SSR loaders: null on any
 * failure, and the page then loads its data in the browser.
 */
export async function readDashboardAdmin<K extends keyof AdminServiceReadMap>(
  route: K,
  params?: Record<string, string | number>,
): Promise<AdminServiceReadMap[K] | null> {
  try {
    return await readAdmin(route, params);
  } catch {
    return null;
  }
}
/** Throws when the read fails, rather than showing an empty workspace. */
export const getDashboardTeamSites = cache(
  async (teamId: string): Promise<SiteWithSlug[]> => {
    const sites = await readAdmin("sites", { teamId });
    if (!sites) return [];
    return sites.map(withSiteSlug);
  },
);
/**
 * Null without a signed-in person (a share page, or no identity). A failed
 * read throws: a cached null would show "page not found" until reload.
 */
export const getDashboardTeamContext = cache(
  async (): Promise<DashboardTeamContext | null> => {
    const me = await getMe();
    const activeTeam = me?.teams[0];
    if (!me || !activeTeam) return null;

    const runtime = await getAdminRuntime();
    const [sites, firstDataAt, unreadAttentionCount] = await Promise.all([
      getDashboardTeamSites(activeTeam.id),
      readTeamFirstDataAt(runtime.env, activeTeam.id),
      getUnreadAttentionCount(),
    ]);

    return {
      user: me.user,
      activeTeam,
      sites,
      firstDataAt,
      unreadAttentionCount,
      gatewayUrl: runtime.env.GATEWAY_URL || "/",
    };
  },
);
