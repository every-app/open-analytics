import { describe, expect, it } from "vitest";

import {
  SYSTEM_FILTER_PRESET_IDS,
  SYSTEM_FILTER_PRESETS,
  systemFilterPresetAvailableForAudience,
  systemFilterPresetFromOptionValue,
  systemFilterPresetOptionValue,
} from "@/lib/dashboard/system-filter-presets";
import { queryPolicyForAudience } from "@/lib/edge/analytics/contract/policy";
import {
  analyticsFilterRegistry,
  assertFilterAudience,
  filterConditionCount,
  parseFilterDsl,
} from "@/lib/filter-contract";

describe("system filter presets", () => {
  it("offers a handful of unique, public-share-compatible expressions", () => {
    const ids = new Set<string>();

    for (const preset of SYSTEM_FILTER_PRESETS) {
      expect(ids.has(preset.id)).toBe(false);
      ids.add(preset.id);

      const document = parseFilterDsl(
        preset.filterDsl,
        analyticsFilterRegistry,
      );
      expect(
        systemFilterPresetAvailableForAudience(preset, "public-share"),
      ).toBe(true);
      expect(() =>
        assertFilterAudience(document, analyticsFilterRegistry, "public-share"),
      ).not.toThrow();
      expect(filterConditionCount(document)).toBeLessThanOrEqual(
        queryPolicyForAudience("public-share").limits.maxFilterClauses!,
      );
    }

    expect(SYSTEM_FILTER_PRESETS.map((preset) => preset.id)).toEqual([
      ...SYSTEM_FILTER_PRESET_IDS,
    ]);
    expect(SYSTEM_FILTER_PRESETS.length).toBeLessThanOrEqual(6);
  });

  it("uses the direct sentinel only with equality operators", () => {
    for (const preset of SYSTEM_FILTER_PRESETS) {
      expect(preset.filterDsl).not.toContain('in ["__direct__"');
      expect(preset.filterDsl).not.toContain('notIn ["__direct__"');
    }
  });

  it("matches registered search domains and their subdomains safely", () => {
    const searchDiscovery = SYSTEM_FILTER_PRESETS.find(
      (preset) => preset.id === "organicSearchDiscovery",
    )!;

    expect(searchDiscovery.filterDsl).toContain(
      'referrer.domain eq "google.com"',
    );
    expect(searchDiscovery.filterDsl).toContain(
      'referrer.domain endsWith ".google.com"',
    );
    expect(searchDiscovery.filterDsl).not.toMatch(/referrer\.domain in \[/);
  });

  it("round-trips selector option values", () => {
    for (const preset of SYSTEM_FILTER_PRESETS) {
      expect(
        systemFilterPresetFromOptionValue(
          systemFilterPresetOptionValue(preset.id),
        ),
      ).toEqual(preset);
    }
    expect(systemFilterPresetFromOptionValue("saved:example")).toBeUndefined();
    expect(
      systemFilterPresetFromOptionValue("system:deepSessions"),
    ).toBeUndefined();
  });
});
