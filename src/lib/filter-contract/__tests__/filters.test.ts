import { describe, expect, it } from "vitest";

import {
  analyticsFilterRegistry,
  assertFilterAudience,
  type FilterDocument,
  filterFingerprint,
  FilterOperator,
  FilterValidationError,
  hasPagePathFilter,
  matchesOnlyCustomEvents,
  normalizeFilterDocument,
  withoutFilterFields,
} from "@/lib/filter-contract";

function field(
  name: string,
  operator: string,
  value?: unknown,
): Record<string, unknown> {
  return {
    target: { kind: "field", field: name },
    operator,
    ...(value === undefined ? {} : { value }),
  };
}

function normalize(...conditions: unknown[]): FilterDocument {
  return normalizeFilterDocument({ conditions }, analyticsFilterRegistry);
}

function code(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof FilterValidationError) return error.code;
    throw error;
  }
  throw new Error("expected a validation error");
}

describe("filter documents", () => {
  it("canonicalizes values, drops duplicates and orders conditions", () => {
    const document = normalize(
      field("page.path", "eq", " /pricing "),
      field("geo.country", "in", ["us", "GB", "us"]),
      field("page.path", "eq", "/pricing"),
      field("page.scrollDepth", "gte", -0),
    );

    expect(document.conditions).toEqual([
      {
        target: { kind: "field", field: "geo.country" },
        operator: FilterOperator.In,
        value: ["gb", "us"],
      },
      {
        target: { kind: "field", field: "page.path" },
        operator: FilterOperator.Eq,
        value: "/pricing",
      },
      {
        target: { kind: "field", field: "page.scrollDepth" },
        operator: FilterOperator.Gte,
        value: 0,
      },
    ]);
    expect(filterFingerprint(document, analyticsFilterRegistry)).toBe(
      filterFingerprint(
        normalize(
          field("page.scrollDepth", "gte", 0),
          field("geo.country", "in", ["GB", "US"]),
          field("page.path", "eq", "/pricing"),
        ),
        analyticsFilterRegistry,
      ),
    );
  });

  it("takes custom properties by JSON pointer with typed values", () => {
    expect(
      normalize({
        target: { kind: "event-payload", path: "/plan" },
        operator: "between",
        value: [1, 2],
      }).conditions[0]?.value,
    ).toEqual([1, 2]);
    expect(
      code(() =>
        normalize({
          target: { kind: "event-payload", path: "plan" },
          operator: "eq",
          value: "pro",
        }),
      ),
    ).toBe("invalid_json_path");
    expect(
      code(() =>
        normalize({
          target: { kind: "event-payload", path: "/a~2" },
          operator: "eq",
          value: 1,
        }),
      ),
    ).toBe("invalid_json_path");
    expect(code(() => normalize(field("event.payload", "eq", "pro")))).toBe(
      "invalid_target",
    );
  });

  it.each([
    [
      "a document that is not a list",
      () => normalizeFilterDocument({ root: null }, analyticsFilterRegistry),
      "invalid_document",
    ],
    [
      "too many conditions",
      () =>
        normalize(
          ...Array.from({ length: 65 }, (_, index) =>
            field("page.path", "eq", `/${index}`),
          ),
        ),
      "too_many_conditions",
    ],
    [
      "a condition that is not an object",
      () => normalize("page.path"),
      "invalid_condition",
    ],
    [
      "an untyped target",
      () => normalize({ operator: "eq", value: 1 }),
      "invalid_target",
    ],
    [
      "an unknown target kind",
      () => normalize({ target: { kind: "selector" }, operator: "eq" }),
      "invalid_target",
    ],
    [
      "an unknown field",
      () => normalize(field("session.bounce", "eq", true)),
      "unknown_field",
    ],
    [
      "an unknown operator",
      () => normalize(field("page.path", "like", "/")),
      "invalid_operator",
    ],
    [
      "an operator the field lacks",
      () => normalize(field("session.entryPath", "contains", "/")),
      "operator_not_allowed",
    ],
    [
      "a value for a valueless operator",
      () => normalize(field("page.path", "exists", "/")),
      "unexpected_value",
    ],
    [
      "a missing value",
      () => normalize(field("page.path", "eq")),
      "missing_value",
    ],
    [
      "an empty set",
      () => normalize(field("page.path", "in", [])),
      "invalid_set",
    ],
    [
      "a set too large",
      () =>
        normalize(
          field(
            "page.path",
            "in",
            Array.from({ length: 129 }, (_, index) => `/${index}`),
          ),
        ),
      "too_many_set_values",
    ],
    [
      "a list for a scalar operator",
      () => normalize(field("page.path", "eq", ["/"])),
      "invalid_value",
    ],
    [
      "a one-ended range",
      () => normalize(field("page.durationMs", "between", [1])),
      "invalid_range",
    ],
    [
      "a reversed range",
      () => normalize(field("page.durationMs", "between", [2, 1])),
      "reversed_range",
    ],
    [
      "a mixed-type range",
      () =>
        normalize({
          target: { kind: "event-payload", path: "/a" },
          operator: "between",
          value: [1, "2"],
        }),
      "invalid_range",
    ],
    [
      "a non-scalar value",
      () => normalize(field("page.path", "eq", { a: 1 })),
      "invalid_value",
    ],
    [
      "a value too long",
      () => normalize(field("page.path", "eq", "x".repeat(4_097))),
      "value_too_long",
    ],
    [
      "a string for a number",
      () => normalize(field("page.durationMs", "eq", "1")),
      "invalid_number",
    ],
    [
      "a number below the field's minimum",
      () => normalize(field("page.durationMs", "gt", -1)),
      "number_below_minimum",
    ],
    [
      "a number above the field's maximum",
      () => normalize(field("page.scrollDepth", "gt", 101)),
      "number_above_maximum",
    ],
    [
      "a number off the field's step",
      () => normalize(field("page.scrollDepth", "gt", 1.5)),
      "number_not_on_step",
    ],
    [
      "a string for a boolean",
      () => normalize(field("geo.isEU", "eq", "true")),
      "invalid_boolean",
    ],
    [
      "a number for a string",
      () => normalize(field("page.path", "eq", 1)),
      "invalid_string",
    ],
    [
      "an infinite custom property",
      () =>
        normalize({
          target: { kind: "event-payload", path: "/a" },
          operator: "eq",
          value: Infinity,
        }),
      "invalid_number",
    ],
    [
      "a null to compare with",
      () =>
        normalize({
          target: { kind: "event-payload", path: "/a" },
          operator: "eq",
          value: null,
        }),
      "invalid_value",
    ],
    [
      "a number to search text for",
      () =>
        normalize({
          target: { kind: "event-payload", path: "/a" },
          operator: "contains",
          value: 1,
        }),
      "invalid_value",
    ],
  ])("rejects %s", (_name, run, expected) => {
    expect(code(run)).toBe(expected);
  });

  it("answers what the filter holds", () => {
    const document = normalize(
      field("page.path", "contains", "/docs"),
      field("event.name", "eq", "signup"),
      field("geo.country", "eq", "us"),
    );
    expect(hasPagePathFilter(document)).toBe(true);
    expect(matchesOnlyCustomEvents(document)).toBe(true);
    expect(
      matchesOnlyCustomEvents(normalize(field("page.path", "eq", "/"))),
    ).toBe(false);
    expect(
      withoutFilterFields(document, new Set(["page.path", "event.name"]))
        .conditions,
    ).toHaveLength(1);
    expect(hasPagePathFilter({ conditions: [] })).toBe(false);
  });

  it("keeps private fields out of public shares", () => {
    const query = normalize(field("page.query", "eq", "a=1"));
    expect(() =>
      assertFilterAudience(query, analyticsFilterRegistry, "private-dashboard"),
    ).not.toThrow();
    expect(
      code(() =>
        assertFilterAudience(query, analyticsFilterRegistry, "public-share"),
      ),
    ).toBe("field_not_allowed");
  });
});
