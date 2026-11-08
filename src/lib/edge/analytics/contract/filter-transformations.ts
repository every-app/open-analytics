import {
  type FilterDocument,
  withoutFilterFields,
} from "@/lib/filter-contract/filters";

const GEO_FIELDS: ReadonlySet<string> = new Set([
  "geo.country",
  "geo.region",
  "geo.city",
]);

export function withoutFilterKey(
  filters: FilterDocument,
  field: string,
): FilterDocument {
  return withoutFilterFields(filters, new Set([field]));
}

/** The filter without its location conditions, for the location cards. */
export function withoutGeoFilter(filters: FilterDocument): FilterDocument {
  return withoutFilterFields(filters, GEO_FIELDS);
}
