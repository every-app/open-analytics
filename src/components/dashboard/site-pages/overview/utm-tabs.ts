import type { UtmDimensionTab } from "@/lib/dashboard/client/data/index";
import {
  analyticsFilterRegistry,
  copyFilterScopePreferenceMetadata,
  type FilterDocument,
  parseFilterDsl,
} from "@/lib/filter-contract/index";

/** The UTM parameters the Campaigns tab lists by, in Plausible's order. */
export const UTM_TABS = [
  "medium",
  "source",
  "campaign",
  "content",
  "term",
] as const satisfies readonly UtmDimensionTab[];

/**
 * The filters with only visits that carry the tab's UTM value: a campaign tab
 * lists tagged traffic, not every visit with the untagged ones as "Not set".
 * The Overview's scope (event, session, visitor) rides along as hidden
 * metadata, so it is copied over too.
 */
export function withUtmTag(
  filters: FilterDocument,
  tab: UtmDimensionTab,
): FilterDocument {
  const tagged = parseFilterDsl(`utm.${tab} notEmpty`, analyticsFilterRegistry);
  const combined: FilterDocument = filters.root
    ? {
        ...filters,
        root: { kind: "and", children: [filters.root, tagged.root!] },
      }
    : { ...tagged };
  copyFilterScopePreferenceMetadata(filters, combined);
  return combined;
}
