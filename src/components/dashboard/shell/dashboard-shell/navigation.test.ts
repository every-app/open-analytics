import { describe, expect, it } from "vitest";

import { parseShellRouteState, siteNavItemsFor } from "./navigation";

describe("parseShellRouteState", () => {
  it("finds a site page and keeps its date controls on", () => {
    expect(parseShellRouteState("/sites/example-com/funnels")).toEqual({
      siteSlug: "example-com",
      siteSection: "funnels",
      usesDateRange: true,
    });
    // The Pages page is gone: its old address is no site page.
    expect(parseShellRouteState("/sites/example-com/pages")).toMatchObject({
      siteSection: undefined,
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

describe("siteNavItemsFor", () => {
  it("lists Real-time in the sidebar after Overview, and Site settings only for managers", () => {
    expect(siteNavItemsFor(true)).toEqual([
      "overview",
      "realtime",
      "funnels",
      "settings",
    ]);
    expect(siteNavItemsFor(false)).toEqual(["overview", "realtime", "funnels"]);
  });
});
