/**
 * Ingest stores a page view's referrer host as its source's canonical host,
 * so the Sources card shows one row per source, as Plausible does.
 */

/** www, mobile (m) and Facebook's link shims (l, lm) are the same site. */
const SAME_SITE_SUBDOMAIN = /^(?:www|m|l|lm)\.(?=[^.]+\.)/;

/** Google's country domains: google.de, google.co.uk, google.com.hk. */
const GOOGLE_COUNTRY_DOMAIN = /^google\.(?:com?\.)?[a-z]{2}$/;

/** Other names of a source: an Android app, a link shortener, an old name. */
const SOURCE_HOST_ALIASES: ReadonlyMap<string, string> = new Map([
  ["com.google.android.googlequicksearchbox", "google.com"],
  ["t.co", "x.com"],
  ["twitter.com", "x.com"],
  ["lnkd.in", "linkedin.com"],
  ["old.reddit.com", "reddit.com"],
  ["out.reddit.com", "reddit.com"],
  ["youtu.be", "youtube.com"],
  ["chat.openai.com", "chatgpt.com"],
]);

export function canonicalSourceHost(host: string): string {
  const name = host
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(SAME_SITE_SUBDOMAIN, "");
  if (GOOGLE_COUNTRY_DOMAIN.test(name)) return "google.com";
  return SOURCE_HOST_ALIASES.get(name) ?? name;
}
