import { describe, expect, it } from "vitest";

import { dashboardPageTitle } from "@/lib/page-title";

describe("dashboardPageTitle", () => {
  it("names the page, its site if any, and the app, never the organization", () => {
    expect(
      dashboardPageTitle("All sites", {
        teamContext: { activeTeam: { name: "org_8f3k2" } },
      }),
    ).toBe("All sites · OpenAnalytics");
    expect(
      dashboardPageTitle("Overview", {
        siteContext: { activeSite: { name: "Docs" } },
      }),
    ).toBe("Overview · Docs · OpenAnalytics");
  });
});
