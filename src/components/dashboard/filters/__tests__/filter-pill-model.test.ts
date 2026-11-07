import { describe, expect, it } from "vitest";

import { filterPills } from "@/components/dashboard/filters/filter-pill-model";
import {
  EMPTY_DASHBOARD_FILTER_DOCUMENT,
  setDashboardFilterValue,
} from "@/lib/dashboard/filter-state";
import {
  analyticsFilterRegistry,
  attachFilterScopePreference,
  filterScopePreferenceFromDocument,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import { getMessages } from "@/lib/i18n/messages";

const messages = getMessages("en");
const dsl = (text: string) => parseFilterDsl(text, analyticsFilterRegistry);
const labels = (document: Parameters<typeof filterPills>[0]) =>
  filterPills(document, messages, "en").map((pill) => pill.label);

describe("filter pills", () => {
  it("shows nothing while the page is unfiltered", () => {
    expect(
      filterPills(EMPTY_DASHBOARD_FILTER_DOCUMENT, messages, "en"),
    ).toEqual([]);
  });

  it("says each card filter the way its card names it", () => {
    let document = setDashboardFilterValue(
      EMPTY_DASHBOARD_FILTER_DOCUMENT,
      "path",
      "/pricing",
    );
    document = setDashboardFilterValue(document, "channel", "organic_search");
    document = setDashboardFilterValue(document, "sourceDomain", "__direct__");
    document = setDashboardFilterValue(document, "clientDeviceType", "mobile");
    document = setDashboardFilterValue(document, "utmCampaign", "launch");

    // In the filters' own order, which normalizing sets.
    expect([...labels(document)].sort()).toEqual([
      "Channel is Organic search",
      "Device is Mobile",
      "Page is /pricing",
      "Source is Direct",
      "UTM campaign is launch",
    ]);
  });

  it("names a country, and a location by its most specific part", () => {
    expect(
      labels(
        setDashboardFilterValue(EMPTY_DASHBOARD_FILTER_DOCUMENT, "geo", "DE"),
      ),
    ).toEqual(["Country is Germany"]);

    const city = setDashboardFilterValue(
      setDashboardFilterValue(EMPTY_DASHBOARD_FILTER_DOCUMENT, "path", "/"),
      "geo",
      "DE::BY::Bavaria::Munich",
    );
    const pills = filterPills(city, messages, "en");
    expect(pills.map((pill) => pill.label).sort()).toEqual([
      "City is Munich",
      "Page is /",
    ]);
    // Removing the location takes its country, region and city together.
    const location = pills.find((pill) => pill.key === "location")!;
    expect(formatFilterDsl(location.without)).toBe('page.path eq "/"');
  });

  it("removes one filter and keeps the rest and the scope", () => {
    const document = attachFilterScopePreference(
      dsl('page.path eq "/a" AND client.browser eq "Firefox"'),
      "session",
    );
    const [page, browser] = filterPills(document, messages, "en");

    expect(page!.label).toBe("Page is /a");
    expect(formatFilterDsl(page!.without)).toBe('client.browser eq "Firefox"');
    expect(filterScopePreferenceFromDocument(page!.without)).toBe("session");
    expect(formatFilterDsl(browser!.without)).toBe('page.path eq "/a"');
  });

  it("words the other operators, and lists several values", () => {
    expect(
      labels(
        dsl(
          'page.path neq "/admin" AND page.path contains "blog" AND utm.source in ["a", "b"]',
        ),
      ),
    ).toEqual([
      "Page is not /admin",
      "Page contains blog",
      "UTM source is a or b",
    ]);
    // A field no card offers goes by the filter builder's name for it.
    expect(labels(dsl('page.title eq "Home"'))).toEqual(["Page title is Home"]);
    expect(labels(dsl("utm.term notEmpty"))).toEqual(["UTM term is not empty"]);
  });

  it("shows an OR or a NOT as one pill that clears it", () => {
    const either = dsl('page.path eq "/a" OR page.path eq "/b"');
    const [pill] = filterPills(either, messages, "en");
    expect(pill!.label).toContain("/a");
    expect(pill!.label).toContain("/b");
    expect(pill!.without.root).toBeNull();

    const nested = dsl(
      'client.browser eq "Firefox" AND (page.path eq "/a" OR page.path eq "/b")',
    );
    const pills = filterPills(nested, messages, "en");
    expect(pills).toHaveLength(2);
    expect(formatFilterDsl(pills[1]!.without)).toBe(
      'client.browser eq "Firefox"',
    );
  });
});
