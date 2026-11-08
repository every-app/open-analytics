import { parseGeoLocationValue } from "@/lib/analytics/geo-location";

import type { EventRecordSortKey, ListSort } from "./core-types";
export interface ParsedGeoFilter {
  country: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
}
/** Presentation-only location decoder. It is not part of the SQL filter contract. */
export function parseGeoFilterValue(
  value: string | undefined,
): ParsedGeoFilter | null {
  const parsed = parseGeoLocationValue(value);
  if (!parsed) return null;
  return {
    country: parsed.countryCode,
    ...(parsed.regionCode ? { regionCode: parsed.regionCode } : {}),
    ...(parsed.regionName ? { regionName: parsed.regionName } : {}),
    ...(parsed.level === "locality" && parsed.localityName
      ? { city: parsed.localityName }
      : {}),
  };
}
export function eventRecordOrderBy(sort: ListSort<EventRecordSortKey>): string {
  const direction = sort.direction === "asc" ? "ASC" : "DESC";
  if (sort.key === "eventName")
    return `eventName ${direction}, occurredAt DESC, eventId DESC, eventPk DESC`;
  if (sort.key === "pathname")
    return `pathname ${direction}, occurredAt DESC, eventId DESC, eventPk DESC`;
  return `occurredAt ${direction}, eventId ${direction}, eventPk ${direction}`;
}
