import { describe, expect, it } from "vitest";

import {
  currencyFormat,
  durationFormat,
  intlLocale,
  numberFormat,
  percentFormat,
  shortDateTime,
} from "@/lib/dashboard/format";

describe("Dashboard Format Utilities", () => {
  describe("intlLocale", () => {
    it("should return the correct BCP 47 locale mapping", () => {
      expect(intlLocale("en")).toBe("en-US");
    });
  });

  describe("numberFormat", () => {
    it("should format numbers with correct locale-specific groupings", () => {
      // Avoid hardcoding character formatting because thin spaces can vary across runtimes
      const formattedEn = numberFormat("en", 1234567.89);
      expect(formattedEn).toContain("1");
      expect(formattedEn).toContain("234");
      expect(formattedEn).toContain("567");
      expect(formattedEn).toContain("89");
    });
  });

  describe("percentFormat", () => {
    it("should format percentages correctly and round to max 1 fraction digit", () => {
      expect(percentFormat("en", 0.1234)).toMatch(/12\.3\s*%/);
      expect(percentFormat("en", 0.88)).toMatch(/88\s*%/);
      expect(percentFormat("en", 0.0005)).toMatch(/0\.1\s*%/);
      expect(percentFormat("en", 0)).toMatch(/0\s*%/);
    });
  });

  describe("currencyFormat", () => {
    it("formats an amount in its currency's symbol and minor units", () => {
      expect(currencyFormat("en", 1234.5, "USD")).toBe("$1,234.50");
      expect(currencyFormat("en", 15.99, "EUR")).toBe("€15.99");
      expect(currencyFormat("en", 1500, "JPY")).toBe("¥1,500");
    });
  });

  describe("shortDateTime edge cases (toValidDate internal logic)", () => {
    it("should return double-dash fallback for null, undefined, empty, or whitespace values", () => {
      expect(shortDateTime("en", null, "UTC")).toBe("--");
      expect(shortDateTime("en", undefined, "UTC")).toBe("--");
      expect(shortDateTime("en", "", "UTC")).toBe("--");
      expect(shortDateTime("en", "   ", "UTC")).toBe("--");
    });

    it("should return fallback for invalid string or non-finite numeric date formats", () => {
      expect(shortDateTime("en", "not-a-date", "UTC")).toBe("--");
      expect(shortDateTime("en", NaN as any, "UTC")).toBe("--");
      expect(shortDateTime("en", Infinity as any, "UTC")).toBe("--");
      expect(shortDateTime("en", -Infinity as any, "UTC")).toBe("--");
      expect(shortDateTime("en", new Date("invalid-date-obj"), "UTC")).toBe(
        "--",
      );
      expect(shortDateTime("en", false as any, "UTC")).toBe("--");
    });

    it("should return fallback for numeric timestamps less than or equal to zero", () => {
      expect(shortDateTime("en", 0, "UTC")).toBe("--");
      expect(shortDateTime("en", -123456789, "UTC")).toBe("--");
      expect(shortDateTime("en", "-500", "UTC")).toBe("--");
      expect(shortDateTime("en", "0", "UTC")).toBe("--");
    });

    it("should return fallback for positive numbers that exceed the valid date range", () => {
      // Finite and > 0, but `new Date(value)` produces an Invalid Date.
      expect(shortDateTime("en", (8.64e15 + 1000) as any, "UTC")).toBe("--");
      // Numeric-string path reaching the same invalid-Date branch.
      expect(shortDateTime("en", "1e20" as any, "UTC")).toBe("--");
    });

    it("should correctly parse and format valid Date objects", () => {
      const date = new Date(Date.UTC(2026, 4, 25, 3, 43, 43)); // May 25, 2026 03:43:43 UTC
      const resultDateTime = shortDateTime("en", date, "UTC");
      expect(resultDateTime).toContain("May");
      expect(resultDateTime).toContain("25");
      expect(resultDateTime).toContain("03");
      expect(resultDateTime).toContain("43");
    });

    it("should correctly parse and format valid numeric and string-numeric timestamps", () => {
      const timestamp = Date.UTC(2026, 4, 25, 3, 43, 43); // 1779680623000
      expect(shortDateTime("en", timestamp, "UTC")).toContain("May");
      expect(shortDateTime("en", String(timestamp), "UTC")).toContain("25");
    });

    it("should correctly parse and format valid date-strings", () => {
      const isoStr = "2026-05-25T03:43:43Z";
      expect(shortDateTime("en", isoStr, "UTC")).toContain("43");
    });

    it("formats in the zone it is given, whatever the machine's", () => {
      const isoStr = "2026-05-25T03:43:43Z";
      expect(shortDateTime("en", isoStr, "Asia/Tokyo")).toContain("12:43");
      expect(shortDateTime("en", isoStr, "America/Los_Angeles")).toContain(
        "May 24",
      );
    });
  });

  describe("durationFormat", () => {
    it("should format durations under 60 seconds correctly", () => {
      expect(durationFormat("en", 0)).toBe("0s");
      expect(durationFormat("en", -5000)).toBe("0s"); // Negatives capped to 0s
      expect(durationFormat("en", 499)).toBe("0s"); // Rounding down
      expect(durationFormat("en", 500)).toBe("1s"); // Rounding up
      expect(durationFormat("en", 59499)).toBe("59s");
    });

    it("should format durations under 60 minutes correctly", () => {
      expect(durationFormat("en", 60000)).toBe("1m"); // Exact minutes
      expect(durationFormat("en", 65000)).toBe("1m 5s"); // Join with space
      expect(durationFormat("en", 3599000)).toBe("59m 59s");
    });

    it("should format durations of 60 minutes and above correctly", () => {
      expect(durationFormat("en", 3600000)).toBe("1h"); // Exact hours
      expect(durationFormat("en", 3720000)).toBe("1h 2m"); // Hours and minutes
      expect(durationFormat("en", 3600000 * 24 + 60000 * 30)).toBe("24h 30m");
    });
  });
});
