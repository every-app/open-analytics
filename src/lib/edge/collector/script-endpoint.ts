import {
  COLLECT_TOKEN_TTL_SECONDS,
  issueCollectToken,
  requestIp,
} from "@/lib/edge/auth/collect-token";
import {
  normalizeSiteSettingsKey,
  readSiteTrackingConfig,
} from "@/lib/edge/sites/settings-store";
import type { Env } from "@/lib/edge/types";
import { SDK_MIN } from "@/tracker/sdk.min";
const SCRIPT_RESPONSE_CACHE_NAME = "insightflare-script-cache";
const SCRIPT_RESPONSE_CACHE_TTL_SECONDS = 10 * 60;
const SCRIPT_CACHE_VERSION = "sdk-prebuilt-v3";
const MAX_SCRIPT_RESPONSE_CACHE_TTL_SECONDS = 24 * 60 * 60;
const TRACKER_RUNTIME_CONFIG_KEY = "__openanalytics_tracker_runtime_config__";
function responseBadRequest(message: string): Response {
  return new Response(message, { status: 400 });
}
function responseNotFound(): Response {
  return new Response("Not Found", { status: 404 });
}
function responseMethodNotAllowed(): Response {
  return new Response("Method Not Allowed", { status: 405 });
}
function responseInternalServerError(message: string): Response {
  return new Response(message, { status: 500 });
}
function openCacheStorage(): CacheStorage | null {
  if (typeof globalThis !== "object" || !("caches" in globalThis)) {
    return null;
  }
  const maybeCaches = (globalThis as { caches?: CacheStorage }).caches;
  if (!maybeCaches || typeof maybeCaches.open !== "function") {
    return null;
  }
  return maybeCaches;
}
async function openEdgeCache(name: string): Promise<Cache | null> {
  const storage = openCacheStorage();
  if (!storage) return null;
  try {
    return await storage.open(name);
  } catch {
    return null;
  }
}
function applyConfigToSdk(
  template: string,
  config: {
    siteId: string;
    trackQueryParams: boolean;
    trackHash: boolean;
    ignoreDoNotTrack: boolean;
    autoTrackOutboundLinks: boolean;
    collectToken: string;
  },
): string {
  const assignment = `globalThis[${JSON.stringify(TRACKER_RUNTIME_CONFIG_KEY)}] = ${JSON.stringify(config)};\n`;
  const strictDirective = '"use strict";';
  return template.startsWith(strictDirective)
    ? `${strictDirective}${assignment}${template.slice(strictDirective.length)}`
    : `${assignment}${template}`;
}
function settingsFingerprint(input: {
  trackQueryParams: boolean;
  trackHash: boolean;
  ignoreDoNotTrack: boolean;
  autoTrackOutboundLinks: boolean;
  siteDomain: string;
  requestIp: string;
}): string {
  return [
    input.trackQueryParams ? "1" : "0",
    input.trackHash ? "1" : "0",
    input.ignoreDoNotTrack ? "1" : "0",
    input.autoTrackOutboundLinks ? "1" : "0",
    input.siteDomain,
    input.requestIp,
  ].join("|");
}
function scriptCacheKeyRequest(siteId: string, fingerprint: string): Request {
  const encodedSiteId = encodeURIComponent(siteId);
  const encodedFingerprint = encodeURIComponent(fingerprint);
  return new Request(
    `https://insightflare.internal/__script/${encodedSiteId}?fp=${encodedFingerprint}`,
  );
}
function resolveScriptCacheTtlSeconds(env: Env): number {
  const raw = Number(env.SCRIPT_CACHE_TTL_SECONDS || "");
  if (!Number.isFinite(raw) || raw <= 0) {
    return SCRIPT_RESPONSE_CACHE_TTL_SECONDS;
  }
  return Math.max(
    1,
    Math.min(
      MAX_SCRIPT_RESPONSE_CACHE_TTL_SECONDS,
      COLLECT_TOKEN_TTL_SECONDS,
      Math.floor(raw),
    ),
  );
}
function withPrivateNoStore(response: Response): Response {
  // The IP-scoped Worker cache may reuse this response, but clients and shared
  // CDN caches must not store the token-bearing script.
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
export async function handleTrackerScriptRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "GET") {
    return responseMethodNotAllowed();
  }

  const incomingUrl = new URL(request.url);
  const siteId = normalizeSiteSettingsKey(
    incomingUrl.searchParams.get("siteId"),
  );
  if (!siteId) {
    return responseBadRequest("Missing siteId");
  }

  let settings;
  try {
    settings = await readSiteTrackingConfig(env, siteId);
  } catch (error) {
    // The script is public: log the cause, answer with a fixed code.
    console.error("site_settings_unavailable", error);
    return responseInternalServerError("site_settings_unavailable");
  }
  if (!settings?.siteDomain) {
    return responseNotFound();
  }

  const ttlSeconds = resolveScriptCacheTtlSeconds(env);
  const clientIp = requestIp(request);
  const fingerprint = [
    SCRIPT_CACHE_VERSION,
    settingsFingerprint({
      ...settings,
      autoTrackOutboundLinks: settings.autoTrackOutboundLinks,
      requestIp: clientIp,
    }),
  ].join("|");
  const cacheKey = scriptCacheKeyRequest(siteId, fingerprint);
  const scriptCache = await openEdgeCache(SCRIPT_RESPONSE_CACHE_NAME);
  if (scriptCache) {
    const cached = await scriptCache.match(cacheKey);
    if (cached) {
      return withPrivateNoStore(cached);
    }
  }

  let collectToken = "";
  try {
    collectToken = await issueCollectToken({
      env,
      siteId,
      ip: clientIp,
    });
  } catch (error) {
    // The script is public: log the cause, answer with a fixed code.
    console.error("collect_token_unavailable", error);
    return responseInternalServerError("collect_token_unavailable");
  }

  const script = applyConfigToSdk(SDK_MIN, {
    siteId,
    trackQueryParams: settings.trackQueryParams,
    trackHash: settings.trackHash,
    ignoreDoNotTrack: settings.ignoreDoNotTrack,
    autoTrackOutboundLinks: settings.autoTrackOutboundLinks,
    collectToken,
  });

  const response = new Response(script, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      "access-control-allow-origin": "*",
      // Loaded by <script> on the organization's own websites.
      "cross-origin-resource-policy": "cross-origin",
    },
  });

  if (scriptCache) {
    await scriptCache.put(cacheKey, response.clone());
  }

  return withPrivateNoStore(response);
}
