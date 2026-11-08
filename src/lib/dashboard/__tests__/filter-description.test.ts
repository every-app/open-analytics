import { describe, expect, it } from "vitest";

import {
  describeFilter,
  describeFilterCondition,
} from "@/lib/dashboard/filter-description";
import {
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterCondition,
  type FilterFieldId,
  FilterOperator,
  parseFilterDsl,
} from "@/lib/filter-contract";

const messages = {
  conditionDescription: {
    and: "and",
    or: "or",
    emptyFilter: "No filter conditions",
    filterEquals: "{field} equals {value}",
    filterNotEquals: "{field} does not equal {value}",
    filterAnyOf: "{field} is one of {values}",
    filterNoneOf: "{field} is none of {values}",
    filterBetween: "{field} is between {from} and {to}",
    filterContains: "{field} contains {value}",
    filterNotContains: "{field} does not contain {value}",
    filterStartsWith: "{field} starts with {value}",
    filterEndsWith: "{field} ends with {value}",
    filterGreaterThan: "{field} is greater than {value}",
    filterGreaterThanOrEqual: "{field} is greater than or equal to {value}",
    filterLessThan: "{field} is less than {value}",
    filterLessThanOrEqual: "{field} is less than or equal to {value}",
    filterExists: "{field} exists",
    filterNotExists: "{field} does not exist",
    filterIsNull: "{field} is null",
    filterNotNull: "{field} is not null",
    filterIsEmpty: "{field} is empty",
    filterNotEmpty: "{field} is not empty",
  },
  filterBuilder: {
    fieldLabels: {
      "page.path": "Page path",
      "referrer.domain": "Referrer domain",
      "client.deviceType": "Device type",
      "event.payload": "Event payload",
      "page.durationMs": "Page duration",
      "event.name": "Event name",
    },
  },
} as never;

const describe_ = (source: string) =>
  describeFilter(
    parseFilterDsl(source, analyticsFilterRegistry),
    analyticsFilterRegistry,
    messages,
  );

describe("filter descriptions", () => {
  it("joins every condition with and, in the filter's canonical order", () => {
    expect(
      describe_(
        'page.path eq "/pricing" AND client.deviceType notIn ["mobile", "tablet"] AND event.payload("/score") between [120, 130]',
      ),
    ).toBe(
      'Event payload (/score) is between 120 and 130 and Device type is none of "mobile" or "tablet" and Page path equals "/pricing"',
    );
  });

  it("uses the localized empty description", () => {
    expect(
      describeFilter(EMPTY_FILTER_DOCUMENT, analyticsFilterRegistry, messages),
    ).toBe("No filter conditions");
  });

  it("naturalizes scalar comparisons and valueless operators", () => {
    expect(
      describe_(
        'page.path contains "docs" AND page.durationMs gte 1000 AND event.name exists AND referrer.domain notEmpty',
      ),
    ).toBe(
      'Event name exists and Page duration is greater than or equal to 1000 and Page path contains "docs" and Referrer domain is not empty',
    );
  });

  it("describes every operator, by the field's id when it has no label", () => {
    const cases = [
      [FilterOperator.Neq, "alpha", "does not equal"],
      [FilterOperator.NotContains, "alpha", "does not contain"],
      [FilterOperator.StartsWith, "alpha", "starts with"],
      [FilterOperator.EndsWith, "alpha", "ends with"],
      [FilterOperator.Gt, 1, "greater than"],
      [FilterOperator.Lt, 2, "less than"],
      [FilterOperator.Lte, 2, "less than or equal to"],
      [FilterOperator.In, ["a", "b"], "is one of"],
      [FilterOperator.NotExists, undefined, "does not exist"],
      [FilterOperator.IsNull, undefined, "is null"],
      [FilterOperator.NotNull, undefined, "is not null"],
      [FilterOperator.IsEmpty, undefined, "is empty"],
    ] as const;

    for (const [operator, value, expected] of cases) {
      const condition = {
        target: { kind: "field", field: "unknown.field" as FilterFieldId },
        operator,
        ...(value === undefined ? {} : { value }),
      } as FilterCondition;
      const description = describeFilterCondition(
        condition,
        analyticsFilterRegistry,
        messages,
      );
      expect(description).toContain(expected);
      expect(description).toContain("unknown.field");
    }
  });
});
