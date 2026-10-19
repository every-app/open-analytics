import { PERSISTENT_VERTICAL_SCROLLBAR_OPTIONS } from "@insightflare/ui/overlay-scrollbar";
import {
  RiBarChartBoxLine,
  RiCalendarScheduleLine,
  RiGlobalLine,
  RiLinksLine,
  RiNotification3Line,
  RiRobot2Line,
  RiSettings3Line,
  RiSpeedUpLine,
  RiTeamLine,
  RiWindow2Line,
} from "@remixicon/react";

import { type SiteData } from "@/lib/dashboard-api/client/edge";
import type { AppMessages } from "@/lib/i18n/messages";
export interface TeamSectionNavItem {
  key: string;
  label: string;
  href: string;
}
export interface SidebarSite {
  id: string;
  slug: string;
  name: string;
  domain: string;
  iconPath?: string;
}
export type AnalyticsNavKey =
  | "overview"
  | "realtime"
  | "pages"
  | "referrers"
  | "sessions"
  | "campaigns"
  | "events"
  | "funnels"
  | "goals"
  | "visitors"
  | "retention"
  | "geo"
  | "devices"
  | "browsers"
  | "performance"
  | "settings"
  | "request-overview"
  | "request-abnormal"
  | "request-normal";
export const VALID_ANALYTICS_SECTIONS = new Set([
  "realtime",
  "pages",
  "referrers",
  "sessions",
  "events",
  "visitors",
  "geo",
  "devices",
  "browsers",
  "performance",
  "settings",
  "campaigns",
  "funnels",
  "goals",
  "retention",
]);
export const DASHBOARD_SCROLLBAR_OPTIONS =
  PERSISTENT_VERTICAL_SCROLLBAR_OPTIONS;
export const SIDEBAR_COLLAPSE_SECTION_CLASS =
  "max-h-20 overflow-hidden transition-[max-height,opacity,transform,padding,margin] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:max-h-0 group-data-[collapsible=icon]:-translate-y-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:opacity-0";
export const SIDEBAR_COLLAPSE_SEPARATOR_CLASS =
  "transition-[opacity,margin] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none group-data-[collapsible=icon]:my-0 group-data-[collapsible=icon]:opacity-0";
export const SIDEBAR_COLLAPSE_MARGIN_CLASS =
  "transition-[margin] duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none group-data-[collapsible=icon]:mb-0";
export function analyticsTabLabel(
  item: {
    key: AnalyticsNavKey;
    label?: string;
  },
  messages: AppMessages,
): string {
  if (item.label) return item.label;
  return messages.navigation[item.key as keyof typeof messages.navigation];
}
export interface SidebarRouteState {
  mode: "team" | "site";
  activeTeamSectionKey?: string;
  activeManagementSectionKey?: string;
  activeSiteSlug?: string;
  /** Within a site: the analytics section, and a detail sub-page. */
  siteSection?: string;
  siteSubSection?: string;
}
export function getTeamSectionIcon(key: string) {
  if (key === "sites") return RiBarChartBoxLine;
  if (key === "site-management") return RiWindow2Line;
  if (key === "notifications") return RiNotification3Line;
  if (key === "public-links") return RiLinksLine;
  return RiGlobalLine;
}
export function getManagementSectionIcon(key: string) {
  if (key === "scheduled-tasks") return RiCalendarScheduleLine;
  if (key === "request-observation") return RiRobot2Line;
  if (key === "system-settings") return RiSettings3Line;
  if (key === "system-performance") return RiSpeedUpLine;
  return RiTeamLine;
}
export function normalizeLocalePath(pathname: string): string {
  const cleaned = pathname || "";
  if (cleaned.length === 0) return "/app";
  const withoutLocale =
    cleaned.replace(/^\/(en|zh-tw|zh|ja)(?=\/|$)/, "") || "/app";
  if (withoutLocale === "/") return "/app";
  return withoutLocale.endsWith("/")
    ? withoutLocale.slice(0, -1)
    : withoutLocale;
}
export function safeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function getSidebarSiteSlug(
  site: Pick<SiteData, "id" | "domain">,
): string {
  const candidate = safeSlug(String(site.domain || ""));
  if (candidate.length > 0) return candidate;
  return site.id.slice(0, 8);
}
export function toSidebarSite(site: SiteData): SidebarSite {
  return {
    id: site.id,
    slug: getSidebarSiteSlug(site),
    name: site.name,
    domain: site.domain,
    iconPath: site.iconPath,
  };
}

/**
 * Where the sidebar is, from the path: one of the organization's pages
 * (`/app`, `/app/sites`, `/app/notifications`, `/app/manage/...`), or a site
 * (`/app/sites/<slug>/<section>`).
 */
export function parseSidebarRouteState(pathname: string): SidebarRouteState {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const appIndex = segments.findIndex((segment) => segment === "app");
  const local = appIndex >= 0 ? segments.slice(appIndex + 1) : [];

  if (local[0] === "sites" && local[1]) {
    return {
      mode: "site",
      activeSiteSlug: local[1],
      siteSection: local[2] || "",
      siteSubSection: local[3] || "",
    };
  }
  if (local.length === 0)
    return { mode: "team", activeTeamSectionKey: "sites" };
  if (local[0] === "sites") {
    return { mode: "team", activeTeamSectionKey: "site-management" };
  }
  if (local[0] === "notifications" || local[0] === "public-links") {
    return { mode: "team", activeTeamSectionKey: local[0] };
  }
  if (local[0] === "manage") {
    return { mode: "team", activeManagementSectionKey: local[1] };
  }
  return { mode: "team" };
}
