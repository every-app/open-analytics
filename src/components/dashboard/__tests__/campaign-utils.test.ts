import { describe, expect, it } from "vitest";

import {
  buildCampaignRowsByTab,
  CAMPAIGN_TABS,
  type CampaignRawRowsByTab,
  withCampaignTag,
} from "@/components/dashboard/campaigns/campaign-utils";
import {
  analyticsFilterRegistry,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
describe("campaign breakdown utilities", () => {
  it("exports the expected campaign tab order", () => {
    expect(CAMPAIGN_TABS).toEqual([
      "source",
      "medium",
      "campaign",
      "term",
      "content",
    ]);
  });

  it("normalizes rows for every campaign tab", () => {
    const rows = buildCampaignRowsByTab(
      {
        source: [
          { value: " google ", views: 12, sessions: 4 },
          { value: "", views: -5, sessions: -2 },
        ],
        medium: [{ value: null, views: "6", sessions: undefined }],
        campaign: [{ value: "Launch", views: undefined, sessions: 3 }],
        term: [{ value: "analytics", views: 2, sessions: 1 }],
        content: [{ value: "hero", views: 8, sessions: 6 }],
      } as unknown as CampaignRawRowsByTab,
      "(not set)",
    );

    expect(rows.source[0]).toEqual({
      key: "google",
      value: "google",
      label: "google",
      views: 12,
      sessions: 4,
      mono: false,
    });
    expect(rows.source[1]).toEqual({
      key: "__empty__:source:1",
      value: "",
      label: "(not set)",
      views: 0,
      sessions: 0,
      mono: false,
    });
    expect(rows.medium[0]).toMatchObject({
      key: "__empty__:medium:0",
      label: "(not set)",
      views: 6,
      sessions: 0,
      mono: false,
    });
    expect(rows.campaign[0]).toMatchObject({
      value: "Launch",
      views: 0,
      sessions: 3,
      mono: false,
    });
    expect(rows.term[0].mono).toBe(true);
    expect(rows.content[0].mono).toBe(true);
  });

  it("treats non-array tab payloads as empty arrays", () => {
    const rows = buildCampaignRowsByTab(
      { source: {} } as unknown as CampaignRawRowsByTab,
      "(not set)",
    );

    expect(rows.source).toEqual([]);
    expect(rows.medium).toEqual([]);
    expect(rows.campaign).toEqual([]);
    expect(rows.term).toEqual([]);
    expect(rows.content).toEqual([]);
  });

  it("uses the legacy label while a dimension value is unavailable", () => {
    const rows = buildCampaignRowsByTab(
      {
        source: [{ label: "newsletter", views: 7, sessions: 3 }],
      } as unknown as CampaignRawRowsByTab,
      "(not set)",
    );

    expect(rows.source).toMatchObject([
      {
        value: "newsletter",
        label: "newsletter",
        views: 7,
        sessions: 3,
      },
    ]);
  });

  it("preserves comparison metrics when the API provides them", () => {
    const rows = buildCampaignRowsByTab(
      {
        source: [
          {
            value: "google",
            views: 12,
            sessions: 4,
            visitors: 3,
            reference: { views: 8, sessions: 2, visitors: 2 },
            change: {
              views: { absolute: 4, relative: 0.5 },
              sessions: { absolute: 2, relative: 1 },
              visitors: { absolute: 1, relative: 0.5 },
            },
          },
        ],
      } as unknown as CampaignRawRowsByTab,
      "(not set)",
    );

    expect(rows.source[0]).toMatchObject({
      visitors: 3,
      reference: { views: 8, sessions: 2, visitors: 2 },
      change: {
        views: { absolute: 4, relative: 0.5 },
        sessions: { absolute: 2, relative: 1 },
        visitors: { absolute: 1, relative: 0.5 },
      },
    });
  });

  it("counts only visits tagged with the tab's UTM value", () => {
    expect(formatFilterDsl(withCampaignTag(undefined, "medium"))).toBe(
      "utm.medium notEmpty",
    );
    const filters = parseFilterDsl(
      'client.deviceType eq "mobile"',
      analyticsFilterRegistry,
    );
    expect(formatFilterDsl(withCampaignTag(filters, "source"))).toBe(
      'client.deviceType eq "mobile" AND utm.source notEmpty',
    );
  });
});
