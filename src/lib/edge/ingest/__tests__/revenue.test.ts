import { describe, expect, it } from "vitest";

import { normalizeEventRevenue } from "@/lib/edge/ingest/revenue";

const NO_REVENUE = { revenueAmount: null, revenueCurrency: null };

describe("custom event revenue", () => {
  it("keeps a finite amount or decimal string in an ISO 4217 currency, upper-cased", () => {
    expect(normalizeEventRevenue({ amount: 15.99, currency: "USD" })).toEqual({
      revenueAmount: 15.99,
      revenueCurrency: "USD",
    });
    expect(
      normalizeEventRevenue({ amount: " 1500 ", currency: "jpy" }),
    ).toEqual({ revenueAmount: 1500, revenueCurrency: "JPY" });
    expect(normalizeEventRevenue({ amount: "-4.5", currency: "eur" })).toEqual({
      revenueAmount: -4.5,
      revenueCurrency: "EUR",
    });
  });

  it("drops the revenue when the amount or the currency is invalid", () => {
    for (const revenue of [
      undefined,
      null,
      "15.99 USD",
      [15.99, "USD"],
      { amount: 15.99 },
      { currency: "USD" },
      { amount: Number.NaN, currency: "USD" },
      { amount: Number.POSITIVE_INFINITY, currency: "USD" },
      { amount: "", currency: "USD" },
      { amount: "12abc", currency: "USD" },
      { amount: "0x10", currency: "USD" },
      { amount: "1e3", currency: "USD" },
      { amount: true, currency: "USD" },
      { amount: 10, currency: "US" },
      { amount: 10, currency: "DOLLARS" },
      { amount: 10, currency: "ZZZ" },
      { amount: 10, currency: 840 },
    ]) {
      expect(normalizeEventRevenue(revenue)).toEqual(NO_REVENUE);
    }
  });
});
