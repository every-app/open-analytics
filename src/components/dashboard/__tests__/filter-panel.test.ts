import { describe, expect, it } from "vitest";

import { allowedFields } from "@/components/dashboard/filters/filter-editor/field-catalog";

describe("registry-driven editor metadata", () => {
  it("keeps fields in the explicit product order", () => {
    expect(allowedFields("private-dashboard").map((field) => field.id)).toEqual(
      [
        "page.path",
        "page.title",
        "page.hostname",
        "page.durationMs",
        "page.scrollDepth",
        "page.query",
        "page.hash",
        "event.name",
        "property",
        "session.entryPath",
        "session.exitPath",
        "referrer.domain",
        "referrer.url",
        "traffic.channel",
        "utm.source",
        "utm.medium",
        "utm.campaign",
        "utm.term",
        "utm.content",
        "client.deviceType",
        "client.browser",
        "client.browserVersion",
        "client.browserEngine",
        "client.os",
        "client.osVersion",
        "client.language",
        "client.screenSize",
        "client.screenWidth",
        "client.screenHeight",
        "geo.country",
        "geo.region",
        "geo.city",
        "geo.continent",
        "geo.timeZone",
        "geo.isEU",
      ],
    );
  });

  it("exposes number fields with registry group and no-suggestion metadata", () => {
    const field = allowedFields("public-share").find(
      (field) => field.id === "client.screenWidth",
    );
    expect(field?.group).toBe("device");
    expect(field?.suggestionMode).toBe("none");
    expect(field?.unit).toBe("px");
    expect(field?.number).toEqual({ min: 0, step: 1 });
  });
});
