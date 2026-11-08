import { describe, expect, it } from "vitest";

import {
  propertyFilterValue,
  setDashboardFilterValue,
  setPropertyFilterValue,
} from "@/lib/dashboard/filter-state";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  serializeFilterParams,
} from "@/lib/filter-contract";

const EMPTY: FilterDocument = { conditions: [] };

describe("custom property filters", () => {
  it("filters by a key's value, beside the page's other filters", () => {
    const withPath = setDashboardFilterValue(EMPTY, "path", "/blog");
    const filtered = setPropertyFilterValue(withPath, "author", "Jane");

    expect(propertyFilterValue(filtered, "author")).toBe("Jane");
    expect(propertyFilterValue(filtered, "section")).toBeUndefined();
    expect([
      ...serializeFilterParams(filtered, analyticsFilterRegistry),
    ]).toEqual([
      ["filter[page.path]", "/blog"],
      ["filter[property][author]", "Jane"],
    ]);
  });

  it("replaces a key's value and clears it, keeping other keys", () => {
    const jane = setPropertyFilterValue(EMPTY, "author", "Jane");
    const both = setPropertyFilterValue(jane, "section", "blog");
    const john = setPropertyFilterValue(both, "author", "John");

    expect(propertyFilterValue(john, "author")).toBe("John");
    expect(propertyFilterValue(john, "section")).toBe("blog");

    const cleared = setPropertyFilterValue(john, "author", null);
    expect(propertyFilterValue(cleared, "author")).toBeUndefined();
    expect(propertyFilterValue(cleared, "section")).toBe("blog");
    expect(
      setPropertyFilterValue(
        setPropertyFilterValue(EMPTY, "author", "Jane"),
        "author",
        null,
      ).conditions,
    ).toEqual([]);
  });
});
