import { describe, expect, it } from "vitest";

import {
  analyticsFilterRegistry,
  FILTER_DSL_EXAMPLES,
  FilterDslParseError,
  FilterOperator,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract";

function parse(source: string) {
  return parseFilterDsl(source, analyticsFilterRegistry);
}

function error(source: string): FilterDslParseError {
  try {
    parse(source);
  } catch (caught) {
    if (caught instanceof FilterDslParseError) return caught;
    throw caught;
  }
  throw new Error("expected a parse error");
}

describe("filter DSL", () => {
  it("parses conditions joined by AND, in any case", () => {
    expect(
      parse(
        'page.path STARTSWITH "/docs" and geo.country in ["US", "gb"] AND page.durationMs between [1.5e3, 2000] AND geo.isEU eq false',
      ).conditions,
    ).toEqual([
      {
        target: { kind: "field", field: "geo.country" },
        operator: FilterOperator.In,
        value: ["gb", "us"],
      },
      {
        target: { kind: "field", field: "geo.isEU" },
        operator: FilterOperator.Eq,
        value: false,
      },
      {
        target: { kind: "field", field: "page.durationMs" },
        operator: FilterOperator.Between,
        value: [1500, 2000],
      },
      {
        target: { kind: "field", field: "page.path" },
        operator: FilterOperator.StartsWith,
        value: "/docs",
      },
    ]);
    expect(parse("  ").conditions).toEqual([]);
  });

  it("parses custom properties, valueless operators and every example", () => {
    expect(
      parse(
        'event.payload("/plan") eq "pro" AND event.payload("/beta") eq true AND event.payload("/seats") gte -2 AND event.payload("/coupon") notExists',
      ).conditions,
    ).toHaveLength(4);
    expect(parse("utm.source notEmpty").conditions[0]).toEqual({
      target: { kind: "field", field: "utm.source" },
      operator: FilterOperator.NotEmpty,
    });
    for (const example of FILTER_DSL_EXAMPLES) {
      expect(() => parse(example), example).not.toThrow();
    }
  });

  it("formats what it parses", () => {
    const source =
      'event.payload("/plan") in ["basic", "pro"] AND page.path notContains "/admin" AND utm.medium exists';
    const document = parse(source);
    expect(parse(formatFilterDsl(document))).toEqual(document);
    expect(formatFilterDsl(document)).toBe(
      'event.payload("/plan") in ["basic", "pro"] AND page.path notContains "/admin" AND utm.medium exists',
    );
  });

  it.each([
    ['page.path eq "/a', "unterminated_string", 13],
    ["page.path eq #", "invalid_token", 13],
    ['"page" eq "/"', "expected_field", 0],
    ['page.path is "/"', "expected_operator", 10],
    ["page.path eq", "expected_value", 12],
    ['page.path eq ["/a" "/b"]', "expected_value", 19],
    ['page.path eq "/" OR page.path eq "/b"', "expected_and", 17],
    ['event.payload "/a" eq 1', "expected_field", 14],
    ['page.path eq "/" AND NOT page.path eq "/b"', "expected_operator", 25],
    ['page.path eq "/" AND session.bounce eq true', "unknown_field", 21],
    ['page.path eq "/" AND page.durationMs eq "1"', "invalid_number", 21],
  ])("points at the error in %s", (source, code, offset) => {
    const parsed = error(source);
    expect(parsed.code).toBe(code);
    expect(parsed.offset).toBe(offset);
    expect(parsed.message).toContain(`at offset ${offset}`);
  });
});
