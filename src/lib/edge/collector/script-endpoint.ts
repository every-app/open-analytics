import {
  normalizeSiteSettingsKey,
  readSiteTrackingConfig,
} from "@/lib/edge/sites/settings-store";
import type { Env } from "@/lib/edge/types";
import { SDK_MIN } from "@/tracker/sdk.min";
const SCRIPT_RESPONSE_CACHE_NAME = "insightflare-script-cache";
const SCRIPT_RESPONSE_CACHE_TTL_SECONDS = 10 * 60;
const SCRIPT_CACHE_VERSION = "sdk-prebuilt-v5";
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
    autoTrackFileDownloads: boolean;
    track404Pages: boolean;
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
  autoTrackFileDownloads: boolean;
  track404Pages: boolean;
  siteDomain: string;
}): string {
  return [
    input.trackQueryParams ? "1" : "0",
    input.trackHash ? "1" : "0",
    input.ignoreDoNotTrack ? "1" : "0",
    input.autoTrackOutboundLinks ? "1" : "0",
    input.autoTrackFileDownloads ? "1" : "0",
    input.track404Pages ? "1" : "0",
    input.siteDomain,
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
    Math.min(MAX_SCRIPT_RESPONSE_CACHE_TTL_SECONDS, Math.floor(raw)),
  );
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
  const fingerprint = [
    SCRIPT_CACHE_VERSION,
    settingsFingerprint(settings),
  ].join("|");
  const cacheKey = scriptCacheKeyRequest(siteId, fingerprint);
  const scriptCache = await openEdgeCache(SCRIPT_RESPONSE_CACHE_NAME);
  if (scriptCache) {
    const cached = await scriptCache.match(cacheKey);
    if (cached) return cached;
  }

  const script = applyConfigToSdk(SDK_MIN, {
    siteId,
    trackQueryParams: settings.trackQueryParams,
    trackHash: settings.trackHash,
    ignoreDoNotTrack: settings.ignoreDoNotTrack,
    autoTrackOutboundLinks: settings.autoTrackOutboundLinks,
    autoTrackFileDownloads: settings.autoTrackFileDownloads,
    track404Pages: settings.track404Pages,
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

  return response;
}
