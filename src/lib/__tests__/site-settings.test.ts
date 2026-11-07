import { describe, expect, it } from "vitest";

import {
  buildAllowedHostnames,
  DEFAULT_SITE_SCRIPT_SETTINGS,
  formatListInput,
  normalizeSiteDomain,
  normalizeSiteScriptSettings,
  normalizeSiteTrackingConfig,
  parseDomainWhitelist,
  parsePathBlacklist,
} from "@/lib/site-settings";

describe("site settings helpers", () => {
  it("normalizes domains and rejects invalid hostnames", () => {
    expect(normalizeSiteDomain(" https://Docs.Example.com/path ")).toBe(
      "docs.example.com",
    );
    expect(normalizeSiteDomain("..Example.com../path")).toBe("example.com");
    expect(normalizeSiteDomain("http://[bad")).toBe("");
    expect(normalizeSiteDomain("*.example.com")).toBe("");
    expect(normalizeSiteDomain("bad_host.example")).toBe("");
    expect(normalizeSiteDomain(`${"a".repeat(256)}.example.com`)).toBe("");
    expect(normalizeSiteDomain(".".repeat(260))).toBe("");
    expect(normalizeSiteDomain("---")).toBe("");
    expect(normalizeSiteDomain(null)).toBe("");
  });

  it("parses unique domain whitelist entries from strings and arrays", () => {
    const manyDomains = Array.from(
      { length: 205 },
      (_, index) => `site-${index}.example.com`,
    );

    expect(
      parseDomainWhitelist([
        "Example.com",
        "example.com",
        "https://docs.example.com/path",
        "bad*",
        "",
      ]),
    ).toEqual(["example.com", "docs.example.com"]);
    expect(
      parseDomainWhitelist(`
        HTTPS://Blog.Example.com/articles?id=1
        sub.example.com/path
        ...Trailing.Example...
      `),
    ).toEqual(["blog.example.com", "sub.example.com", "trailing.example"]);
    expect(parseDomainWhitelist(manyDomains)).toHaveLength(200);
    expect(parseDomainWhitelist(123)).toEqual([]);
  });

  it("parses path blacklist entries and formats lists", () => {
    expect(
      parsePathBlacklist(`
        admin
        /checkout//step?cart=1
        https://example.com/private#hash
        http://[bad
        /bad path
        /bad<>path
        /admin
      `),
    ).toEqual(["/admin", "/checkout/step", "/private", "/badpath"]);
    expect(
      parsePathBlacklist([
        "https://example.com",
        "reports/#monthly",
        "/keep%20encoded",
        "/allowed:segment",
      ]),
    ).toEqual(["/", "/reports/", "/keep%20encoded", "/allowed:segment"]);
    expect(
      parsePathBlacklist(Array.from({ length: 205 }, (_, i) => `p${i}`)),
    ).toHaveLength(200);
    expect(parsePathBlacklist(null)).toEqual([]);
    expect(formatListInput(["/admin", "/checkout"])).toBe("/admin\n/checkout");
  });

  it("defaults to path-only page keys and hosting proxy blocking", () => {
    expect(normalizeSiteScriptSettings(null)).toMatchObject({
      trackQueryParams: false,
      trackHash: false,
      hostingProxyBlockingEnabled: true,
    });
  });

  it("normalizes script settings from top-level and nested tracking objects", () => {
    expect(normalizeSiteScriptSettings(null)).toEqual(
      DEFAULT_SITE_SCRIPT_SETTINGS,
    );

    expect(
      normalizeSiteScriptSettings({
        trackQueryParams: "off",
        trackHash: 0,
        autoTrackOutboundLinks: "yes",
        ignoreDnt: "false",
        tracking: {
          trackHash: "on",
          domainWhitelist: "Example.com,docs.example.com",
          pathBlacklist: "admin\n/settings",
        },
      }),
    ).toEqual({
      trackQueryParams: false,
      trackHash: true,
      autoTrackOutboundLinks: true,
      domainWhitelist: ["example.com", "docs.example.com"],
      pathBlacklist: ["/admin", "/settings"],
      ignoreDoNotTrack: false,
      botProtectionEnabled: true,
      hostingProxyBlockingEnabled: true,
    });

    expect(
      normalizeSiteScriptSettings({
        trackQueryParams: 1,
        autoTrackOutboundLinks: 0,
      }),
    ).toMatchObject({
      trackQueryParams: true,
      autoTrackOutboundLinks: false,
    });
    expect(
      normalizeSiteScriptSettings({
        ignoreDoNotTrack: " yes ",
        trackHash: "maybe",
      }),
    ).toMatchObject({
      ignoreDoNotTrack: true,
      trackHash: DEFAULT_SITE_SCRIPT_SETTINGS.trackHash,
    });
  });

  it("normalizes tracking configs and allowed hostnames", () => {
    expect(
      buildAllowedHostnames("example.com", [
        "docs.example.com",
        "docs.example.com",
        "bad*",
      ]),
    ).toEqual(["docs.example.com"]);

    expect(
      normalizeSiteTrackingConfig({
        siteId: ` ${"s".repeat(140)} `,
        primaryDomain: "https://Primary.example/path",
        domainWhitelist: "docs.example.com\nbad*",
      }),
    ).toMatchObject({
      siteId: "s".repeat(120),
      siteDomain: "primary.example",
      allowedHostnames: ["docs.example.com"],
    });

    expect(parsePathBlacklist(["?debug=1", `/${"a".repeat(260)}`])).toEqual([]);
    expect(normalizeSiteTrackingConfig(null)).toMatchObject({
      siteId: "",
      siteDomain: "",
      allowedHostnames: [],
    });
  });
});
