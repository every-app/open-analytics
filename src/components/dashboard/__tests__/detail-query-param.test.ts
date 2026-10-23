import { describe, expect, it } from "vitest";

import {
  parsePeopleView,
  PeopleView,
  sessionDetailHref,
  visitorDetailHref,
} from "@/components/dashboard/site-pages/common/detail-query-param";
import { buildSettingsPath, buildSitePath } from "@/lib/dashboard/paths";

describe("the Visitors page's views", () => {
  it("shows visitors unless sessions are asked for", () => {
    expect(parsePeopleView(new URLSearchParams())).toBe(PeopleView.Visitors);
    expect(parsePeopleView(new URLSearchParams("view=other"))).toBe(
      PeopleView.Visitors,
    );
    expect(parsePeopleView(new URLSearchParams("view=sessions"))).toBe(
      PeopleView.Sessions,
    );
  });

  it("opens journeys on the Visitors page", () => {
    const site = buildSitePath("en", "docs");
    expect(visitorDetailHref(site, "v 1")).toBe(
      "/en/app/sites/docs/visitors?detail=v%201",
    );
    expect(sessionDetailHref(site, "s/1")).toBe(
      "/en/app/sites/docs/visitors?view=sessions&detail=s%2F1",
    );
  });
});

describe("paths", () => {
  it("builds site and settings paths", () => {
    expect(buildSitePath("ja", "docs", "devices")).toBe(
      "/ja/app/sites/docs/devices",
    );
    expect(buildSettingsPath("en")).toBe("/en/app/settings");
    expect(buildSettingsPath("en", "system")).toBe("/en/app/settings/system");
  });
});
