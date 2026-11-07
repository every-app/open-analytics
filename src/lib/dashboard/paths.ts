export type SiteSection = "realtime" | "funnels" | "settings";

export function buildSitePath(siteSlug: string, section?: SiteSection): string {
  const base = `/sites/${siteSlug}`;
  return section ? `${base}/${section}` : base;
}

/** Goals & funnels' address key opening one goal. */
export const GOAL_QUERY_PARAM = "goal";

/**
 * The pages under Settings, in the order its navigation lists them, and who
 * sees each: `member` pages are everyone's, `admin` pages are for owners and
 * admins.
 */
export const SETTINGS_SECTIONS = [
  { key: "account", access: "member" },
  { key: "notifications", access: "member" },
  { key: "system", access: "admin" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["key"];

/** Settings, or one of its pages. */
export function buildSettingsPath(section?: SettingsSection): string {
  const base = "/settings";
  return section ? `${base}/${section}` : base;
}
