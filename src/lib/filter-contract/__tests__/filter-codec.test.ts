import { describe, expect, it } from "vitest";

import {
  analyticsFilterRegistry,
  FilterCodecError,
  FilterOperator,
  FilterValidationError,
  parseFilterDsl,
  parseFilterParams,
  serializeFilterParams,
} from "@/lib/filter-contract";

function params(source: string) {
  return serializeFilterParams(
    parseFilterDsl(source, analyticsFilterRegistry),
    analyticsFilterRegistry,
  );
}

describe("filter URL codec", () => {
  it("round-trips every operator and custom property through the URL", () => {
    const source = [
      'page.path eq "/pricing"',
      'page.title neq "Home"',
      'geo.country in ["US", "GB"]',
      'utm.source notIn ["a,b", "c\\\\d"]',
      'page.hostname contains "docs"',
      'page.path notContains "/admin"',
      'page.path startsWith "/blog"',
      'referrer.url endsWith "ref=1"',
      "page.durationMs between [100, 200]",
      "page.scrollDepth gt 10",
      "client.screenWidth lte 800",
      "geo.isEU eq true",
      "utm.medium exists",
      'event.payload("/plan") eq "pro"',
      'event.payload("/plan") eq "json:literal"',
      'event.payload("/seats") in [1, 2]',
      'event.payload("/beta") eq false',
      "utm.term isEmpty",
    ].join(" AND ");
    const document = parseFilterDsl(source, analyticsFilterRegistry);
    const url = serializeFilterParams(document, analyticsFilterRegistry);

    expect(parseFilterParams(url, analyticsFilterRegistry)).toEqual(document);
    expect(url.getAll("filter[page.path]")).toEqual([
      "/pricing",
      "nc:/admin",
      "sw:/blog",
    ]);
    expect(url.get("filter[event.payload][/seats]")).toBe("in:json:1,json:2");
    expect(url.get("filter[utm.source]")).toBe("nin:a\\,b,c\\\\d");
  });

  it("reads a URL, its search string or a whole address", () => {
    const expected = parseFilterDsl(
      'page.path eq "eq:/x"',
      analyticsFilterRegistry,
    );
    expect(params('page.path eq "eq:/x"').toString()).toBe(
      "filter%5Bpage.path%5D=eq%3Aeq%3A%2Fx",
    );
    for (const input of [
      "?filter[page.path]=eq:eq:/x",
      "https://example.com/?filter[page.path]=eq:eq:/x&range=7d",
      new URL("https://example.com/?filter[page.path]=eq:eq:/x"),
    ]) {
      expect(parseFilterParams(input, analyticsFilterRegistry)).toEqual(
        expected,
      );
    }
    expect(
      parseFilterParams("range=7d", analyticsFilterRegistry).conditions,
    ).toEqual([]);
    expect(
      parseFilterParams("filter[utm.term]=empty", analyticsFilterRegistry)
        .conditions[0]?.operator,
    ).toBe(FilterOperator.IsEmpty);
  });

  it.each([
    ["filter[page.path", "invalid_filter_key"],
    ["filter[event.payload]=pro", "invalid_filter_key"],
    ["filter[page.path][/x]=a", "invalid_filter_key"],
    ["filter[page.durationMs]=abc", "invalid_number"],
    ["filter[page.durationMs]=", "invalid_number"],
    ["filter[geo.isEU]=yes", "invalid_boolean"],
    ["filter[event.payload][/a]=json:{", "invalid_json_scalar"],
  ])("rejects %s", (query, code) => {
    expect(() => parseFilterParams(query, analyticsFilterRegistry)).toThrow(
      expect.objectContaining({ code }),
    );
    try {
      parseFilterParams(query, analyticsFilterRegistry);
    } catch (error) {
      expect(error).toBeInstanceOf(FilterCodecError);
    }
  });

  it("validates what it reads like any filter", () => {
    expect(() =>
      parseFilterParams("filter[session.bounce]=true", analyticsFilterRegistry),
    ).toThrow(FilterValidationError);
  });
});
