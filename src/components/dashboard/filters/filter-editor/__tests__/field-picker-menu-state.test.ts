import { describe, expect, it } from "vitest";

import { fieldPickerMenuState } from "@/components/dashboard/filters/filter-editor/value-inputs";

describe("fieldPickerMenuState", () => {
  it("shows an error, not the fields so far, when a later page fails", () => {
    expect(
      fieldPickerMenuState({
        isError: true,
        isFetching: false,
        hasMorePages: false,
        suggestionCount: 100,
      }),
    ).toBe("error");
  });

  it("keeps loading until every page is in, then lists or says empty", () => {
    const state = (isFetching: boolean, hasMorePages: boolean, count: number) =>
      fieldPickerMenuState({
        isError: false,
        isFetching,
        hasMorePages,
        suggestionCount: count,
      });
    expect(state(false, true, 100)).toBe("loading");
    expect(state(true, false, 0)).toBe("loading");
    expect(state(false, false, 3)).toBe("suggestions");
    expect(state(false, false, 0)).toBe("empty");
  });
});
