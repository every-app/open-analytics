import { useCallback } from "react";
import {
  ActivityIcon,
  FileTextIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  MonitorSmartphoneIcon,
  ShareIcon,
  TargetIcon,
  UserRoundIcon,
} from "lucide-react";

import { useLiveSearchParams } from "@/lib/dashboard/client/history";
import { serializeDashboardSearchParams } from "@/lib/dashboard/filter-state";
import type { AppMessages } from "@/lib/i18n/messages";

export interface SidebarSite {
  id: string;
  slug: string;
  name: string;
  domain: string;
  iconPath?: string;
}

/** A site's report pages, by the key their path ends in ("" for Overview). */
export type SiteNavKey =
  | "overview"
  | "realtime"
  | "pages"
  | "referrers"
  | "campaigns"
  | "sessions"
  | "visitors"
  | "retention"
  | "geo"
  | "devices"
  | "browsers"
  | "events"
  | "funnels"
  | "goals"
  | "performance"
  | "settings";

/**
 * The sidebar's entries for a site, in order. An entry with several pages
 * links to its first and shows the rest as tabs above the page.
 */
export const SITE_NAV_ITEMS = [
  { key: "overview", sections: ["overview"] },
  { key: "realtime", sections: ["realtime"] },
  { key: "pages", sections: ["pages"] },
  { key: "sources", sections: ["referrers", "campaigns"] },
  { key: "audience", sections: ["visitors", "sessions", "retention", "geo"] },
  { key: "devices", sections: ["devices", "browsers"] },
  { key: "conversions", sections: ["events", "funnels", "goals"] },
  { key: "performance", sections: ["performance"] },
] as const satisfies readonly {
  key: string;
  sections: readonly SiteNavKey[];
}[];

export type SiteNavItem = (typeof SITE_NAV_ITEMS)[number];

const SITE_NAV_ITEM_ICONS: Record<SiteNavItem["key"], LucideIcon> = {
  overview: LayoutDashboardIcon,
  realtime: ActivityIcon,
  pages: FileTextIcon,
  sources: ShareIcon,
  audience: UserRoundIcon,
  devices: MonitorSmartphoneIcon,
  conversions: TargetIcon,
  performance: GaugeIcon,
};

export function siteNavItemIcon(item: SiteNavItem): LucideIcon {
  return SITE_NAV_ITEM_ICONS[item.key];
}

/** A single-page entry is named after its page; a group after the group. */
export function siteNavItemLabel(
  item: SiteNavItem,
  messages: AppMessages,
): string {
  if (item.key === "sources") return messages.appNav.sources;
  if (item.key === "audience") return messages.appNav.audience;
  if (item.key === "conversions") return messages.appNav.conversions;
  return messages.navigation[item.key];
}

/** The sidebar entry a site page belongs to. */
export function siteNavItemFor(section: SiteNavKey): SiteNavItem | undefined {
  return SITE_NAV_ITEMS.find((item) =>
    (item.sections as readonly SiteNavKey[]).includes(section),
  );
}

export function siteNavLabel(key: SiteNavKey, messages: AppMessages): string {
  return messages.navigation[key];
}

const SITE_NAV_KEYS = new Set<string>([
  ...SITE_NAV_ITEMS.flatMap((item) => item.sections),
  "settings",
]);

export function isSiteNavKey(value: string): value is SiteNavKey {
  return SITE_NAV_KEYS.has(value);
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

export interface ShellRouteState {
  /** The site in the path, when on one of its pages. */
  siteSlug?: string;
  /** The site page ("overview" at the site's root) and a detail sub-page. */
  siteSection?: SiteNavKey;
  siteSubSection?: string;
  /** The organization's page otherwise: all sites, the inbox or settings. */
  orgPage?: "all-sites" | "inbox" | "settings";
  /** The page reads the range and filters, so the shell shows their controls. */
  usesDateRange: boolean;
}

// Settings pages that chart a period: the sites list, task runs and the
// Worker's performance (and their addresses before they moved to Settings).
const DATE_RANGE_SETTINGS = new Set([
  "sites",
  "scheduled-tasks",
  "performance",
  "system-performance",
]);

/** Where the shell is, from the path. */
export function parseShellRouteState(pathname: string): ShellRouteState {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  const appIndex = segments.indexOf("app");
  const local = appIndex >= 0 ? segments.slice(appIndex + 1) : [];

  if (local[0] === "sites" && local[1]) {
    const section = local[2] || "overview";
    return {
      siteSlug: local[1],
      siteSection: isSiteNavKey(section) ? section : undefined,
      siteSubSection: local[3] || "",
      usesDateRange: section !== "settings",
    };
  }
  if (local.length === 0) return { orgPage: "all-sites", usesDateRange: true };
  if (local[0] === "inbox") return { orgPage: "inbox", usesDateRange: false };
  if (local[0] === "settings" || local[0] === "manage") {
    return {
      orgPage: "settings",
      usesDateRange: DATE_RANGE_SETTINGS.has(local[1] ?? ""),
    };
  }
  // The organization's other pages all live under Settings.
  return { orgPage: "settings", usesDateRange: local[0] === "sites" };
}

/**
 * Moving between report pages keeps what the page is looking at: its range,
 * interval, time zone, comparison and filters.
 */
function dashboardNavigationParams(
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (
      key.startsWith("filter[") ||
      key === "compare" ||
      key.startsWith("compareFilter[") ||
      key === "range" ||
      key === "interval" ||
      key === "timeZone" ||
      key === "scope"
    ) {
      next.append(key, value);
    }
  }
  return next;
}

/** Builds report links that carry the current range and filters along. */
export function useDashboardNavHref(): (path: string) => string {
  const searchParams = useLiveSearchParams();
  return useCallback(
    (path: string) => {
      const query = serializeDashboardSearchParams(
        dashboardNavigationParams(searchParams),
      );
      return query ? `${path}?${query}` : path;
    },
    [searchParams],
  );
}
