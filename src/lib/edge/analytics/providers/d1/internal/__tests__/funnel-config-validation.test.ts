import { describe, expect, it } from "vitest";

import {
  type FunnelConfigV2,
  FunnelConfigValidationError,
} from "@/lib/edge/analytics/contract/funnel-config";
import {
  encodeD1FunnelConfig,
  validateD1FunnelConfigForWrite,
} from "@/lib/edge/analytics/providers/d1/internal/funnel-config-validation";

function config(conditionsPerStep: number): FunnelConfigV2 {
  const filterDsl = Array.from(
    { length: conditionsPerStep },
    (_, index) => `page.path eq "/candidate-${index}"`,
  ).join(" AND ");
  return {
    filterDslVersion: 1,
    progressionScope: "session",
    conversionWindowMs: null,
    steps: Array.from({ length: 10 }, (_, index) => ({
      id: `step-${index}`,
      filterDsl,
    })),
  };
}

describe("D1 funnel configuration validation", () => {
  it("refuses a funnel whose statement needs more than D1's bindings", () => {
    expect(() => validateD1FunnelConfigForWrite(config(10), "site-1")).toThrow(
      FunnelConfigValidationError,
    );
    expect(() => validateD1FunnelConfigForWrite(config(10), "site-1")).toThrow(
      "funnel_sql_binding_limit_exceeded",
    );
  });

  it("encodes a funnel that fits", () => {
    expect(encodeD1FunnelConfig(config(1), "site-1").configVersion).toBe(2);
  });
});
