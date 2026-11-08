import { describe, expect, it } from "vitest";

import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import { dashboardFilterDocumentFromPresentation } from "@/lib/dashboard/filter-state";

describe("filterQueryKey", () => {
  it("is the canonical filter fingerprint, and the empty one without a filter", () => {
    const filters = dashboardFilterDocumentFromPresentation({ path: "/docs" });

    expect(filterQueryKey(filters)).toContain("filter-v2:");
    expect(filterQueryKey(filters)).toContain("page.path");
    expect(filterQueryKey()).toBe(
      filterQueryKey(dashboardFilterDocumentFromPresentation({})),
    );
  });

  it("is stable for equivalent filter documents", () => {
    const first = dashboardFilterDocumentFromPresentation({
      path: "/docs",
      browser: "Chrome",
    });
    const second = dashboardFilterDocumentFromPresentation({
      browser: "Chrome",
      path: "/docs",
    });

    expect(filterQueryKey(first)).toBe(filterQueryKey(second));
  });
});
