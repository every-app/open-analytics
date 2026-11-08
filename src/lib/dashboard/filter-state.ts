import {
  buildRegionLocationValue,
  parseGeoLocationValue,
} from "@/lib/analytics/geo-location";
import { propertyPath } from "@/lib/analytics/property-path";
import {
  analyticsFilterRegistry,
  type CanonicalJsonPath,
  EMPTY_FILTER_DOCUMENT,
  type FilterCondition,
  type FilterDocument,
  type FilterFieldId,
  filterFingerprint,
  FilterOperator,
  normalizeFilterDocument,
  parseFilterParams,
  serializeFilterParams,
} from "@/lib/filter-contract";
export const DASHBOARD_FILTER_CONTROL_KEYS = [
  "country",
  "device",
  "browser",
  "path",
  "query",
  "title",
  "hostname",
  "entry",
  "exit",
  "sourceDomain",
  "sourceLink",
  "channel",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "clientBrowser",
  "clientOsVersion",
  "clientDeviceType",
  "clientLanguage",
  "clientScreenSize",
  "geo",
  "geoContinent",
  "geoTimezone",
] as const;
export type DashboardFilterControlKey =
  (typeof DASHBOARD_FILTER_CONTROL_KEYS)[number];
export type DashboardFilterPresentation = Partial<
  Record<DashboardFilterControlKey, string>
>;
const FIELD_BY_CONTROL_KEY: Readonly<
  Record<Exclude<DashboardFilterControlKey, "geo">, FilterFieldId>
> = {
  country: "geo.country" as FilterFieldId,
  device: "client.deviceType" as FilterFieldId,
  browser: "client.browser" as FilterFieldId,
  query: "page.query" as FilterFieldId,
  path: "page.path" as FilterFieldId,
  title: "page.title" as FilterFieldId,
  hostname: "page.hostname" as FilterFieldId,
  entry: "session.entryPath" as FilterFieldId,
  exit: "session.exitPath" as FilterFieldId,
  sourceDomain: "referrer.domain" as FilterFieldId,
  sourceLink: "referrer.url" as FilterFieldId,
  channel: "traffic.channel" as FilterFieldId,
  utmSource: "utm.source" as FilterFieldId,
  utmMedium: "utm.medium" as FilterFieldId,
  utmCampaign: "utm.campaign" as FilterFieldId,
  utmTerm: "utm.term" as FilterFieldId,
  utmContent: "utm.content" as FilterFieldId,
  clientBrowser: "client.browser" as FilterFieldId,
  clientOsVersion: "client.osVersion" as FilterFieldId,
  clientDeviceType: "client.deviceType" as FilterFieldId,
  clientLanguage: "client.language" as FilterFieldId,
  clientScreenSize: "client.screenSize" as FilterFieldId,
  geoContinent: "geo.continent" as FilterFieldId,
  geoTimezone: "geo.timeZone" as FilterFieldId,
};
export const EMPTY_DASHBOARD_FILTER_DOCUMENT = EMPTY_FILTER_DOCUMENT;
export const DASHBOARD_COMPARISON_MODES = ["same", "previous", "year"] as const;
export type DashboardComparisonMode =
  (typeof DASHBOARD_COMPARISON_MODES)[number];
export interface DashboardComparisonSearchState {
  readonly mode?: DashboardComparisonMode;
  readonly filterDocument: FilterDocument;
}
const COMPARISON_FILTER_PREFIX = "compareFilter";
function isDashboardComparisonMode(
  value: string | null,
): value is DashboardComparisonMode {
  return DASHBOARD_COMPARISON_MODES.includes(value as DashboardComparisonMode);
}
function comparisonFilterParamsFromSearchParams(
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (!key.startsWith(`${COMPARISON_FILTER_PREFIX}[`)) continue;
    params.append(`filter${key.slice(COMPARISON_FILTER_PREFIX.length)}`, value);
  }
  return params;
}
function comparisonFilterParamsFromDocument(
  document: FilterDocument,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of serializeFilterParams(
    document,
    analyticsFilterRegistry,
  )) {
    params.append(
      `${COMPARISON_FILTER_PREFIX}${key.slice("filter".length)}`,
      value,
    );
  }
  return params;
}
export function parseDashboardComparisonSearchParams(
  searchParams: URLSearchParams,
): DashboardComparisonSearchState {
  const mode = searchParams.get("compare");
  let filterDocument = EMPTY_DASHBOARD_FILTER_DOCUMENT;
  try {
    filterDocument = parseFilterParams(
      comparisonFilterParamsFromSearchParams(searchParams),
      analyticsFilterRegistry,
    );
  } catch {
    // An invalid comparison filter must not make the dashboard unusable.
    filterDocument = EMPTY_DASHBOARD_FILTER_DOCUMENT;
  }

  if (
    !isDashboardComparisonMode(mode) ||
    (mode === "same" && filterDocument.conditions.length === 0)
  ) {
    return { filterDocument: EMPTY_DASHBOARD_FILTER_DOCUMENT };
  }

  return { mode, filterDocument };
}
/** Replaces comparison state while preserving the current dashboard query. */
export function withDashboardComparisonSearchParams(
  searchParams: URLSearchParams,
  mode: DashboardComparisonMode | null | undefined,
  filterDocument?: FilterDocument | null,
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  for (const key of [...next.keys()]) {
    if (key === "compare" || key.startsWith(`${COMPARISON_FILTER_PREFIX}[`)) {
      next.delete(key);
    }
  }

  const hasComparisonFilter = (filterDocument?.conditions.length ?? 0) > 0;
  if (!mode || (mode === "same" && !hasComparisonFilter)) return next;

  next.set("compare", mode);
  if (filterDocument) {
    for (const [key, value] of comparisonFilterParamsFromDocument(
      filterDocument,
    )) {
      next.append(key, value);
    }
  }
  return next;
}
/** The value of the field's `eq` condition: what a card's row filters to. */
function conditionValueForField(
  document: FilterDocument,
  field: FilterFieldId,
): string | undefined {
  const value = document.conditions.find(
    (condition) =>
      condition.target.kind === "field" &&
      condition.target.field === field &&
      condition.operator === FilterOperator.Eq,
  )?.value;
  return typeof value === "string" ? value : undefined;
}
function withoutConditions(
  document: FilterDocument,
  matches: (condition: FilterCondition) => boolean,
): readonly FilterCondition[] {
  return document.conditions.filter((condition) => !matches(condition));
}
function normalizedDocument(
  conditions: readonly FilterCondition[],
): FilterDocument {
  return normalizeFilterDocument({ conditions }, analyticsFilterRegistry);
}
function fieldCondition(field: string, value: string): FilterCondition {
  return {
    target: { kind: "field", field: field as FilterFieldId },
    operator: FilterOperator.Eq,
    value,
  };
}
function geoConditions(value: string): FilterCondition[] {
  const parsed = parseGeoLocationValue(value);
  if (!parsed) return [];
  return [
    fieldCondition("geo.country", parsed.countryCode),
    ...(parsed.level === "country"
      ? []
      : [
          fieldCondition(
            "geo.region",
            parsed.regionName ||
              parsed.regionCode ||
              buildRegionLocationValue(
                parsed.countryCode,
                parsed.regionCode || parsed.regionName || "",
                parsed.regionName || parsed.regionCode || "",
              ),
          ),
        ]),
    ...(parsed.level === "locality" && parsed.localityName
      ? [fieldCondition("geo.city", parsed.localityName)]
      : []),
  ];
}
function fieldsForControlKey(
  key: DashboardFilterControlKey,
): ReadonlySet<string> {
  if (key === "geo") {
    return new Set(["geo.country", "geo.region", "geo.city"]);
  }
  return new Set([FIELD_BY_CONTROL_KEY[key].toString()]);
}
export function dashboardFilterFieldId(
  key: Exclude<DashboardFilterControlKey, "geo">,
): FilterFieldId {
  return FIELD_BY_CONTROL_KEY[key];
}
export function dashboardFilterValue(
  document: FilterDocument,
  key: DashboardFilterControlKey,
): string | undefined {
  if (key !== "geo")
    return conditionValueForField(document, FIELD_BY_CONTROL_KEY[key]);
  const country = conditionValueForField(
    document,
    "geo.country" as FilterFieldId,
  );
  if (!country) return undefined;
  const region = conditionValueForField(
    document,
    "geo.region" as FilterFieldId,
  );
  const city = conditionValueForField(document, "geo.city" as FilterFieldId);
  if (!region) return country;
  if (!city) return `${country}::${region}`;
  return `${country}::${region}::${city}`;
}
export function dashboardFilterPresentation(
  document: FilterDocument,
): DashboardFilterPresentation {
  const result: DashboardFilterPresentation = {};
  for (const key of DASHBOARD_FILTER_CONTROL_KEYS) {
    const value = dashboardFilterValue(document, key);
    if (value) result[key] = value;
  }
  return result;
}
export function dashboardFilterDocumentFromPresentation(
  presentation: DashboardFilterPresentation,
): FilterDocument {
  let document = EMPTY_DASHBOARD_FILTER_DOCUMENT;
  for (const key of DASHBOARD_FILTER_CONTROL_KEYS) {
    const value = presentation[key];
    if (value) document = setDashboardFilterValue(document, key, value);
  }
  return document;
}
export function withoutDashboardFilter(
  document: FilterDocument,
  key: DashboardFilterControlKey,
): FilterDocument {
  const fields = fieldsForControlKey(key);
  return normalizedDocument(
    withoutConditions(
      document,
      (condition) =>
        condition.target.kind === "field" && fields.has(condition.target.field),
    ),
  );
}
export function setDashboardFilterValue(
  document: FilterDocument,
  key: DashboardFilterControlKey,
  rawValue: string | null | undefined,
): FilterDocument {
  const value = String(rawValue ?? "")
    .trim()
    .slice(0, 240);
  const base = withoutDashboardFilter(document, key);
  if (!value) return base;
  return normalizedDocument([
    ...base.conditions,
    ...(key === "geo"
      ? geoConditions(value)
      : [fieldCondition(FIELD_BY_CONTROL_KEY[key], value)]),
  ]);
}
function isPropertyCondition(condition: FilterCondition, path: string) {
  return (
    condition.target.kind === "event-payload" && condition.target.path === path
  );
}
/**
 * The custom property value the page is filtered to for `key`: a payload
 * condition at its path equal to a string, which matches page views with
 * the property and events with the payload value.
 */
export function propertyFilterValue(
  document: FilterDocument,
  key: string,
): string | undefined {
  const path = propertyPath(key);
  const value = document.conditions.find(
    (condition) =>
      isPropertyCondition(condition, path) &&
      condition.operator === FilterOperator.Eq,
  )?.value;
  return typeof value === "string" ? value : undefined;
}
/** The filters with `key` filtered to `value`, or not by `key` for null. */
export function setPropertyFilterValue(
  document: FilterDocument,
  key: string,
  value: string | null,
): FilterDocument {
  const path = propertyPath(key);
  const base = withoutConditions(document, (condition) =>
    isPropertyCondition(condition, path),
  );
  if (value === null) return normalizedDocument(base);
  return normalizedDocument([
    ...base,
    {
      target: { kind: "event-payload", path: path as CanonicalJsonPath },
      operator: FilterOperator.Eq,
      value,
    },
  ]);
}
export function dashboardFilterFingerprint(document: FilterDocument): string {
  return filterFingerprint(document, analyticsFilterRegistry);
}
/** Replaces only typed filter parameters and preserves unrelated URL state. */
export function withDashboardFilterSearchParams(
  searchParams: URLSearchParams,
  document: FilterDocument,
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  for (const key of [...next.keys()]) {
    if (
      key.startsWith("filter[") ||
      DASHBOARD_FILTER_CONTROL_KEYS.includes(
        key as DashboardFilterControlKey,
      ) ||
      key === "geoCountry" ||
      key === "geoRegion" ||
      key === "geoCity"
    ) {
      next.delete(key);
    }
  }
  for (const [key, value] of serializeFilterParams(
    document,
    analyticsFilterRegistry,
  )) {
    next.append(key, value);
  }
  return next;
}
/** Formats dashboard navigation query strings without escaping filter syntax. */
export function serializeDashboardSearchParams(
  searchParams: URLSearchParams,
): string {
  return [...searchParams]
    .map(([key, value]) => {
      const readableKey = encodeURIComponent(key)
        .replaceAll("%5B", "[")
        .replaceAll("%5D", "]")
        .replaceAll("%2F", "/")
        .replaceAll("%3A", ":");
      // Keep a terminal slash encoded. TanStack Router normalizes a raw
      // trailing slash in a query value (for example `filter[page.path]=/`)
      // to an empty value during client navigation. Interior slashes remain
      // readable, so ordinary paths such as `/politics` keep their existing
      // URL shape.
      const hasTerminalSlash = value.endsWith("/");
      const readableValue = encodeURIComponent(
        hasTerminalSlash ? value.slice(0, -1) : value,
      )
        .replaceAll("%3A", ":")
        .replaceAll("%2F", "/")
        .concat(hasTerminalSlash ? "%2F" : "");
      return `${readableKey}=${readableValue}`;
    })
    .join("&");
}
export function dashboardFilterFieldsForControl(
  key: DashboardFilterControlKey,
): readonly string[] {
  return [...fieldsForControlKey(key)];
}
