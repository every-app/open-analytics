import { describe, expect, it } from "vitest";

import {
  FilterAdapterError,
  parseFilterUrlForAudience,
} from "@/lib/edge/analytics/contract";

describe("filter protocol adapters", () => {
  it("fails public-sensitive fields before a reader can run", () => {
    for (const input of [
      "filter[page.query]=campaign=spring",
      "filter[event.payload][/plan]=pro",
      "filter[geo.region]=Ontario",
    ]) {
      expect(() => parseFilterUrlForAudience("public-share", input)).toThrow(
        FilterAdapterError,
      );
      expect(
        parseFilterUrlForAudience("private-dashboard", input).conditions,
      ).toHaveLength(1);
    }
  });
});
