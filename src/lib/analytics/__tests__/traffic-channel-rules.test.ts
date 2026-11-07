import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  buildTrafficChannelSqlExpression,
  classifyTrafficChannel,
  type TrafficChannelAttributionInput,
  type TrafficChannelId,
} from "@/lib/analytics/traffic-channel-rules";

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

function classifyInSqlite(
  inputs: readonly TrafficChannelAttributionInput[],
): string[] {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE visits (
        id INTEGER PRIMARY KEY,
        referrer_host TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT
      )
    `);
    const insert = database.prepare(
      "INSERT INTO visits VALUES (?, ?, ?, ?, ?)",
    );
    inputs.forEach((input, id) =>
      insert.run(
        id,
        input.referrerHost ?? null,
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
      ),
    );
    return database
      .prepare(
        `SELECT ${buildTrafficChannelSqlExpression()} AS channel FROM visits ORDER BY id`,
      )
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

  it("classifies every case the same way in SQL", () => {
    expect(classifyInSqlite(CASES.map(([input]) => input))).toEqual(
      CASES.map(([, channel]) => channel),
    );
  });

  it("supports qualified columns for derived channel filters", () => {
    const sql = buildTrafficChannelSqlExpression({
      referrerHost: "vs.referrer_host",
      utmSource: "vs.utm_source",
      utmMedium: "vs.utm_medium",
      utmCampaign: "vs.utm_campaign",
    });

    expect(sql).toContain("vs.referrer_host");
    expect(sql).toContain("vs.utm_source");
    expect(sql).toContain("vs.utm_medium");
    expect(sql).toContain("vs.utm_campaign");
    expect(sql).not.toMatch(/(?<!vs\.)\b(referrer_host|utm_\w+)\b/);
  });
});
