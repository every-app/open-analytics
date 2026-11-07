import type { QueryOperation } from "@/lib/edge/analytics/contract";

/** Protocol route exposure. Query execution belongs to the three adapters. */
export const PUBLIC_QUERY_PATHS = [
  "overview",
  "trend",
  "pages",
  "pages-dashboard",
  "referrers",
  "countries",
  "filter-values",
  "event-types",
  "overview-page-path",
  "overview-page-title",
  "overview-page-hostname",
  "overview-page-entry",
  "overview-page-exit",
  "overview-source-domain",
  "overview-source-channel",
  "overview-client-browser",
  "overview-client-os-version",
  "overview-client-device-type",
  "overview-client-language",
  "overview-client-screen-size",
  "overview-geo-country",
  "overview-geo-region",
  "overview-geo-city",
  "overview-geo-continent",
  "overview-geo-timezone",
  "overview-geo-points",
  "utm-source",
  "utm-medium",
  "utm-campaign",
  "utm-term",
  "utm-content",
] as const;

export const DASHBOARD_QUERY_PATHS = [
  ...PUBLIC_QUERY_PATHS,
  "events-summary",
  "events-trend",
  "events-records",
  "event-type-fields",
  "event-type-field-values",
  "event-type-detail",
  "funnels",
  "goal-summary",
  "goal-timeseries",
  "properties",
  "property-values",
  "team-dashboard",
] as const;

const PUBLIC_HIDDEN_FILTER_PARAMS = new Set(["query", "sourceLink"]);
const PUBLIC_HIDDEN_FILTER_OPTION_KEYS = new Set(["sourceLink"]);

export interface PublicQueryPolicyDecision {
  readonly allowed: boolean;
  readonly url: URL;
}

/**
 * Public sharing policy runs in the public protocol adapter before any source
 * reader is selected. Detailed filter semantics remain a future concern.
 */
export function applyPublicQueryPolicy(url: URL): PublicQueryPolicyDecision {
  const filterKey = url.searchParams.get("filterKey")?.trim();
  const requestsHiddenFilter = [...PUBLIC_HIDDEN_FILTER_PARAMS].some((key) =>
    url.searchParams.has(key),
  );
  if (
    requestsHiddenFilter ||
    (filterKey !== undefined && PUBLIC_HIDDEN_FILTER_OPTION_KEYS.has(filterKey))
  ) {
    return { allowed: false, url };
  }
  if (!url.searchParams.has("details") && !url.searchParams.has("fullUrl")) {
    return { allowed: true, url };
  }
  const sanitizedUrl = new URL(url);
  sanitizedUrl.searchParams.delete("details");
  sanitizedUrl.searchParams.delete("fullUrl");
  return { allowed: true, url: sanitizedUrl };
}

export function operationForQueryRoute(pathname: string): QueryOperation {
  if (pathname === "overview") return "overview";
  if (pathname === "trend") return "trend";
  if (pathname === "pages") return "pages";
  if (pathname === "pages-dashboard") return "pages-dashboard";
  if (pathname === "referrers") return "referrers";
  if (pathname === "filter-values") return "filter-values";
  if (pathname === "overview-geo-points") return "geo-points";
  if (pathname === "funnels") return "funnel-analysis";
  if (pathname === "goal-summary") return "goal-summary";
  if (pathname === "goal-timeseries") return "goal-timeseries";
  if (pathname === "properties") return "property-keys";
  if (pathname === "property-values") return "property-values";
  if (pathname === "team-dashboard") return "team-dashboard";
  if (pathname === "events-summary") return "event-summary";
  if (pathname === "events-trend") return "event-trend";
  if (pathname === "event-types") return "event-types";
  if (pathname === "event-type-detail") return "event-type-detail";
  if (pathname === "event-type-fields") return "event-fields";
  if (pathname === "event-type-field-values") return "event-field-values";
  if (pathname === "events-records") return "event-records";
  if (pathname === "overview-source-channel") return "channels";
  if (pathname.startsWith("overview-source-")) return "referrers";
  return "dimension";
}
