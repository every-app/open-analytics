import type { UtmDimensionTab } from "@/lib/dashboard/client/data/index";
import {
  type FilterDocument,
  type FilterFieldId,
  FilterOperator,
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
 */
export function withUtmTag(
  filters: FilterDocument,
  tab: UtmDimensionTab,
): FilterDocument {
  return {
    conditions: [
      ...filters.conditions,
      {
        target: { kind: "field", field: `utm.${tab}` as FilterFieldId },
        operator: FilterOperator.NotEmpty,
      },
    ],
  };
}
