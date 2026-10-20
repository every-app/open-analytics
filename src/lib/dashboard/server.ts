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
const getMe = cache(async () => {
  try {
    return await readAdmin("session");
  } catch {
    return null;
  }
});
const getUnreadAttentionCount = cache(async (): Promise<number> => {
  const notifications = await readAdmin("notifications", { limit: 1 });
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
async function readAdmin<K extends keyof AdminServiceReadMap>(
  route: K,
  params?: Record<string, string | number>,
): Promise<AdminServiceReadMap[K] | null> {
  try {
    const runtime = await getAdminRuntime();
    const url = new URL(runtime.url);
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    const result = await readAdminService({
      route,
      request: runtime.request,
      env: runtime.env,
      url,
    });
    return result;
  } catch {
    return null;
  }
}
/** Server-only typed reads shared by route-level SSR loaders. */
export async function readDashboardAdmin<K extends keyof AdminServiceReadMap>(
  route: K,
  params?: Record<string, string | number>,
): Promise<AdminServiceReadMap[K] | null> {
  return readAdmin(route, params);
}
export const getDashboardProfile = cache(async () => {
  return getMe();
});
export const getDashboardTeamSites = cache(
  async (teamId: string): Promise<SiteWithSlug[]> => {
    try {
      const sites = await readAdmin("sites", { teamId });
      if (!sites) return [];
      return sites.map(withSiteSlug);
    } catch {
      return [];
    }
  },
);
/** Null without a signed-in person (a share page, or no identity). */
export const getDashboardTeamContext = cache(
  async (): Promise<DashboardTeamContext | null> => {
    const me = await getMe();
    const activeTeam = me?.teams[0];
    if (!me || !activeTeam) return null;

    const [sites, unreadAttentionCount, runtime] = await Promise.all([
      getDashboardTeamSites(activeTeam.id),
      getUnreadAttentionCount(),
      getAdminRuntime(),
    ]);

    return {
      user: me.user,
      activeTeam,
      sites,
      unreadAttentionCount,
      gatewayUrl: runtime.env.GATEWAY_URL || "/",
    };
  },
);
