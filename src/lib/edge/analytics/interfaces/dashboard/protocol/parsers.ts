import { resolveReportingTimeZone } from "@/lib/analytics/time-zone";
import type {
  AnalyticsFilterFieldId,
  EventRecordSortKey,
  Interval,
  ListSort,
  QueryWindow,
  SortDirection,
} from "@/lib/edge/analytics/contract";
import { DEFAULT_EVENT_RECORD_SORT } from "@/lib/edge/analytics/contract";
import { coerceNumber, ONE_DAY_MS } from "@/lib/edge/utils";
type FilterOptionKey = Exclude<AnalyticsFilterFieldId, "property">;
export function parseWindow(url: URL): QueryWindow | null {
  const nowMs = Date.now();
  const defaultFrom = nowMs - ONE_DAY_MS;
  const rawFrom = url.searchParams.get("from");
  const rawTo = url.searchParams.get("to");
  const parsedFrom = coerceNumber(rawFrom, null);
  const parsedTo = coerceNumber(rawTo, null);
  if (
    (rawFrom !== null && parsedFrom === null) ||
    (rawTo !== null && parsedTo === null)
  ) {
    return null;
  }
  const startMs = Math.floor(parsedFrom ?? defaultFrom);
  const endExclusiveMs = Math.floor(parsedTo ?? nowMs);
  const timeZone = resolveReportingTimeZone(url.searchParams.get("timeZone"));
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endExclusiveMs) ||
    startMs < 0 ||
    endExclusiveMs <= startMs
  ) {
    return null;
  }
  return {
    startMs,
    endExclusiveMs,
    nowMs,
    timeZone,
  };
}
export function parseLimit(url: URL, fallback = 20, max = 500): number {
  const value = Math.floor(
    coerceNumber(url.searchParams.get("limit"), fallback) ?? fallback,
  );
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(max, value);
}
export function parseInterval(url: URL): Interval {
  const raw = (url.searchParams.get("interval") || "day").toLowerCase();
  if (raw === "minute" || raw === "hour" || raw === "week" || raw === "month")
    return raw;
  return "day";
}
export function parseBooleanSearchParam(url: URL, key: string): boolean {
  const value = (url.searchParams.get(key) || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}
export function parseQueryLimit(
  url: URL,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = Math.floor(
    coerceNumber(url.searchParams.get(key), fallback) ?? fallback,
  );
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
export function parseSortDirection(url: URL): SortDirection {
  return (url.searchParams.get("sortDir") || "").trim().toLowerCase() === "asc"
    ? "asc"
    : "desc";
}
export function parseEventRecordSort(url: URL): ListSort<EventRecordSortKey> {
  const key = (url.searchParams.get("sortBy") || "").trim();
  if (key === "occurredAt" || key === "eventName" || key === "pathname") {
    return { key, direction: parseSortDirection(url) };
  }
  return DEFAULT_EVENT_RECORD_SORT;
}
export function parseListSearch(url: URL): string | undefined {
  const raw = url.searchParams.get("search");
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim().slice(0, 160);
  return normalized.length > 0 ? normalized : undefined;
}
export function parseEventName(url: URL): string | undefined {
  const raw = url.searchParams.get("eventName");
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim().slice(0, 120);
  return normalized.length > 0 ? normalized : undefined;
}
export function normalizeFilterValue(value: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, 120);
  return normalized.length > 0 ? normalized : undefined;
}
export function parseFilterOptionKey(url: URL): FilterOptionKey | null {
  const raw = normalizeFilterValue(url.searchParams.get("filterKey"));
  if (!raw) return null;
  const keys: FilterOptionKey[] = [
    "geo.country",
    "client.deviceType",
    "client.browser",
    "client.browserVersion",
    "client.browserEngine",
    "client.os",
    "client.osVersion",
    "client.language",
    "client.screenSize",
    "utm.source",
    "utm.medium",
    "utm.campaign",
    "utm.term",
    "utm.content",
    "page.path",
    "page.title",
    "page.hostname",
    "session.entryPath",
    "session.exitPath",
    "referrer.domain",
    "referrer.url",
    "traffic.channel",
    "client.osVersion",
    "client.language",
    "client.screenSize",
    "geo.region",
    "geo.city",
    "geo.continent",
    "geo.timeZone",
    "event.name",
  ];
  return keys.includes(raw as FilterOptionKey)
    ? (raw as FilterOptionKey)
    : null;
}
export function parseBooleanFlag(url: URL, key: string): boolean {
  return parseBooleanSearchParam(url, key);
}
