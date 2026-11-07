import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import { withFilters } from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  PropertyKeysData,
  PropertyValuesData,
  PropertyValueSortKey,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract";

/** The custom property keys seen in the period, the most visitors first. */
export async function fetchPropertyKeys(
  siteId: string,
  window: TimeWindow,
  filters: FilterDocument,
  options: { signal?: AbortSignal },
): Promise<PropertyKeysData> {
  return fetchPrivateJson<PropertyKeysData>(
    "/api/private/properties",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
      },
      filters,
    ),
    { signal: options.signal },
  );
}

/** A custom property's values in the period. */
export async function fetchPropertyValues(
  siteId: string,
  window: TimeWindow,
  key: string,
  filters: FilterDocument,
  options: {
    limit: number;
    search: string;
    sort: PropertyValueSortKey;
    direction: "asc" | "desc";
    signal?: AbortSignal;
  },
): Promise<PropertyValuesData> {
  return fetchPrivateJson<PropertyValuesData>(
    "/api/private/property-values",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        key,
        limit: options.limit,
        sort: options.sort,
        direction: options.direction,
        ...(options.search ? { search: options.search } : {}),
      },
      filters,
    ),
    { signal: options.signal },
  );
}
