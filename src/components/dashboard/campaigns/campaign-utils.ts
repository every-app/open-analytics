import type { UtmDimensionTab } from "@/lib/dashboard/client/data/index";
import type { DimensionRow } from "@/lib/dashboard-api/client/edge";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";

export type CampaignTab = UtmDimensionTab;
export type CampaignSortKey =
  "views" | "sessions" | "current" | "reference" | "change";

export interface CampaignBreakdownRow {
  key: string;
  value: string;
  label: string;
  views: number;
  sessions: number;
  visitors?: number;
  reference?: DimensionRow["reference"];
  change?: DimensionRow["change"];
  mono?: boolean;
}

export type CampaignRawRowsByTab = Record<CampaignTab, DimensionRow[]>;
export type CampaignRowsByTab = Record<CampaignTab, CampaignBreakdownRow[]>;

export const CAMPAIGN_TABS = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
] as const satisfies CampaignTab[];

/**
 * The filters with only visits that carry the tab's UTM value: Campaigns
 * reads tagged traffic, not every visit with the untagged ones as "Not set".
 */
export function withCampaignTag(
  filters: FilterDocument | undefined,
  tab: CampaignTab,
): FilterDocument {
  const tagged = parseFilterDsl(`utm.${tab} notEmpty`, analyticsFilterRegistry);
  if (!filters?.root) return tagged;
  return {
    ...filters,
    root: { kind: "and", children: [filters.root, tagged.root!] },
  };
}

export function campaignTabLabel(
  tab: CampaignTab,
  messages: AppMessages,
): string {
  if (tab === "source") return messages.campaigns.tabSource;
  if (tab === "medium") return messages.campaigns.tabMedium;
  if (tab === "campaign") return messages.campaigns.tabCampaign;
  if (tab === "term") return messages.campaigns.tabTerm;
  return messages.campaigns.tabContent;
}

export function buildCampaignRows(
  rows: CampaignRawRowsByTab[CampaignTab],
  tab: CampaignTab,
  notSetLabel: string,
): CampaignBreakdownRow[] {
  const safeRows = Array.isArray(rows) ? rows : [];

  return safeRows.map((row, index) => {
    const value = normalizeDimensionValue(row.value ?? row.label);
    return {
      key: value || createEmptyKey(tab, index),
      value,
      label: value || notSetLabel,
      views: Math.max(0, Number(row.views ?? 0)),
      sessions: Math.max(0, Number(row.sessions ?? 0)),
      mono: tab === "term" || tab === "content",
      ...(row.visitors !== undefined
        ? { visitors: Math.max(0, Number(row.visitors ?? 0)) }
        : {}),
      ...(row.reference ? { reference: row.reference } : {}),
      ...(row.change ? { change: row.change } : {}),
    };
  });
}

function normalizeDimensionValue(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function createEmptyKey(tab: CampaignTab, index: number): string {
  return `__empty__:${tab}:${index}`;
}

export function buildCampaignRowsByTab(
  rowsByTab: CampaignRawRowsByTab,
  notSetLabel: string,
): CampaignRowsByTab {
  const next = {} as CampaignRowsByTab;

  for (const tab of CAMPAIGN_TABS) {
    next[tab] = buildCampaignRows(rowsByTab[tab], tab, notSetLabel);
  }

  return next;
}
