import { describe, expect, it } from "vitest";

import {
  decodeGoalConfig,
  encodeGoalConfig,
  GOAL_CONFIG_VERSION,
  type GoalConfigV1,
  goalSemanticFingerprint,
  parseGoalFilter,
  validateGoalConfigForWrite,
} from "@/lib/edge/analytics/contract/goal-config";
import { FILTER_DSL_MAX_LENGTH, parseFilterDsl } from "@/lib/filter-contract";
import { analyticsFilterRegistry } from "@/lib/filter-contract/filter-registry";

const validConfig: GoalConfigV1 = {
  filterDslVersion: 1,
  filterDsl: 'event.name eq "purchase"',
};

describe("goal v1 config contract", () => {
  it("decodes and encodes the exact raw DSL", () => {
    const config: GoalConfigV1 = {
      filterDslVersion: 1,
      filterDsl: '  event.name eq "purchase" AND\nproperty("plan") eq "pro"  ',
    };
    const encoded = encodeGoalConfig(config);

    expect(GOAL_CONFIG_VERSION).toBe(1);
    expect(encoded.configVersion).toBe(1);
    expect(JSON.parse(encoded.configJson)).toEqual(config);
    expect(decodeGoalConfig(encoded.configVersion, encoded.configJson)).toEqual(
      config,
    );
    expect(parseGoalFilter(config)).toEqual(
      parseFilterDsl(config.filterDsl, analyticsFilterRegistry),
    );
  });

  it("rejects invalid JSON, unknown versions, and invalid structures", () => {
    expect(() => decodeGoalConfig(1, "not-json")).toThrow(
      "goal_config_json_invalid",
    );
    expect(() => decodeGoalConfig(2, JSON.stringify(validConfig))).toThrow(
      "goal_config_version_unknown:2",
    );
    expect(() => decodeGoalConfig(1, "null")).toThrow("goal_v1_config_invalid");
    expect(() =>
      decodeGoalConfig(
        1,
        JSON.stringify({
          filterDslVersion: 1,
          filterDsl: 'event.name nope "purchase"',
        }),
      ),
    ).toThrow("goal_filter_dsl_invalid");
    expect(() =>
      decodeGoalConfig(1, JSON.stringify({ ...validConfig, extra: true })),
    ).toThrow("goal_v1_config_invalid");
    expect(() =>
      decodeGoalConfig(1, JSON.stringify({ filterDsl: validConfig.filterDsl })),
    ).toThrow("goal_v1_config_invalid");
    expect(() => decodeGoalConfig(1.5, JSON.stringify(validConfig))).toThrow(
      "goal_config_version_invalid",
    );
  });

  it("rejects empty, oversized, invalid, and unsupported DSL", () => {
    expect(() => validateGoalConfigForWrite({} as never)).toThrow(
      "goal_config_invalid",
    );
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDsl: "   ",
      }),
    ).toThrow("goal_filter_dsl_invalid");
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDsl: "x".repeat(FILTER_DSL_MAX_LENGTH + 1),
      }),
    ).toThrow("goal_filter_dsl_invalid");
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDsl: 'event.name nope "purchase"',
      }),
    ).toThrow("goal_filter_dsl_invalid");
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDsl: 'page.query eq "utm_source=ad"',
      }),
    ).not.toThrow();
    for (const filterDsl of [
      "session.durationMs gt 1000",
      'page.path eq "/pricing" AND session.durationMs gt 1000',
      'event.name eq "purchase" OR page.path eq "/pricing"',
    ]) {
      const config = { ...validConfig, filterDsl };
      expect(() => validateGoalConfigForWrite(config)).toThrow(
        "goal_filter_dsl_invalid",
      );
      expect(() => parseGoalFilter(config)).toThrow("goal_filter_dsl_invalid");
    }
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDsl: 'missing.field eq "value"',
      }),
    ).toThrow("goal_filter_dsl_invalid");
    expect(() =>
      validateGoalConfigForWrite({
        ...validConfig,
        filterDslVersion: 2,
      } as never),
    ).toThrow("goal_filter_dsl_version_invalid");
  });

  it("keeps the authored DSL while canonicalizing equivalent semantics for fingerprints", async () => {
    const equivalent: GoalConfigV1 = {
      filterDslVersion: 1,
      filterDsl: '  event.name   EQ   "purchase" ',
    };
    const semanticChange: GoalConfigV1 = {
      filterDslVersion: 1,
      filterDsl: 'event.name eq "purchase" AND page.path eq "/checkout"',
    };

    expect(validateGoalConfigForWrite(equivalent).filterDsl).toBe(
      equivalent.filterDsl,
    );
    await expect(goalSemanticFingerprint(validConfig)).resolves.toBe(
      await goalSemanticFingerprint(equivalent),
    );
    await expect(goalSemanticFingerprint(validConfig)).resolves.not.toBe(
      await goalSemanticFingerprint(semanticChange),
    );
  });

  it("keeps an upper-cased revenue currency through encode and decode", async () => {
    const revenueConfig = validateGoalConfigForWrite({
      ...validConfig,
      currency: " usd ",
    });
    expect(revenueConfig).toEqual({ ...validConfig, currency: "USD" });

    const encoded = encodeGoalConfig(revenueConfig);
    expect(JSON.parse(encoded.configJson)).toEqual(revenueConfig);
    expect(decodeGoalConfig(encoded.configVersion, encoded.configJson)).toEqual(
      revenueConfig,
    );
    // A goal without a currency stores no currency key.
    expect(JSON.parse(encodeGoalConfig(validConfig).configJson)).toEqual(
      validConfig,
    );
    // The currency changes the goal's results, so it changes its identity;
    // a goal without one keeps the identity it had before currencies.
    await expect(goalSemanticFingerprint(revenueConfig)).resolves.not.toBe(
      await goalSemanticFingerprint(validConfig),
    );
    await expect(
      goalSemanticFingerprint({ ...validConfig, currency: "EUR" }),
    ).resolves.not.toBe(await goalSemanticFingerprint(revenueConfig));
  });

  it("rejects a currency that isn't ISO 4217", () => {
    for (const currency of ["US", "USDX", "ZZZ", "", 840, null]) {
      expect(() =>
        validateGoalConfigForWrite({
          ...validConfig,
          currency: currency as never,
        }),
      ).toThrow("goal_currency_invalid");
    }
    expect(() =>
      decodeGoalConfig(1, JSON.stringify({ ...validConfig, currency: "ZZZ" })),
    ).toThrow("goal_currency_invalid");
  });

  it("allows a currency only on a goal whose conversions are all custom events", () => {
    for (const filterDsl of [
      'event.name eq "Purchase"',
      'event.name eq "Purchase" AND page.path eq "/checkout"',
      'event.name eq "Purchase" AND property("plan") eq "pro"',
    ]) {
      expect(
        validateGoalConfigForWrite({
          filterDslVersion: 1,
          filterDsl,
          currency: "EUR",
        }).currency,
      ).toBe("EUR");
    }
    for (const filterDsl of [
      'page.path eq "/thank-you"',
      // A property also matches the page views that carry it.
      'property("plan") eq "pro"',
    ]) {
      expect(() =>
        validateGoalConfigForWrite({
          filterDslVersion: 1,
          filterDsl,
          currency: "EUR",
        }),
      ).toThrow("goal_currency_requires_event_goal");
    }
  });

  it("does not include definition names or timestamps in semantic identity", async () => {
    const first = {
      ...validConfig,
      id: "goal-1",
      siteId: "site-1",
      name: "Original name",
      createdAt: 1,
      updatedAt: 2,
    };
    const renamed = {
      ...first,
      name: "Renamed goal",
      createdAt: 10,
      updatedAt: 20,
    };

    await expect(goalSemanticFingerprint(first)).resolves.toBe(
      await goalSemanticFingerprint(renamed),
    );
  });
});
