import type { UtmDimensionTab } from "@/lib/dashboard/client/data/index";
import type { DimensionRow } from "@/lib/dashboard-api/client/edge";
import {
  analyticsFilterRegistry,
  copyFilterScopePreferenceMetadata,
  type FilterDocument,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";

import type { SourceCardRow } from "./types";

/** The Sources card's campaign tabs, one per UTM parameter. */
export const UTM_TABS = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
] as const satisfies readonly UtmDimensionTab[];

export function isUtmTab(tab: string): tab is UtmDimensionTab {
  return (UTM_TABS as readonly string[]).includes(tab);
}

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

export function utmTabLabel(
  tab: UtmDimensionTab,
  messages: AppMessages,
): string {
  if (tab === "source") return messages.campaigns.tabSource;
  if (tab === "medium") return messages.campaigns.tabMedium;
  if (tab === "campaign") return messages.campaigns.tabCampaign;
  if (tab === "term") return messages.campaigns.tabTerm;
  return messages.campaigns.tabContent;
}

export function buildUtmSourceCardRows(
  tab: UtmDimensionTab,
  rows: readonly DimensionRow[],
  notSetLabel: string,
): SourceCardRow[] {
  return rows.map((row, index) => {
    // The UTM reports answer with a label and no value.
    const value = (row.value ?? row.label).trim();
    return {
      key: value || `__empty__:${tab}:${index}`,
      label: value || notSetLabel,
      filterValue: value,
      targetUrl: null,
      views: Math.max(0, Number(row.views ?? 0)),
      visitors: Math.max(0, Number(row.visitors ?? 0)),
      reference: row.reference,
      change: row.change,
      mono: tab === "term" || tab === "content",
    };
  });
}
