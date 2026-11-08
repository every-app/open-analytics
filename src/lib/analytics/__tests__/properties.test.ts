import { describe, expect, it } from "vitest";

import {
  normalizeProperties,
  PROPERTY_LIMITS,
} from "@/lib/analytics/properties";

describe("custom properties", () => {
  it("keeps flat string pairs, trimmed", () => {
    expect(
      normalizeProperties({ author: " Jane ", " page type ": "post" }),
    ).toEqual({ author: "Jane", "page type": "post" });
  });

  it("is empty for anything but an object", () => {
    for (const input of [undefined, null, "author=Jane", 3, ["Jane"]]) {
      expect(normalizeProperties(input)).toEqual({});
    }
  });

  it("keeps numbers and booleans as strings, as Plausible does", () => {
    expect(normalizeProperties({ count: 5, price: 9.5, flag: true })).toEqual({
      count: "5",
      price: "9.5",
      flag: "true",
    });
  });

  it("drops nested values and nulls key by key, and pairs with an empty key or value", () => {
    expect(
      normalizeProperties({
        "": "no key",
        "  ": "blank key",
        empty: "",
        blank: "   ",
        nested: { a: "b" },
        list: ["a"],
        missing: null,
        kept: "yes",
      }),
    ).toEqual({ kept: "yes" });
  });

  it("drops keys over the limit and cuts values to it", () => {
    const longKey = "k".repeat(PROPERTY_LIMITS.keyLength + 1);
    const maxKey = "k".repeat(PROPERTY_LIMITS.keyLength);
    expect(
      normalizeProperties({
        [longKey]: "dropped",
        [maxKey]: "v".repeat(PROPERTY_LIMITS.valueLength + 10),
      }),
    ).toEqual({ [maxKey]: "v".repeat(PROPERTY_LIMITS.valueLength) });
  });

  it("keeps the first pairs up to the count limit", () => {
    const input = Object.fromEntries(
      Array.from({ length: PROPERTY_LIMITS.count + 5 }, (_, index) => [
        `key-${index}`,
        "value",
      ]),
    );
    const properties = normalizeProperties(input);
    expect(Object.keys(properties)).toEqual(
      Object.keys(input).slice(0, PROPERTY_LIMITS.count),
    );
  });

  it("keeps __proto__ as an ordinary key", () => {
    const properties = normalizeProperties(
      JSON.parse('{"__proto__": "x", "author": "Jane"}'),
    );
    expect(Object.keys(properties)).toEqual(["__proto__", "author"]);
    expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
  });
});
