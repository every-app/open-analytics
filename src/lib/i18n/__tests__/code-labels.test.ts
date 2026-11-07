import { describe, expect, it, vi } from "vitest";

import {
  resolveContinentLabel,
  resolveCountryFlagCode,
  resolveCountryLabel,
  resolveLanguageLabel,
} from "@/lib/i18n/code-labels";

describe("Regional Code and Language Translation Resolvers", () => {
  describe("resolveCountryLabel", () => {
    it("should resolve standard region codes using Intl.DisplayNames where supported", () => {
      const usResult = resolveCountryLabel("US", "en", "Unknown Region");
      expect(usResult.code).toBe("US");
      expect(usResult.label).toMatch(/United States|US/);
    });

    it("should respect regional alias mapping rules (e.g. UK -> GB)", () => {
      const ukResult = resolveCountryLabel("UK", "en", "Unknown");
      expect(ukResult.code).toBe("GB");
      expect(ukResult.label).toMatch(/United Kingdom|GB/);
    });

    it("should fall back to raw input as label for non-empty invalid region codes, and use unknownLabel for empty/whitespace", () => {
      // Non-empty invalid code retains the raw value as label
      const invalidCode = resolveCountryLabel("ZZ", "en", "Default Unknown");
      expect(invalidCode.code).toBeNull();
      expect(invalidCode.label).toBe("ZZ");

      // Empty/whitespace code uses unknownLabel
      const emptyCode = resolveCountryLabel("   ", "en", "Unknown");
      expect(emptyCode.code).toBeNull();
      expect(emptyCode.label).toBe("Unknown");
    });
  });

  describe("resolveLanguageLabel", () => {
    it("should resolve defined languages from table", () => {
      expect(resolveLanguageLabel("en", "en", "Unknown")).toEqual({
        label: "English",
        code: "en",
      });
    });

    it("should normalize locale codes with underscores (e.g., zh_CN -> zh)", () => {
      const result = resolveLanguageLabel("zh_CN", "en", "Unknown");
      expect(result.code).toBe("zh");
      expect(result.label).toBe("Chinese");
    });

    it("should normalize Traditional Chinese language codes (e.g., zh-TW, zh-HK, zh-Hant)", () => {
      for (const raw of ["zh-TW", "zh_HK", "zh-Hant-TW"]) {
        expect(resolveLanguageLabel(raw, "en", "Unknown")).toEqual({
          code: "zh-tw",
          label: "Traditional Chinese",
        });
      }
    });

    it("should resolve other codes via Intl.DisplayNames if not in static table", () => {
      const resultEn = resolveLanguageLabel("de", "en", "Unknown");
      expect(resultEn.code).toBe("de");
      expect(resultEn.label).toMatch(/German/);
    });

    it("should fall back gracefully for unknown language formats", () => {
      const result = resolveLanguageLabel("12345", "en", "Unknown Lang");
      expect(result.code).toBeNull();
      expect(result.label).toBe("12345");

      const emptyResult = resolveLanguageLabel("", "en", "Fallback");
      expect(emptyResult.code).toBeNull();
      expect(emptyResult.label).toBe("Fallback");
    });
  });

  describe("resolveContinentLabel", () => {
    const labels = {
      "NORTH AMERICA": "北美洲",
      "SOUTH AMERICA": "南美洲",
      ASIA: "亚洲",
    };

    it("should normalize spacing, casing, and underscores to find exact label matches", () => {
      expect(
        resolveContinentLabel("  north_america  ", "Unknown", labels),
      ).toBe("北美洲");
      expect(resolveContinentLabel("south   america", "Unknown", labels)).toBe(
        "南美洲",
      );
      expect(resolveContinentLabel("ASIA", "Unknown", labels)).toBe("亚洲");
    });

    it("should return the trimmed raw value if no translation matches", () => {
      expect(resolveContinentLabel("EUROPE", "Unknown", labels)).toBe("EUROPE");
    });

    it("should return unknown label fallback for empty or whitespace inputs", () => {
      expect(resolveContinentLabel("", "Fallback Unknown", labels)).toBe(
        "Fallback Unknown",
      );
    });
  });

  describe("resolveCountryFlagCode", () => {
    it("should format United Kingdom (GB) flags to GB-UKM code", () => {
      expect(resolveCountryFlagCode("GB")).toBe("GB-UKM");
    });

    it("should preserve other region flag codes as is", () => {
      expect(resolveCountryFlagCode("US")).toBe("US");
      expect(resolveCountryFlagCode("TW")).toBe("TW");
    });

    it("should return null if country code is missing", () => {
      expect(resolveCountryFlagCode(null)).toBeNull();
      expect(resolveCountryFlagCode(undefined as any)).toBeNull();
    });
  });

  describe("Caching and Exception Fallbacks (Intl DisplayNames)", () => {
    it("should successfully trigger cached formatter branches (Line 88, 100)", () => {
      // First call configures the formatter in the cache
      resolveCountryLabel("FR", "en", "Unknown");
      resolveLanguageLabel("fr", "en", "Unknown");

      // Second call hits the cache
      const cachedCountry = resolveCountryLabel("DE", "en", "Unknown");
      const cachedLang = resolveLanguageLabel("de", "en", "Unknown");

      expect(cachedCountry.label).toBe("Germany");
      expect(cachedLang.label).toBe("German");
    });

    it("should fall back to raw code if Intl does not recognize the language (Line 179)", () => {
      // "xyz" has no translation in static table or Intl
      const result = resolveLanguageLabel("xyz", "en", "Unknown");
      expect(result.code).toBe("xyz");
      expect(result.label).toBe("xyz");
    });

    it("should gracefully handle Intl constructor errors and return null formatter for both country and language resolvers (Line 94, 105)", async () => {
      const originalDisplayNames = globalThis.Intl.DisplayNames;
      try {
        Object.defineProperty(globalThis.Intl, "DisplayNames", {
          value: vi.fn(function () {
            throw new Error("DisplayNames mock error");
          }),
          writable: true,
          configurable: true,
        });
        // A fresh module has no cached formatters, so both get created and throw.
        vi.resetModules();
        const fresh = await import("@/lib/i18n/code-labels");

        // "sv" is not in the label table: the raw code is the label
        expect(fresh.resolveLanguageLabel("sv", "en", "Fallback").label).toBe(
          "sv",
        );
        expect(fresh.resolveCountryLabel("FR", "en", "Fallback").label).toBe(
          "FR",
        );
      } finally {
        Object.defineProperty(globalThis.Intl, "DisplayNames", {
          value: originalDisplayNames,
          writable: true,
          configurable: true,
        });
      }
    });
  });
});
