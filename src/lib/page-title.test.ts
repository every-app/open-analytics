import { describe, expect, it } from "vitest";

import { dashboardPageTitle } from "@/lib/page-title";

describe("dashboardPageTitle", () => {
  it("matches the former root metadata template", () => {
    expect(dashboardPageTitle("Sign in", {})).toBe("Sign in - Open Analytics");
  });

  it("matches the former team metadata template", () => {
    expect(
      dashboardPageTitle("Sites", {
        teamContext: { activeTeam: { name: "Product" } },
      }),
    ).toBe("Sites · Product - Open Analytics");
  });

  it("matches the former site metadata template", () => {
    expect(
      dashboardPageTitle("Overview", {
        siteContext: {
          activeSite: { name: "Docs" },
          activeTeam: { name: "Product" },
        },
      }),
    ).toBe("Overview · Docs · Product - Open Analytics");
  });
});
