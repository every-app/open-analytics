import {
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
  filterFingerprint,
} from "@/lib/filter-contract";

/** A stable, browser-safe identity for a filtered dashboard query. */
export function filterQueryKey(filters?: FilterDocument): string {
  return filterFingerprint(
    filters ?? EMPTY_FILTER_DOCUMENT,
    analyticsFilterRegistry,
  );
}
