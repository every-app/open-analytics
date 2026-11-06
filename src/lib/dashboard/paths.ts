export type SiteSection =
  | "realtime"
  | "pages"
  | "referrers"
  | "campaigns"
  | "events"
  | "funnels"
  | "visitors"
  | "retention"
  | "geo"
  | "devices"
  | "performance"
  | "settings";

export function buildSitePath(siteSlug: string, section?: SiteSection): string {
  const base = `/sites/${siteSlug}`;
  return section ? `${base}/${section}` : base;
}

/**
 * The pages under Settings, in the order its navigation lists them, and who
 * sees each: `member` pages are everyone's, `admin` pages are for owners and
 * admins.
 */
export const SETTINGS_SECTIONS = [
  { key: "account", access: "member" },
  { key: "notifications", access: "admin" },
  { key: "system", access: "admin" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["key"];

/** Settings, or one of its pages. */
export function buildSettingsPath(section?: SettingsSection): string {
  const base = "/settings";
  return section ? `${base}/${section}` : base;
}

/** System health's tabs, in the order the page lists them. */
export const SYSTEM_HEALTH_TABS = [
  "tasks",
  "blocked",
  "ingestion",
  "data",
] as const;

export type SystemHealthTab = (typeof SYSTEM_HEALTH_TABS)[number];

export function isSystemHealthTab(value: unknown): value is SystemHealthTab {
  return SYSTEM_HEALTH_TABS.includes(value as SystemHealthTab);
}

/** One tab of System health. */
export function buildSystemHealthPath(tab: SystemHealthTab): string {
  return `${buildSettingsPath("system")}?tab=${tab}`;
}
