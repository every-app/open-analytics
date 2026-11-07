import { describe, expect, it } from "vitest";

import {
  SOURCE_CARD_FILTER_CONTROL_BY_TAB,
  SOURCE_CARD_TABS,
} from "@/components/dashboard/site-pages/overview/overview-filter-model";
import {
  buildUtmSourceCardRows,
  isUtmTab,
  UTM_TABS,
  utmTabLabel,
  withUtmTag,
} from "@/components/dashboard/site-pages/overview/utm-tabs";
import {
  dashboardFilterValue,
  EMPTY_DASHBOARD_FILTER_DOCUMENT,
  setDashboardFilterValue,
} from "@/lib/dashboard/filter-state";
import type { DimensionRow } from "@/lib/dashboard-api/client/edge";
import {
  analyticsFilterRegistry,
  attachFilterScopePreference,
  filterScopePreferenceFromDocument,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import { getMessages } from "@/lib/i18n/messages";

const messages = getMessages("en");

describe("Sources card UTM tabs", () => {
  it("follows the referrer tabs with one tab per UTM parameter", () => {
    expect(UTM_TABS).toEqual([
      "source",
      "medium",
      "campaign",
      "term",
      "content",
    ]);
    expect(SOURCE_CARD_TABS).toEqual([
      "domain",
      "link",
      "channel",
      ...UTM_TABS,
    ]);
    expect(UTM_TABS.every(isUtmTab)).toBe(true);
    expect(["domain", "link", "channel"].some(isUtmTab)).toBe(false);
  });

  it("labels each tab with its campaign copy", () => {
    expect(UTM_TABS.map((tab) => utmTabLabel(tab, messages))).toEqual([
      messages.campaigns.tabSource,
      messages.campaigns.tabMedium,
      messages.campaigns.tabCampaign,
      messages.campaigns.tabTerm,
      messages.campaigns.tabContent,
    ]);
  });

  it("counts only visits tagged with the tab's UTM value", () => {
    expect(
      formatFilterDsl(withUtmTag(EMPTY_DASHBOARD_FILTER_DOCUMENT, "medium")),
    ).toBe("utm.medium notEmpty");
    const filters = parseFilterDsl(
      'client.deviceType eq "mobile"',
      analyticsFilterRegistry,
    );
    expect(formatFilterDsl(withUtmTag(filters, "source"))).toBe(
      'client.deviceType eq "mobile" AND utm.source notEmpty',
    );
  });

  it("keeps the Overview's scope on the tagged filters", () => {
    for (const filters of [
      EMPTY_DASHBOARD_FILTER_DOCUMENT,
      parseFilterDsl('client.deviceType eq "mobile"', analyticsFilterRegistry),
    ]) {
      const scoped = attachFilterScopePreference(filters, "session");
      expect(
        filterScopePreferenceFromDocument(withUtmTag(scoped, "campaign")),
      ).toBe("session");
    }
  });

  it("reads rows as the UTM reports send them: a label and no value", () => {
    const apiRows = [
      { key: "newsletter", label: "newsletter", views: 3, sessions: 1 },
    ] as unknown as DimensionRow[];
    expect(
      buildUtmSourceCardRows("source", apiRows, "(not set)")[0],
    ).toMatchObject({ key: "newsletter", filterValue: "newsletter" });
  });

  it("builds source card rows with trimmed values, a not-set label, and comparisons", () => {
    const rows = buildUtmSourceCardRows(
      "term",
      [
        {
          value: " analytics ",
          label: "",
          views: 12,
          sessions: 4,
          visitors: 3,
        },
        { value: "", label: "", views: -5, sessions: 0 },
        {
          value: "newsletter",
          label: "newsletter",
          views: 7,
          sessions: 3,
          visitors: 2,
          reference: { views: 5, sessions: 2, visitors: 1 },
          change: {
            views: { absolute: 2, relative: 0.4 },
            sessions: { absolute: 1, relative: 0.5 },
            visitors: { absolute: 1, relative: 1 },
          },
        },
      ] satisfies DimensionRow[],
      "(not set)",
    );

    expect(rows).toEqual([
      {
        key: "analytics",
        label: "analytics",
        filterValue: "analytics",
        targetUrl: null,
        views: 12,
        visitors: 3,
        reference: undefined,
        change: undefined,
        mono: true,
      },
      {
        key: "__empty__:term:1",
        label: "(not set)",
        filterValue: "",
        targetUrl: null,
        views: 0,
        visitors: 0,
        reference: undefined,
        change: undefined,
        mono: true,
      },
      expect.objectContaining({
        key: "newsletter",
        filterValue: "newsletter",
        reference: { views: 5, sessions: 2, visitors: 1 },
        change: expect.objectContaining({
          visitors: { absolute: 1, relative: 1 },
        }),
      }),
    ]);
    expect(
      buildUtmSourceCardRows(
        "source",
        [{ value: "google", label: "google", views: 1, sessions: 1 }],
        "(not set)",
      )[0]?.mono,
    ).toBe(false);
  });

  it("filters the dashboard by a clicked UTM row", () => {
    expect(SOURCE_CARD_FILTER_CONTROL_BY_TAB.campaign).toBe("utmCampaign");
    const filtered = setDashboardFilterValue(
      EMPTY_DASHBOARD_FILTER_DOCUMENT,
      SOURCE_CARD_FILTER_CONTROL_BY_TAB.campaign,
      "launch",
    );
    expect(formatFilterDsl(filtered)).toBe('utm.campaign eq "launch"');
    expect(dashboardFilterValue(filtered, "utmCampaign")).toBe("launch");
  });
});
