import { useCallback } from "react";
import {
  ActivityIcon,
  ChartColumnIcon,
  FileTextIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ListFilterIcon,
  type LucideIcon,
  MapPinIcon,
  MegaphoneIcon,
  MonitorIcon,
  MonitorSmartphoneIcon,
  RepeatIcon,
  SettingsIcon,
  ShareIcon,
  TargetIcon,
  UserRoundIcon,
  ZapIcon,
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

interface SiteNavGroup {
  label: keyof AppMessages["appNav"];
  items: readonly SiteNavKey[];
}

/** The sidebar's groups of a site's pages, in order. */
export const SITE_NAV_GROUPS: readonly SiteNavGroup[] = [
  {
    label: "traffic",
    items: ["overview", "realtime", "pages", "referrers", "campaigns"],
  },
  {
    label: "audience",
    items: ["sessions", "visitors", "retention", "geo", "devices", "browsers"],
  },
  { label: "conversions", items: ["events", "funnels", "goals"] },
  { label: "site", items: ["performance", "settings"] },
];

const SITE_NAV_ICONS: Record<SiteNavKey, LucideIcon> = {
  overview: LayoutDashboardIcon,
  realtime: ActivityIcon,
  pages: FileTextIcon,
  referrers: ShareIcon,
  campaigns: MegaphoneIcon,
  sessions: ChartColumnIcon,
  visitors: UserRoundIcon,
  retention: RepeatIcon,
  geo: MapPinIcon,
  devices: MonitorSmartphoneIcon,
  browsers: MonitorIcon,
  events: ZapIcon,
  funnels: ListFilterIcon,
  goals: TargetIcon,
  performance: GaugeIcon,
  settings: SettingsIcon,
};

export function siteNavIcon(key: SiteNavKey): LucideIcon {
  return SITE_NAV_ICONS[key];
}

export function siteNavLabel(key: SiteNavKey, messages: AppMessages): string {
  return messages.navigation[key];
}

const SITE_NAV_KEYS = new Set<string>(
  SITE_NAV_GROUPS.flatMap((group) => group.items),
);

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
