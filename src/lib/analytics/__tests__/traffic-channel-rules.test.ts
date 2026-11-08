import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import {
  classifyTrafficChannel,
  type TrafficChannelAttributionInput,
  type TrafficChannelId,
} from "@/lib/analytics/traffic-channel-rules";
import { seedSites } from "@/lib/edge/__tests__/rollup-fixtures";

const CASES: ReadonlyArray<
  readonly [TrafficChannelAttributionInput, TrafficChannelId]
> = [
  // AI assistants, before Google: gemini.google.com is a google.com host.
  [{ referrerHost: "chatgpt.com" }, "ai_assistants"],
  [{ referrerHost: "chat.openai.com" }, "ai_assistants"],
  [{ referrerHost: "www.perplexity.ai" }, "ai_assistants"],
  [{ referrerHost: "claude.ai" }, "ai_assistants"],
  [{ referrerHost: "gemini.google.com" }, "ai_assistants"],
  [{ referrerHost: "copilot.microsoft.com" }, "ai_assistants"],
  // ChatGPT tags its links with utm_source, with or without a referrer.
  [{ utmSource: "chatgpt.com" }, "ai_assistants"],
  [{ referrerHost: "chatgpt.com", utmSource: "chatgpt.com" }, "ai_assistants"],
  [{ utmSource: "chatgpt.com", utmMedium: "cpc" }, "paid_search"],
  [{ utmSource: "chatgpt.com", utmCampaign: "launch" }, "campaign"],
  // Search engines: canonical hosts and the variants older rows kept.
  [{ referrerHost: "google.com" }, "organic_search"],
  [{ referrerHost: "www.google.com" }, "organic_search"],
  [{ referrerHost: "google.de" }, "organic_search"],
  [{ referrerHost: "www.google.co.uk" }, "organic_search"],
  [{ referrerHost: "google.com.hk" }, "organic_search"],
  [{ referrerHost: "www.google.com.br" }, "organic_search"],
  [{ referrerHost: " WWW.Google.DE " }, "organic_search"],
  [
    { referrerHost: "com.google.android.googlequicksearchbox" },
    "organic_search",
  ],
  [{ referrerHost: "bing.com" }, "organic_search"],
  [{ referrerHost: "duckduckgo.com" }, "organic_search"],
  [{ referrerHost: "search.brave.com" }, "organic_search"],
  [{ referrerHost: "google.dev" }, "referral"],
  [{ referrerHost: "google.blog" }, "referral"],
  [{ referrerHost: "notgoogle.de" }, "referral"],
  [{ referrerHost: "google.de", utmSource: "newsletter" }, "campaign"],
  // Social networks.
  [{ referrerHost: "x.com" }, "social"],
  [{ referrerHost: "t.co" }, "social"],
  [{ referrerHost: "twitter.com" }, "social"],
  [{ referrerHost: "facebook.com" }, "social"],
  [{ referrerHost: "m.facebook.com" }, "social"],
  [{ referrerHost: "l.facebook.com" }, "social"],
  [{ referrerHost: "lm.facebook.com" }, "social"],
  [{ referrerHost: "linkedin.com" }, "social"],
  [{ referrerHost: "lnkd.in" }, "social"],
  [{ referrerHost: "reddit.com" }, "social"],
  [{ referrerHost: "out.reddit.com" }, "social"],
  [{ referrerHost: "old.reddit.com" }, "social"],
  [{ referrerHost: "m.youtube.com" }, "social"],
  [{ referrerHost: "threads.net" }, "social"],
  [{ referrerHost: "bsky.app" }, "social"],
  [{ referrerHost: "mastodon.social" }, "social"],
  [{ referrerHost: "news.ycombinator.com" }, "social"],
  [{ referrerHost: "ycombinator.com" }, "referral"],
  [
    { referrerHost: "l.facebook.com", utmSource: "fb", utmMedium: "social" },
    "campaign",
  ],
  // UTM mediums, other tags, referrals and direct visits.
  [{ utmMedium: "cpc" }, "paid_search"],
  [{ utmMedium: "Paid-Social" }, "paid_social"],
  [{ utmMedium: "email", referrerHost: "mail.example.com" }, "email"],
  [{ utmMedium: "unknown" }, "other"],
  [{ utmSource: "partner-site" }, "campaign"],
  [{ referrerHost: "example.com" }, "referral"],
  [{ referrerHost: "  " }, "direct"],
  [{}, "direct"],
];

/** Inputs the rules above meet in combination, and each case on its own. */
const COMBINATIONS: readonly TrafficChannelAttributionInput[] = [
  ...CASES.map(([input]) => input),
  ...[
    "",
    "google.com",
    "www.google.co.uk",
    " WWW.Bing.COM ",
    "chatgpt.com",
    "gemini.google.com",
    "t.co",
    "example.com",
  ].flatMap((referrerHost) =>
    ["", " ", "chatgpt.com", "newsletter"].flatMap((utmSource) =>
      ["", "cpc", "Email", "social", "unknown"].flatMap((utmMedium) =>
        ["", "launch"].map((utmCampaign) => ({
          referrerHost,
          utmSource,
          utmMedium,
          utmCampaign,
        })),
      ),
    ),
  ),
];

/**
 * The channels the migration that added the column gives existing page
 * views, in input order.
 */
function backfilledChannels(
  inputs: readonly TrafficChannelAttributionInput[],
): string[] {
  const database = new DatabaseSync(":memory:");
  try {
    const migrations = loadMigrations();
    const channelMigration = migrations.find((migration) =>
      migration.file.endsWith("_visit_channel.sql"),
    )!;
    for (const migration of migrations) {
      if (migration === channelMigration) break;
      database.exec(migration.sql);
    }
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const insert = database.prepare(
      `INSERT INTO visits (
        visit_id, site_id, site_pk, visitor_id, session_id, status,
        started_at, last_activity_at, pathname, hostname, referrer_host,
        utm_source, utm_medium, utm_campaign
      ) VALUES (?, 'site-1', 1, 'visitor', 'session', 'complete', ?, ?, '/',
        'example.com', ?, ?, ?, ?)`,
    );
    inputs.forEach((input, index) =>
      insert.run(
        `visit-${index}`,
        index,
        index,
        input.referrerHost ?? "",
        input.utmSource ?? "",
        input.utmMedium ?? "",
        input.utmCampaign ?? "",
      ),
    );
    database.exec(channelMigration.sql);
    return database
      .prepare("SELECT channel FROM visits ORDER BY started_at")
      .all()
      .map((row) => String(row.channel));
  } finally {
    database.close();
  }
}

describe("traffic channel rules", () => {
  it.each(CASES)("classifies %j as %s", (input, channel) => {
    expect(classifyTrafficChannel(input)).toBe(channel);
  });

  it("backfills existing page views to the channel ingest gives them", () => {
    expect(backfilledChannels(COMBINATIONS)).toEqual(
      COMBINATIONS.map(classifyTrafficChannel),
    );
  });
});
