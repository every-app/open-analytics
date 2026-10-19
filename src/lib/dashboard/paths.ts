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
