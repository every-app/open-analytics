import { describe, expect, it } from "vitest";

import {
  conditionIdFactory,
  defaultCondition,
  documentFromEditor,
  editorConditionsFromDocument,
  editorConditionsFromDsl,
  EditorError,
  filterDslFromEditor,
  filterValueKey,
  filterValueText,
  firstOperator,
  stripSuggestionFacet,
} from "@/components/dashboard/filters/filter-editor/model";
import {
  analyticsFilterRegistry,
  FilterOperator,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract";

const parsed = (source: string) =>
  parseFilterDsl(source, analyticsFilterRegistry);

describe("filter editor model", () => {
  it("creates rows with stable ids and the field's first operator", () => {
    const createId = conditionIdFactory();
    expect(createId()).toBe("filter-node-1");
    expect(defaultCondition(createId)).toMatchObject({
      id: "filter-node-2",
      field: "page.path",
      operator: FilterOperator.Eq,
      valueDirty: true,
    });
    expect(firstOperator(analyticsFilterRegistry.get("page.path")!)).toBe(
      FilterOperator.Eq,
    );
    expect(
      firstOperator({
        operators: new Set([FilterOperator.Gte, FilterOperator.Lt]),
      } as never),
    ).toBe(FilterOperator.Gte);
    expect(filterValueText(null)).toBe("null");
    expect(filterValueText(3)).toBe("3");
    expect(filterValueKey("value")).toBe('"value"');
  });

  it("strips only the condition a value picker suggests for", () => {
    const source = parsed(
      'page.path eq "/docs" AND geo.country eq "US" AND property("id") eq "1"',
    );
    expect(stripSuggestionFacet(source, "page.path", "")).toEqual(
      parsed('geo.country eq "US" AND property("id") eq "1"'),
    );
    expect(stripSuggestionFacet(source, "property", "id")).toEqual(
      parsed('page.path eq "/docs" AND geo.country eq "US"'),
    );
    expect(stripSuggestionFacet(source, "property", "")).toEqual(source);
  });

  it("reads rows from a filter, and none from DSL that doesn't parse", () => {
    const source = 'page.path in ["/docs", "/pricing"] AND page.title exists';
    const rows = editorConditionsFromDsl(source, conditionIdFactory());
    expect(rows).toMatchObject([
      {
        field: "page.path",
        operator: FilterOperator.In,
        listValues: ["/docs", "/pricing"],
        valueText: "/docs, /pricing",
        valueDirty: false,
      },
      { field: "page.title", operator: FilterOperator.Exists },
    ]);
    expect(filterDslFromEditor(rows)).toBe(formatFilterDsl(parsed(source)));
    expect(
      editorConditionsFromDsl("page.path eq", conditionIdFactory()),
    ).toEqual([]);
    expect(
      editorConditionsFromDocument(
        parsed('property("plan") eq "3"'),
        conditionIdFactory(),
      ),
    ).toMatchObject([
      { field: "property", propertyKey: "plan", valueText: "3" },
    ]);
  });

  it("converts typed values and refuses incomplete rows", () => {
    const createId = conditionIdFactory();
    const row = (
      field: string,
      operator: FilterOperator,
      valueText: string,
      extra: object = {},
    ) => ({
      ...defaultCondition(createId),
      field,
      operator,
      valueText,
      ...extra,
    });

    expect(
      documentFromEditor([
        row("page.durationMs", FilterOperator.Gte, "12.5"),
        row("page.path", FilterOperator.In, "/docs, /pricing"),
        row("geo.isEU", FilterOperator.Eq, "true"),
        row("page.title", FilterOperator.Exists, ""),
        row("property", FilterOperator.In, "basic, pro", {
          propertyKey: "plan",
        }),
        row("property", FilterOperator.Eq, "true", {
          propertyKey: "active",
        }),
        row("geo.country", FilterOperator.In, "", {
          listValues: ["US", "DE"],
        }),
      ]),
    ).toEqual(
      parsed(
        'page.durationMs gte 12.5 AND page.path in ["/docs", "/pricing"] AND geo.isEU eq true AND page.title exists AND property("plan") in ["basic", "pro"] AND property("active") eq "true" AND geo.country in ["US", "DE"]',
      ),
    );
    expect(() => documentFromEditor([defaultCondition(createId)])).toThrow(
      EditorError.MissingValue,
    );
    expect(() =>
      documentFromEditor([row("missing.field", FilterOperator.Eq, "x")]),
    ).toThrow(EditorError.UnknownField);
  });
});
