import { describe, expect, it } from "vitest";

import {
  normalizePageProperties,
  PAGE_PROPERTY_LIMITS,
} from "@/lib/edge/ingest/page-properties";

describe("page view properties", () => {
  it("keeps flat string pairs, trimmed", () => {
    expect(
      normalizePageProperties({ author: " Jane ", " page type ": "post" }),
    ).toEqual({ author: "Jane", "page type": "post" });
  });

  it("is empty for anything but an object", () => {
    for (const input of [undefined, null, "author=Jane", 3, ["Jane"]]) {
      expect(normalizePageProperties(input)).toEqual({});
    }
  });

  it("drops pairs with an empty key or value, or a value that isn't a string", () => {
    expect(
      normalizePageProperties({
        "": "no key",
        "  ": "blank key",
        empty: "",
        blank: "   ",
        count: 5,
        flag: true,
        nested: { a: "b" },
        missing: null,
        kept: "yes",
      }),
    ).toEqual({ kept: "yes" });
  });

  it("drops keys over the limit and cuts values to it", () => {
    const longKey = "k".repeat(PAGE_PROPERTY_LIMITS.keyLength + 1);
    const maxKey = "k".repeat(PAGE_PROPERTY_LIMITS.keyLength);
    expect(
      normalizePageProperties({
        [longKey]: "dropped",
        [maxKey]: "v".repeat(PAGE_PROPERTY_LIMITS.valueLength + 10),
      }),
    ).toEqual({ [maxKey]: "v".repeat(PAGE_PROPERTY_LIMITS.valueLength) });
  });

  it("keeps the first pairs up to the count limit", () => {
    const input = Object.fromEntries(
      Array.from({ length: PAGE_PROPERTY_LIMITS.count + 5 }, (_, index) => [
        `key-${index}`,
        "value",
      ]),
    );
    const properties = normalizePageProperties(input);
    expect(Object.keys(properties)).toEqual(
      Object.keys(input).slice(0, PAGE_PROPERTY_LIMITS.count),
    );
  });

  it("keeps __proto__ as an ordinary key", () => {
    const properties = normalizePageProperties(
      JSON.parse('{"__proto__": "x", "author": "Jane"}'),
    );
    expect(Object.keys(properties)).toEqual(["__proto__", "author"]);
    expect(Object.getPrototypeOf(properties)).toBe(Object.prototype);
  });
});
