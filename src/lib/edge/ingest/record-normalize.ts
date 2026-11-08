import { UAParser } from "ua-parser-js";

import { canonicalSourceHost } from "@/lib/analytics/source-host";
import { classifyTrafficChannel } from "@/lib/analytics/traffic-channel-rules";
import { mergeUaClientHintsIntoHeaders } from "@/lib/edge/collector/client-hints";
import type {
  IngestEnvelopePayload,
  NormalizedCustomEvent,
  NormalizedLeave,
  NormalizedPageview,
  NormalizedVisibility,
  TrackerClientPayload,
  TrackerPayloadKind,
} from "@/lib/edge/types";
import {
  clampString,
  coerceNumber,
  coerceString,
  deriveServerSessionId,
  deriveVisitorId,
  isSameHostname,
  safeHostname,
} from "@/lib/edge/utils";

import { expandCustomEventData } from "./custom-event-json";
import { clampTimestamp, resolveTrustedClientTimestamp } from "./normalize";
import { normalizePageProperties } from "./page-properties";
import { normalizeEventRevenue } from "./revenue";
import { normalizeScrollDepth } from "./scroll-depth";
import type {
  BufferedCustomEventInput,
  NormalizeResult,
  RecentVisitorSession,
  SessionAttribution,
  StoredOpenVisit,
} from "./types";
import { utcDay } from "./visitor-salts";
interface NormalizeRecordContext {
  visitorSalt(day: string): string;
  getVisitContext(
    siteId: string,
    visitId: string,
  ): Promise<StoredOpenVisit | null>;
  findRecentVisitorSession(input: {
    siteId: string;
    visitorId: string;
    visitId: string;
    startedAt: number;
    routePreviousHostname?: string;
    routePreviousPathname?: string;
    routePreviousQueryString?: string;
    routePreviousHashFragment?: string;
  }): RecentVisitorSession | null;
  insertBufferedCustomEvent(record: BufferedCustomEventInput): boolean;
}
/** Decimal places a page view's coordinates keep: 1 is about 11 km, a city. */
const COORDINATE_DECIMALS = 1;
/**
 * A Cloudflare coordinate rounded to city level, the way SQLite's ROUND does
 * (half away from zero), so migrated and new rows land on the same point.
 */
function cityLevelCoordinate(value: unknown): number | null {
  const coordinate = coerceNumber(value, null);
  return coordinate === null
    ? null
    : Number(coordinate.toFixed(COORDINATE_DECIMALS));
}
function utmField(value: unknown): string {
  return clampString(coerceString(value || ""), 255);
}
function sessionAttributionOf(
  session: RecentVisitorSession,
): SessionAttribution {
  return {
    referrerUrl: session.referrerUrl,
    referrerHost: session.referrerHost,
    utmSource: session.utmSource,
    utmMedium: session.utmMedium,
    utmCampaign: session.utmCampaign,
    utmTerm: session.utmTerm,
    utmContent: session.utmContent,
  };
}
export async function normalizeIngestRecord(
  envelope: IngestEnvelopePayload,
  context: NormalizeRecordContext,
): Promise<NormalizeResult> {
  const client = envelope.client ?? ({} as TrackerClientPayload);
  const traceId = envelope.trace?.id || "";
  const siteId = clampString(coerceString(client.siteId), 120);
  if (!siteId) return { record: null, reason: "missing_site_id" };

  const requestHeaders = envelope.request.headers ?? {};
  const nowMs = Date.now();
  const receivedAt = clampTimestamp(envelope.request.receivedAt, nowMs);
  const eventAt = resolveTrustedClientTimestamp(client.timestamp, receivedAt);
  const startedAt = Math.min(
    resolveTrustedClientTimestamp(client.startedAt, receivedAt, eventAt),
    eventAt,
  );
  const kind = clampString(coerceString(client.kind), 40) as TrackerPayloadKind;
  const visitId = clampString(coerceString(client.visitId), 128);

  const cf = envelope.request.cf ?? {};
  // Hashed into the visitor id and parsed below; never stored.
  const userAgent = clampString(
    coerceString(requestHeaders["user-agent"] ?? ""),
    1024,
  );
  const uaHeaders = mergeUaClientHintsIntoHeaders(
    requestHeaders,
    client.uaClientHints,
  );
  const ua = await new UAParser(uaHeaders).getResult().withClientHints();
  const isEU = Boolean(cf.isEUCountry);

  // A daily-rotating hash: the browser stores nothing, as in Plausible. The
  // salt belongs to the UTC day of startedAt, the time the row is filed
  // under, so no visitor (and no visit, which ends when the id changes)
  // spans two UTC days and the daily rollups can add days together.
  const visitorId = await deriveVisitorId({
    salt: context.visitorSalt(utcDay(startedAt)),
    siteId,
    ip: clampString(
      coerceString(
        requestHeaders["cf-connecting-ip"] ??
          requestHeaders["x-forwarded-for"] ??
          "",
      ),
      80,
    ),
    ua: userAgent,
  });

  const contextGeoBase = {
    isEU,
    country: clampString(coerceString(cf.country ?? ""), 10),
    region: clampString(coerceString(cf.region ?? ""), 128),
    regionCode: clampString(coerceString(cf.regionCode ?? ""), 32),
    city: clampString(coerceString(cf.city ?? ""), 128),
    continent: clampString(coerceString(cf.continent ?? ""), 32),
    latitude: cityLevelCoordinate(cf.latitude),
    longitude: cityLevelCoordinate(cf.longitude),
    timezone: clampString(
      coerceString(client.timezone || cf.timezone || ""),
      120,
    ),
    browser: clampString(coerceString(ua.browser.name ?? ""), 80),
    browserVersion: clampString(coerceString(ua.browser.version ?? ""), 80),
    os: clampString(coerceString(ua.os.name ?? ""), 80),
    osVersion: clampString(coerceString(ua.os.version ?? ""), 80),
    deviceType: clampString(coerceString(ua.device.type ?? "desktop"), 40),
  };

  if (kind === "pageview") {
    if (!visitId) return { record: null, reason: "missing_visit_id" };
    const pathname = clampString(coerceString(client.pathname || "/"), 2048);
    const hostname = clampString(
      coerceString(client.hostname || ""),
      255,
    ).toLowerCase();
    if (!hostname) {
      return { record: null, reason: "missing_hostname" };
    }
    const rawReferrerUrl = clampString(coerceString(client.referrerUrl), 2000);
    const rawReferrerHost = safeHostname(rawReferrerUrl);
    const referrerIsSameHostname = isSameHostname(rawReferrerHost, hostname);
    const referrerUrl = referrerIsSameHostname ? "" : rawReferrerUrl;
    const referrerHost = referrerIsSameHostname
      ? ""
      : clampString(canonicalSourceHost(rawReferrerHost), 255);
    const navigationKind = clampString(coerceString(client.navigation), 40);
    let routePreviousHostname = "";
    let routePreviousPathname = "";
    let routePreviousQueryString = "";
    let routePreviousHashFragment = "";
    if (navigationKind === "route" && referrerIsSameHostname) {
      try {
        const routePreviousUrl = new URL(rawReferrerUrl);
        routePreviousHostname = clampString(routePreviousUrl.hostname, 255)
          .toLowerCase()
          .replace(/\.+$/, "");
        routePreviousPathname = clampString(
          routePreviousUrl.pathname || "/",
          2048,
        );
        routePreviousQueryString = clampString(
          routePreviousUrl.search || "",
          2048,
        );
        routePreviousHashFragment = clampString(
          routePreviousUrl.hash || "",
          1024,
        );
      } catch {
        routePreviousHostname = "";
        routePreviousPathname = "";
        routePreviousQueryString = "";
        routePreviousHashFragment = "";
      }
    }
    const recentSession = context.findRecentVisitorSession({
      siteId,
      visitorId,
      visitId,
      startedAt,
      routePreviousHostname,
      routePreviousPathname,
      routePreviousQueryString,
      routePreviousHashFragment,
    });
    const sessionId =
      recentSession?.sessionId ||
      (await deriveServerSessionId({
        siteId,
        visitorId,
        visitId,
        startedAt,
      }));
    const recentStatus = recentSession?.status || "";
    const recentOpenVisit =
      recentSession?.visitId &&
      navigationKind === "route" &&
      Number(recentSession.routeMatch ?? 0) > 0 &&
      (recentStatus === "open" || recentStatus === "hidden_pending")
        ? recentSession
        : null;
    // Every pageview of a session carries the session's source: the entry's
    // referrer and UTM tags. A later pageview's own referrer is the site
    // itself, which would count it as Direct.
    const attribution: SessionAttribution = recentSession
      ? sessionAttributionOf(recentSession)
      : {
          referrerUrl,
          referrerHost,
          utmSource: utmField(client.utmSource),
          utmMedium: utmField(client.utmMedium),
          utmCampaign: utmField(client.utmCampaign),
          utmTerm: utmField(client.utmTerm),
          utmContent: utmField(client.utmContent),
        };
    return {
      record: {
        kind: "pageview",
        traceId,
        receivedAt,
        siteId,
        visitId,
        visitorId,
        sessionId,
        previousVisitId: recentOpenVisit?.visitId || "",
        previousVisitStartedAt: recentOpenVisit?.startedAt ?? null,
        previousScrollDepth: normalizeScrollDepth(client.previousScrollDepth),
        startedAt,
        pathname,
        queryString: clampString(coerceString(client.query || ""), 2048),
        hashFragment: clampString(coerceString(client.hash || ""), 1024),
        hostname,
        title: clampString(coerceString(client.title || ""), 1024),
        ...attribution,
        channel: classifyTrafficChannel(attribution),
        screenWidth: coerceNumber(client.screenWidth, null),
        screenHeight: coerceNumber(client.screenHeight, null),
        language: clampString(coerceString(client.language || ""), 120),
        ...contextGeoBase,
        properties: normalizePageProperties(client.props),
      } satisfies NormalizedPageview,
    };
  }

  if (kind === "leave") {
    if (!visitId) return { record: null, reason: "missing_visit_id" };
    return {
      record: {
        kind: "leave",
        traceId,
        siteId,
        visitId,
        receivedAt,
        leaveAt: eventAt,
        exitReason:
          clampString(coerceString(client.exitReason || ""), 40) || "pagehide",
        scrollDepth: normalizeScrollDepth(client.scrollDepth),
      } satisfies NormalizedLeave,
    };
  }

  if (kind === "visibility") {
    if (!visitId) return { record: null, reason: "missing_visit_id" };
    const visibilityState = clampString(
      coerceString(client.visibilityState || ""),
      20,
    );
    if (visibilityState !== "hidden" && visibilityState !== "visible") {
      return {
        record: null,
        reason: "invalid_visibility_state",
        detail: { visibilityState },
      };
    }
    return {
      record: {
        kind: "visibility",
        traceId,
        siteId,
        visitId,
        visibilityState,
        receivedAt,
        eventAt,
        scrollDepth: normalizeScrollDepth(client.scrollDepth),
      } satisfies NormalizedVisibility,
    };
  }

  if (kind === "custom_event") {
    if (!visitId) return { record: null, reason: "missing_visit_id" };
    const eventName = clampString(coerceString(client.eventName), 120);
    if (!eventName) return { record: null, reason: "missing_event_name" };
    const eventDataResult = expandCustomEventData(client.eventData);
    if (!eventDataResult.ok) {
      return {
        record: null,
        reason: "invalid_custom_event_data",
        detail: { error: eventDataResult.error },
      };
    }
    const revenue = normalizeEventRevenue(client.revenue);
    const visit = await context.getVisitContext(siteId, visitId);
    const sequence = 0;
    const eventId = clampString(
      coerceString(client.eventId || crypto.randomUUID()),
      128,
    );
    if (!visit) {
      const inserted = context.insertBufferedCustomEvent({
        eventId,
        siteId,
        visitId,
        occurredAt: eventAt,
        receivedAt,
        sequence,
        eventName,
        eventDataJson: eventDataResult.data.json,
        ...revenue,
      });
      return {
        record: null,
        reason: "waiting_for_visit",
        detail: { eventId, eventName, buffered: inserted },
      };
    }
    return {
      record: {
        kind: "custom_event",
        traceId,
        eventId,
        sequence,
        receivedAt,
        eventAt,
        eventName,
        eventDataJson: eventDataResult.data.json,
        ...revenue,
        siteId: visit.siteId,
        visitId: visit.visitId,
        visitorId: visit.visitorId,
        sessionId: visit.sessionId,
        startedAt: visit.startedAt,
        pathname: visit.pathname,
        queryString: visit.queryString,
        hashFragment: visit.hashFragment,
        hostname: visit.hostname,
        title: visit.title,
        referrerUrl: visit.referrerUrl,
        referrerHost: visit.referrerHost,
        utmSource: visit.utmSource,
        utmMedium: visit.utmMedium,
        utmCampaign: visit.utmCampaign,
        utmTerm: visit.utmTerm,
        utmContent: visit.utmContent,
        isEU: visit.isEU,
        country: visit.country,
        region: visit.region,
        regionCode: visit.regionCode,
        city: visit.city,
        continent: visit.continent,
        latitude: visit.latitude,
        longitude: visit.longitude,
        timezone: visit.timezone,
        browser: visit.browser,
        browserVersion: visit.browserVersion,
        os: visit.os,
        osVersion: visit.osVersion,
        deviceType: visit.deviceType,
        screenWidth: visit.screenWidth,
        screenHeight: visit.screenHeight,
        language: visit.language,
      } satisfies NormalizedCustomEvent,
    };
  }

  return { record: null, reason: "unsupported_kind", detail: { kind } };
}
