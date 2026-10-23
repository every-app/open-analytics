/**
 * Built-in filter presets are intentionally client-side only. They are useful
 * starting points for the filter editor, but are not saved filters and do not
 * participate in the saved-filter API or D1 storage.
 */

import { buildDomainDiscoveryFilterDsl } from "@/lib/analytics/traffic-channel-rules";
import {
  analyticsFilterRegistry,
  assertFilterAudience,
  type FilterScope,
  parseFilterDsl,
} from "@/lib/filter-contract";

export type SystemFilterPresetScope = "preserve" | FilterScope;

/** The handful of presets the filter panel offers. */
export const SYSTEM_FILTER_PRESET_IDS = [
  "directTraffic",
  "organicSearchDiscovery",
  "campaignTaggedTraffic",
  "mobileTraffic",
  "bouncedSessions",
  "returningVisitors",
] as const;

export type SystemFilterPresetId = (typeof SYSTEM_FILTER_PRESET_IDS)[number];

export interface SystemFilterPreset {
  readonly id: SystemFilterPresetId;
  readonly filterDsl: string;
  /** preserve keeps the active scope; other values switch to that scope. */
  readonly scope: SystemFilterPresetScope;
}

export const SYSTEM_FILTER_PRESETS: readonly SystemFilterPreset[] = [
  {
    id: "directTraffic",
    filterDsl: 'referrer.domain eq "__direct__"',
    scope: "preserve",
  },
  {
    id: "organicSearchDiscovery",
    filterDsl: buildDomainDiscoveryFilterDsl("organic_search"),
    scope: "preserve",
  },
  {
    id: "campaignTaggedTraffic",
    filterDsl:
      "(utm.source notEmpty OR utm.medium notEmpty OR utm.campaign notEmpty)",
    scope: "preserve",
  },
  {
    id: "mobileTraffic",
    filterDsl: 'client.deviceType eq "mobile"',
    scope: "preserve",
  },
  {
    id: "bouncedSessions",
    filterDsl: "session.bounce eq true",
    scope: "session",
  },
  {
    id: "returningVisitors",
    filterDsl: "visitor.sessions gte 2",
    scope: "visitor",
  },
];

const SYSTEM_FILTER_PRESET_BY_ID = new Map<
  SystemFilterPresetId,
  SystemFilterPreset
>(SYSTEM_FILTER_PRESETS.map((item) => [item.id, item]));

export const SYSTEM_FILTER_PRESET_OPTION_PREFIX = "system:";

export function systemFilterPresetOptionValue(
  id: SystemFilterPresetId,
): string {
  return `${SYSTEM_FILTER_PRESET_OPTION_PREFIX}${id}`;
}

export function systemFilterPresetFromOptionValue(
  value: string,
): SystemFilterPreset | undefined {
  if (!value.startsWith(SYSTEM_FILTER_PRESET_OPTION_PREFIX)) return undefined;
  return SYSTEM_FILTER_PRESET_BY_ID.get(
    value.slice(
      SYSTEM_FILTER_PRESET_OPTION_PREFIX.length,
    ) as SystemFilterPresetId,
  );
}

/**
 * Derive preset availability from the canonical registry audience gate. This
 * intentionally avoids a second private-preset allowlist that could drift.
 */
export function systemFilterPresetAvailableForAudience(
  item: SystemFilterPreset,
  audience: "private-dashboard" | "public-share",
): boolean {
  try {
    const document = parseFilterDsl(item.filterDsl, analyticsFilterRegistry);
    assertFilterAudience(document, analyticsFilterRegistry, audience);
    return true;
  } catch {
    return false;
  }
}
