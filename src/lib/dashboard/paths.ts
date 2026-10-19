import type { Locale } from "@/lib/i18n/config";

export type SiteSection =
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
  | "settings";

export function buildSitePath(
  locale: Locale,
  siteSlug: string,
  section?: SiteSection,
): string {
  const base = `/${locale}/app/sites/${siteSlug}`;
  return section ? `${base}/${section}` : base;
}

/**
 * The pages under Settings, in the order its navigation lists them, and who
 * sees each: `member` pages are everyone's, `admin` pages are for owners and
 * admins.
 */
export const SETTINGS_SECTIONS = [
  { key: "account", group: "personal", access: "member" },
  { key: "sites", group: "organization", access: "admin" },
  { key: "notifications", group: "organization", access: "admin" },
  { key: "public-links", group: "organization", access: "admin" },
  { key: "general", group: "organization", access: "admin" },
  { key: "scheduled-tasks", group: "system", access: "admin" },
  { key: "request-observation", group: "system", access: "admin" },
  { key: "performance", group: "system", access: "admin" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["key"];

/** Settings, or one of its pages. */
export function buildSettingsPath(
  locale: Locale,
  section?: SettingsSection,
): string {
  const base = `/${locale}/app/settings`;
  return section ? `${base}/${section}` : base;
}
