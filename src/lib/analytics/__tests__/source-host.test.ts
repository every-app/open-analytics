import { describe, expect, it } from "vitest";

import { canonicalSourceHost } from "@/lib/analytics/source-host";

describe("canonicalSourceHost", () => {
  it.each([
    // Google's country domains and its Android app are Google.
    ["www.google.com", "google.com"],
    ["google.com.hk", "google.com"],
    ["google.de", "google.com"],
    ["www.google.co.uk", "google.com"],
    ["com.google.android.googlequicksearchbox", "google.com"],
    // www, mobile and Facebook's link shims are the same site.
    ["m.facebook.com", "facebook.com"],
    ["l.facebook.com", "facebook.com"],
    ["lm.facebook.com", "facebook.com"],
    ["www.facebook.com", "facebook.com"],
    ["m.youtube.com", "youtube.com"],
    ["www.example.org", "example.org"],
    // Other names of a source.
    ["t.co", "x.com"],
    ["twitter.com", "x.com"],
    ["www.twitter.com", "x.com"],
    ["lnkd.in", "linkedin.com"],
    ["old.reddit.com", "reddit.com"],
    ["out.reddit.com", "reddit.com"],
    ["youtu.be", "youtube.com"],
    ["chat.openai.com", "chatgpt.com"],
    // Case and the root label's trailing dot don't matter.
    ["WWW.Google.DE.", "google.com"],
  ])("groups %s under %s", (host, canonical) => {
    expect(canonicalSourceHost(host)).toBe(canonical);
  });

  it.each([
    // Other Google products stay apart: Gemini is an AI assistant.
    "gemini.google.com",
    "news.google.com",
    "mail.google.de",
    // google.com itself, and look-alikes that aren't Google.
    "google.com",
    "google.dev",
    "notgoogle.de",
    // Other subdomains name a different site.
    "news.ycombinator.com",
    "en.m.wikipedia.org",
    // A prefix is kept when nothing but a top-level domain would be left.
    "m.co",
    "constructor",
    "",
  ])("keeps %j", (host) => {
    expect(canonicalSourceHost(host)).toBe(host);
  });
});
