import { describe, expect, it } from "vitest";

import {
  emptyDashboardFilterOptions,
  emptyEventFieldValues,
} from "@/lib/dashboard/client/data/empty";

const EMPTY_PAGINATION = {
  limit: 1,
  returned: 0,
  hasMore: false,
  nextCursor: null,
};

describe("dashboard client empty data builders", () => {
  it("preserves requested empty metadata values", () => {
    expect(emptyEventFieldValues("payload.plan", "string")).toEqual({
      ok: true,
      fieldPath: "payload.plan",
      fieldValueType: "string",
      data: { items: [], pagination: EMPTY_PAGINATION },
    });
  });

  it("builds empty filter suggestions", () => {
    expect(emptyDashboardFilterOptions()).toEqual({
      ok: true,
      data: { items: [], pagination: EMPTY_PAGINATION },
    });
  });
});
