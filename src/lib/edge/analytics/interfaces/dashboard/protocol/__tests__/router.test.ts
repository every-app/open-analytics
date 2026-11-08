import { describe, expect, it } from "vitest";

import {
  applyPublicQueryPolicy,
  operationForQueryRoute,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/router";
describe("Analytics route protocol mapping", () => {
  it("keeps every protocol route mapped to its canonical operation", () => {
    const routes: Array<[string, string]> = [
      ["overview", "overview"],
      ["trend", "trend"],
      ["pages", "pages"],
      ["pages-dashboard", "pages-dashboard"],
      ["referrers", "referrers"],
      ["filter-values", "filter-values"],
      ["funnels", "funnel-analysis"],
      ["goal-summary", "goal-summary"],
      ["goal-timeseries", "goal-timeseries"],
      ["team-dashboard", "team-dashboard"],
      ["events-summary", "event-summary"],
      ["events-trend", "event-trend"],
      ["event-types", "event-types"],
      ["event-type-detail", "event-type-detail"],
      ["events-records", "event-records"],
      ["overview-source-channel", "channels"],
      ["overview-source-domain", "referrers"],
      ["unknown-dimension", "dimension"],
    ];

    for (const [route, operation] of routes) {
      expect(operationForQueryRoute(route), route).toBe(operation);
    }
  });

  it("sanitizes public query details without allowing hidden filters", () => {
    const sanitized = applyPublicQueryPolicy(
      new URL("https://app.test/share?details=1&fullUrl=1"),
    );
    expect(sanitized.allowed).toBe(true);
    expect(sanitized.url.search).toBe("");

    for (const url of [
      "https://app.test/share?query=secret",
      "https://app.test/share?sourceLink=secret",
      "https://app.test/share?filterKey=sourceLink",
    ]) {
      expect(applyPublicQueryPolicy(new URL(url)).allowed).toBe(false);
    }
    expect(
      applyPublicQueryPolicy(new URL("https://app.test/share")).allowed,
    ).toBe(true);
  });
});
