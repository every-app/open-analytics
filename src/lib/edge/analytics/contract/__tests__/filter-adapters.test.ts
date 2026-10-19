import { describe, expect, it } from "vitest";

import {
  FilterAdapterError,
  parsePrivateFilterUrl,
  parsePublicFilterUrl,
} from "@/lib/edge/analytics/contract";

describe("filter protocol adapters", () => {
  it("fails public-sensitive fields before a reader can run", () => {
    expect(() =>
      parsePublicFilterUrl("filter[page.query]=campaign=spring"),
    ).toThrow(FilterAdapterError);
    expect(() =>
      parsePublicFilterUrl("filter[event.payload][/plan]=pro"),
    ).toThrow(FilterAdapterError);
    expect(() => parsePublicFilterUrl("filter[geo.region]=Ontario")).toThrow(
      FilterAdapterError,
    );
  });
});
