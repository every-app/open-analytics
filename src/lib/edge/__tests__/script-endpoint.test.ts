import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleTrackerScriptRequest } from "@/lib/edge/collector/script-endpoint";
import type * as SiteSettingsStoreModule from "@/lib/edge/sites/settings-store";
import { readSiteTrackingConfig } from "@/lib/edge/sites/settings-store";
import type { Env } from "@/lib/edge/types";
import type { SiteTrackingConfig } from "@/lib/site-settings";

const trackerSdk = vi.hoisted(() => ({ source: '"use strict";tracker-sdk' }));

vi.mock("@/tracker/sdk.min", () => ({
  get SDK_MIN() {
    return trackerSdk.source;
  },
}));

vi.mock("@/lib/edge/sites/settings-store", async () => {
  const actual = await vi.importActual<typeof SiteSettingsStoreModule>(
    "@/lib/edge/sites/settings-store",
  );
  return {
    ...actual,
    readSiteTrackingConfig: vi.fn(),
  };
});

const readSiteTrackingConfigMock = vi.mocked(readSiteTrackingConfig);

function makeEnv(overrides: Partial<Env> = {}): Env {
  return overrides as Env;
}

function makeSettings(
  overrides: Partial<SiteTrackingConfig> = {},
): SiteTrackingConfig {
  return {
    siteId: "site-1",
    siteDomain: "example.com",
    allowedHostnames: ["example.com"],
    trackQueryParams: true,
    trackHash: true,
    autoTrackOutboundLinks: false,
    autoTrackFileDownloads: false,
    track404Pages: false,
    domainWhitelist: [],
    pathBlacklist: [],
    ignoreDoNotTrack: true,
    ...overrides,
  };
}

function makeRequest(input: {
  url?: string;
  method?: string;
  ip?: string;
}): Request {
  const headers = new Headers();
  if (input.ip) headers.set("cf-connecting-ip", input.ip);
  return new Request(
    input.url ?? "https://example.com/script.js?siteId=site-1",
    { method: input.method ?? "GET", headers },
  );
}

function cacheStorageWith(cache: Partial<Cache>) {
  return {
    open: vi.fn().mockResolvedValue(cache),
  };
}

describe("edge script endpoint", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    trackerSdk.source = '"use strict";tracker-sdk';
    readSiteTrackingConfigMock.mockReset();
    readSiteTrackingConfigMock.mockResolvedValue(makeSettings());
  });

  it("rejects non-GET requests and missing site IDs", async () => {
    const postResponse = await handleTrackerScriptRequest(
      makeRequest({ method: "POST" }),
      makeEnv(),
    );
    const missingSiteResponse = await handleTrackerScriptRequest(
      makeRequest({ url: "https://example.com/script.js?siteId=%20%20" }),
      makeEnv(),
    );

    await expect(postResponse.text()).resolves.toBe("Method Not Allowed");
    expect(postResponse.status).toBe(405);
    await expect(missingSiteResponse.text()).resolves.toBe("Missing siteId");
    expect(missingSiteResponse.status).toBe(400);
    expect(readSiteTrackingConfigMock).not.toHaveBeenCalled();
  });

  it("returns settings lookup errors and missing-site responses", async () => {
    readSiteTrackingConfigMock.mockRejectedValueOnce(new Error("KV down"));
    const errorResponse = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv(),
    );

    readSiteTrackingConfigMock.mockRejectedValueOnce("boom");
    const unknownErrorResponse = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv(),
    );

    readSiteTrackingConfigMock.mockResolvedValueOnce(null);
    const notFoundResponse = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv(),
    );

    await expect(errorResponse.text()).resolves.toBe(
      "site_settings_unavailable",
    );
    expect(errorResponse.status).toBe(500);
    await expect(unknownErrorResponse.text()).resolves.toBe(
      "site_settings_unavailable",
    );
    expect(unknownErrorResponse.status).toBe(500);
    await expect(notFoundResponse.text()).resolves.toBe("Not Found");
    expect(notFoundResponse.status).toBe(404);
  });

  it("injects site settings into the SDK and writes cache entries", async () => {
    const cache = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const storage = cacheStorageWith(cache);
    vi.stubGlobal("caches", storage);
    readSiteTrackingConfigMock.mockResolvedValueOnce(
      makeSettings({
        trackQueryParams: false,
        trackHash: true,
        ignoreDoNotTrack: false,
        autoTrackOutboundLinks: true,
        autoTrackFileDownloads: true,
        track404Pages: true,
      }),
    );

    const response = await handleTrackerScriptRequest(
      makeRequest({
        url: "https://example.com/script.js?siteId=%20site-1%20",
        ip: "203.0.113.9",
      }),
      makeEnv({ SCRIPT_CACHE_TTL_SECONDS: "12.9" }),
    );

    const script = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=12, s-maxage=12",
    );
    expect(script).toBe(
      '"use strict";globalThis["__openanalytics_tracker_runtime_config__"] = {"siteId":"site-1","trackQueryParams":false,"trackHash":true,"ignoreDoNotTrack":false,"autoTrackOutboundLinks":true,"autoTrackFileDownloads":true,"track404Pages":true};\ntracker-sdk',
    );
    expect(storage.open).toHaveBeenCalledWith("insightflare-script-cache");
    expect(cache.match).toHaveBeenCalledTimes(1);
    expect(cache.put).toHaveBeenCalledTimes(1);
    const cachedResponse = cache.put.mock.calls[0]![1] as Response;
    expect(cachedResponse.headers.get("cache-control")).toBe(
      "public, max-age=12, s-maxage=12",
    );
    expect((cache.put.mock.calls[0]![0] as Request).url).toContain(
      "https://insightflare.internal/__script/site-1?fp=",
    );
  });

  it("uses cached script responses before rendering a new SDK", async () => {
    const cached = new Response("cached script", {
      headers: {
        "cache-control": "public, max-age=600, s-maxage=600",
        "x-cache-hit": "1",
      },
    });
    const cache = {
      match: vi.fn().mockResolvedValue(cached),
      put: vi.fn(),
    };
    vi.stubGlobal("caches", cacheStorageWith(cache));

    const response = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv(),
    );

    await expect(response.text()).resolves.toBe("cached script");
    expect(response.headers.get("x-cache-hit")).toBe("1");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=600, s-maxage=600",
    );
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("prepends the config to an SDK without a strict directive", async () => {
    trackerSdk.source = "tracker-sdk";
    readSiteTrackingConfigMock.mockResolvedValueOnce(
      makeSettings({
        trackQueryParams: true,
        trackHash: false,
      }),
    );

    const response = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv({ SCRIPT_CACHE_TTL_SECONDS: "999999" }),
    );

    await expect(response.text()).resolves.toBe(
      'globalThis["__openanalytics_tracker_runtime_config__"] = {"siteId":"site-1","trackQueryParams":true,"trackHash":false,"ignoreDoNotTrack":true,"autoTrackOutboundLinks":false,"autoTrackFileDownloads":false,"track404Pages":false};\ntracker-sdk',
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=86400, s-maxage=86400",
    );
  });

  it("renders scripts when the edge cache is unavailable", async () => {
    vi.stubGlobal("caches", {
      open: vi.fn().mockRejectedValue(new Error("cache unavailable")),
    });
    readSiteTrackingConfigMock.mockResolvedValueOnce(makeSettings());

    const response = await handleTrackerScriptRequest(
      makeRequest({}),
      makeEnv({ SCRIPT_CACHE_TTL_SECONDS: "-1" }),
    );

    await expect(response.text()).resolves.toContain('"siteId":"site-1",');
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=600, s-maxage=600",
    );
  });

  it("serves every visitor the same cached script for a site", async () => {
    const cache = {
      match: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("caches", cacheStorageWith(cache));
    readSiteTrackingConfigMock.mockResolvedValue(makeSettings());

    const first = await handleTrackerScriptRequest(
      makeRequest({ ip: "203.0.113.1" }),
      makeEnv(),
    );
    const second = await handleTrackerScriptRequest(
      makeRequest({ ip: "203.0.113.2" }),
      makeEnv(),
    );

    const firstKey = (cache.match.mock.calls[0]![0] as Request).url;
    const secondKey = (cache.match.mock.calls[1]![0] as Request).url;
    expect(firstKey).toBe(secondKey);
    await expect(first.text()).resolves.toBe(await second.text());
  });
});
