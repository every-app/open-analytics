import { describe, expect, it } from "vitest";

import { propertyKeyOf, propertyPath } from "@/lib/analytics/property-path";
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

const EMPTY: FilterDocument = { version: 1, root: null };

describe("custom property filters", () => {
  it("names a key by a top-level JSON pointer and back", () => {
    expect(propertyPath("author")).toBe("/author");
    expect(propertyPath("a/b~c")).toBe("/a~1b~0c");
    expect(propertyKeyOf("/a~1b~0c")).toBe("a/b~c");
    expect(propertyKeyOf("/author/name")).toBeNull();
    expect(propertyKeyOf("author")).toBeNull();
  });

  it("filters by a key's value, beside the page's other filters", () => {
    const withPath = setDashboardFilterValue(EMPTY, "path", "/blog");
    const filtered = setPropertyFilterValue(withPath, "author", "Jane");

    expect(propertyFilterValue(filtered, "author")).toBe("Jane");
    expect(propertyFilterValue(filtered, "section")).toBeUndefined();
    expect([
      ...serializeFilterParams(filtered, analyticsFilterRegistry),
    ]).toEqual([
      ["filter[event.payload][/author]", "Jane"],
      ["filter[page.path]", "/blog"],
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
      ).root,
    ).toBeNull();
  });
});
