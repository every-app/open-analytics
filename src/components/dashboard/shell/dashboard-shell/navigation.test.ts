import { describe, expect, it } from "vitest";

import { parseShellRouteState } from "./navigation";

describe("parseShellRouteState", () => {
  it("finds a site page and keeps its date controls on", () => {
    expect(parseShellRouteState("/sites/example-com/visitors")).toEqual({
      siteSlug: "example-com",
      siteSection: "visitors",
      usesDateRange: true,
    });
  });

  it("opens a site on its overview, and its settings without date controls", () => {
    expect(parseShellRouteState("/sites/example-com")).toMatchObject({
      siteSection: "overview",
      usesDateRange: true,
    });
    expect(parseShellRouteState("/sites/example-com/settings")).toMatchObject({
      siteSection: "settings",
      usesDateRange: false,
    });
  });

  it("shows date controls only on the organization pages that chart a period", () => {
    expect(parseShellRouteState("/")).toEqual({
      orgPage: "all-sites",
      usesDateRange: true,
    });
    expect(parseShellRouteState("/settings/account")).toEqual({
      orgPage: "settings",
      usesDateRange: false,
    });
    expect(parseShellRouteState("/settings/system")).toEqual({
      orgPage: "settings",
      usesDateRange: false,
    });
  });
});
