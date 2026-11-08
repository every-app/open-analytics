import { describe, expect, it } from "vitest";

import { emptyDashboardFilterOptions } from "@/lib/dashboard/client/data/empty";

const EMPTY_PAGINATION = {
  limit: 1,
  returned: 0,
  hasMore: false,
  nextCursor: null,
};

describe("dashboard client empty data builders", () => {
  it("builds empty filter suggestions", () => {
    expect(emptyDashboardFilterOptions()).toEqual({
      ok: true,
      data: { items: [], pagination: EMPTY_PAGINATION },
    });
  });
});
