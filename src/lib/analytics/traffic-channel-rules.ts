/**
 * How a visit's source maps to a channel. The SQL expression and
 * classifyTrafficChannel apply the same rules in the same order, from the
 * same lists; keep both here.
 */

export const TRAFFIC_CHANNEL_IDS = [
  "direct",
  "ai_assistants",
  "organic_search",
  "social",
  "paid_search",
  "paid_social",
  "display",
  "email",
  "affiliate",
  "referral",
  "campaign",
  "other",
] as const;

export type TrafficChannelId = (typeof TRAFFIC_CHANNEL_IDS)[number];

export interface TrafficChannelSqlColumns {
  readonly referrerHost?: string;
  readonly utmSource?: string;
  readonly utmMedium?: string;
  readonly utmCampaign?: string;
}

/*
 * Source domains, as SQLite GLOB patterns: each matches the host itself and
 * its subdomains. Ingest stores a source's canonical host (source-host.ts);
 * the variants older page views kept are listed too, so they classify the
 * same.
 */

const AI_ASSISTANT_DOMAINS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "chat.deepseek.com",
  "chat.mistral.ai",
  "grok.com",
  "meta.ai",
  "poe.com",
] as const;

const SEARCH_ENGINE_DOMAINS = [
  "google.com",
  // Google's country domains: google.de, google.co.uk, google.com.hk.
  "google.[a-z][a-z]",
  "google.co.[a-z][a-z]",
  "google.com.[a-z][a-z]",
  // The Google app on Android.
  "com.google.android.googlequicksearchbox",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "search.yahoo.co.jp",
  "baidu.com",
  "yandex.ru",
  "yandex.com",
  "ecosia.org",
  "naver.com",
  "sogou.com",
  "so.com",
  "search.brave.com",
  "startpage.com",
  "qwant.com",
  "kagi.com",
] as const;

const SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "threads.net",
  "threads.com",
  "x.com",
  "twitter.com",
  "t.co",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "pinterest.com",
  "bsky.app",
  "mastodon.social",
  "news.ycombinator.com",
  "weibo.com",
  "zhihu.com",
] as const;

const UTM_CHANNEL_MEDIUMS = {
  paid_search: ["cpc", "ppc", "paidsearch", "paid-search"],
  paid_social: ["paid_social", "paid-social", "social_ads", "social-ads"],
  display: ["display", "banner", "programmatic"],
  email: ["email", "newsletter"],
  affiliate: ["affiliate", "partner"],
  other: ["other", "unknown", "unclassified"],
} as const satisfies Readonly<
  Record<
    Exclude<
      TrafficChannelId,
      | "ai_assistants"
      | "organic_search"
      | "social"
      | "direct"
      | "referral"
      | "campaign"
    >,
    readonly string[]
  >
>;

type UtmMediumChannel = keyof typeof UTM_CHANNEL_MEDIUMS;

const UTM_MEDIUM_CHANNELS = Object.entries(UTM_CHANNEL_MEDIUMS) as Array<
  [UtmMediumChannel, readonly string[]]
>;

function normalizedSql(column: string): string {
  return `LOWER(TRIM(COALESCE(${column}, '')))`;
}

function blankSql(column: string): string {
  return `TRIM(COALESCE(${column}, '')) = ''`;
}

function domainSql(column: string, domains: readonly string[]): string {
  const value = normalizedSql(column);
  return `(${domains
    .map((domain) => `${value} GLOB '${domain}' OR ${value} GLOB '*.${domain}'`)
    .join(" OR ")})`;
}

/**
 * The derived channel of a visit row, in this order:
 *
 * 1. AI assistants: the referrer or utm_source is an AI assistant, with no
 *    utm_medium or utm_campaign. ChatGPT tags its links
 *    `utm_source=chatgpt.com`. It comes first because gemini.google.com is
 *    also a Google host.
 * 2. Organic search, then social: the referrer's domain, with no UTM tags.
 * 3. The channel of a known utm_medium, then Campaign for any other tags.
 * 4. Referral when there is a referrer, else Direct.
 *
 * Callers may pass qualified columns so filters and aggregates share it.
 */
export function buildTrafficChannelSqlExpression(
  columns: TrafficChannelSqlColumns = {},
): string {
  const referrerHost = columns.referrerHost ?? "referrer_host";
  const utmSource = columns.utmSource ?? "utm_source";
  const utmMedium = columns.utmMedium ?? "utm_medium";
  const utmCampaign = columns.utmCampaign ?? "utm_campaign";
  const untagged = `${blankSql(utmSource)} AND ${blankSql(utmMedium)} AND ${blankSql(utmCampaign)}`;
  const mediums = UTM_MEDIUM_CHANNELS.map(
    ([channel, values]) =>
      `WHEN ${normalizedSql(utmMedium)} IN (${values.map((value) => `'${value}'`).join(", ")}) THEN '${channel}'`,
  ).join("\n    ");

  return `CASE
    WHEN ${blankSql(utmMedium)} AND ${blankSql(utmCampaign)}
      AND (${domainSql(referrerHost, AI_ASSISTANT_DOMAINS)}
        OR ${domainSql(utmSource, AI_ASSISTANT_DOMAINS)}) THEN 'ai_assistants'
    WHEN ${untagged}
      AND ${domainSql(referrerHost, SEARCH_ENGINE_DOMAINS)} THEN 'organic_search'
    WHEN ${untagged}
      AND ${domainSql(referrerHost, SOCIAL_DOMAINS)} THEN 'social'
    ${mediums}
    WHEN NOT (${untagged}) THEN 'campaign'
    WHEN NOT ${blankSql(referrerHost)} THEN 'referral'
    ELSE 'direct'
  END`;
}

/** domainSql's twin: GLOB's `[a-z]` is a regular expression class too. */
function domainPattern(domains: readonly string[]): RegExp {
  return new RegExp(
    `(?:^|\\.)(?:${domains.map((domain) => domain.replaceAll(".", "\\.")).join("|")})$`,
  );
}

const AI_ASSISTANT_PATTERN = domainPattern(AI_ASSISTANT_DOMAINS);
const SEARCH_ENGINE_PATTERN = domainPattern(SEARCH_ENGINE_DOMAINS);
const SOCIAL_PATTERN = domainPattern(SOCIAL_DOMAINS);

export interface TrafficChannelAttributionInput {
  readonly referrerHost?: string | null;
  readonly utmSource?: string | null;
  readonly utmMedium?: string | null;
  readonly utmCampaign?: string | null;
}

function normalizeAttributionValue(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Classify one visit as buildTrafficChannelSqlExpression does, for filters
 * evaluated in memory.
 */
export function classifyTrafficChannel(
  input: TrafficChannelAttributionInput,
): TrafficChannelId {
  const referrerHost = normalizeAttributionValue(input.referrerHost);
  const utmSource = normalizeAttributionValue(input.utmSource);
  const utmMedium = normalizeAttributionValue(input.utmMedium);
  const utmCampaign = normalizeAttributionValue(input.utmCampaign);
  const isUntagged = !utmSource && !utmMedium && !utmCampaign;

  if (
    !utmMedium &&
    !utmCampaign &&
    (AI_ASSISTANT_PATTERN.test(referrerHost) ||
      AI_ASSISTANT_PATTERN.test(utmSource))
  ) {
    return "ai_assistants";
  }
  if (isUntagged && SEARCH_ENGINE_PATTERN.test(referrerHost)) {
    return "organic_search";
  }
  if (isUntagged && SOCIAL_PATTERN.test(referrerHost)) return "social";

  const mediumChannel = UTM_MEDIUM_CHANNELS.find(([, mediums]) =>
    mediums.includes(utmMedium),
  );
  if (mediumChannel) return mediumChannel[0];
  if (!isUntagged) return "campaign";
  if (referrerHost) return "referral";
  return "direct";
}
