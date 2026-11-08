import {
  encodeFunnelConfig,
  type FunnelConfigV2,
  FunnelConfigValidationError,
  validateFunnelConfigForWrite,
} from "@/lib/edge/analytics/contract/funnel-config";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/filter-contract/filters";

import { buildFunnelSqlPlan } from "./funnel-planner";

/** The funnel's statement for all of a site's history, unfiltered. */
function unfilteredPlan(config: FunnelConfigV2, siteId: string) {
  return buildFunnelSqlPlan(config, {
    siteId,
    startMs: 0,
    endExclusiveMs: Number.MAX_SAFE_INTEGER,
    filters: EMPTY_FILTER_DOCUMENT,
  });
}

/**
 * Validate a funnel for a write: its domain rules, and that its statement
 * fits D1's parameter budget.
 */
export function validateD1FunnelConfigForWrite(
  config: FunnelConfigV2,
  siteId: string,
): FunnelConfigV2 {
  const validated = validateFunnelConfigForWrite(config);
  try {
    unfilteredPlan(validated, siteId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "funnel_sql_binding_limit_exceeded"
    ) {
      throw new FunnelConfigValidationError(error.message);
    }
    throw error;
  }
  return validated;
}

/** Encode only after both domain validation and the D1-specific budget pass. */
export function encodeD1FunnelConfig(config: FunnelConfigV2, siteId: string) {
  return encodeFunnelConfig(validateD1FunnelConfigForWrite(config, siteId));
}
