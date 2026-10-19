import { describe, expect, it } from "vitest";

import { normalizeLocalePath, parseShellRouteState } from "./navigation";

describe("normalizeLocalePath", () => {
  it("strips every locale prefix", () => {
    expect(normalizeLocalePath("/zh-tw/app/sites/site")).toBe(
      "/app/sites/site",
    );
    expect(normalizeLocalePath("/zh/app/sites/site")).toBe("/app/sites/site");
    expect(normalizeLocalePath("/en/app/sites/site")).toBe("/app/sites/site");
    expect(normalizeLocalePath("/ja/app/sites/site")).toBe("/app/sites/site");
  });
});

describe("parseShellRouteState", () => {
  it("keeps a detail page's section active and its date controls on", () => {
    expect(
      parseShellRouteState("/en/app/sites/example-com/sessions/detail"),
    ).toEqual({
      siteSlug: "example-com",
      siteSection: "sessions",
      siteSubSection: "detail",
      usesDateRange: true,
    });
  });

  it("opens a site on its overview, and its settings without date controls", () => {
    expect(parseShellRouteState("/en/app/sites/example-com")).toMatchObject({
      siteSection: "overview",
      usesDateRange: true,
    });
    expect(
      parseShellRouteState("/en/app/sites/example-com/settings"),
    ).toMatchObject({ siteSection: "settings", usesDateRange: false });
  });

  it("shows date controls only on the organization pages that chart a period", () => {
    expect(parseShellRouteState("/en/app")).toEqual({
      orgPage: "all-sites",
      usesDateRange: true,
    });
    expect(parseShellRouteState("/en/app/settings/account")).toEqual({
      orgPage: "settings",
      usesDateRange: false,
    });
    expect(parseShellRouteState("/en/app/settings/performance")).toEqual({
      orgPage: "settings",
      usesDateRange: true,
    });
  });
});
