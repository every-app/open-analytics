import type { TrafficChannelId } from "@/lib/analytics/traffic-channel-rules";

export interface Env {
  DB: D1Database;
  INGEST_DO: DurableObjectNamespace;
  SITE_SETTINGS_KV?: KVNamespace;
  MAIN_SECRET?: string;
  DISABLE_CRON_TASKS?: string;
  /** Another OpenMapTiles style host for the dashboard maps (map-relay.ts). */
  MAP_STYLE_BASE_URL?: string;
  SCRIPT_CACHE_TTL_SECONDS?: string;
  /** The organization a deployment is pinned to (everyAppWorker). */
  EVERY_APP_ORG_ID?: string;
  /** The Every App gateway's URL (everyAppWorker). */
  GATEWAY_URL?: string;
  /**
   * Set by `everyapp dev` (everyAppWorker), never by a deploy: the setup
   * error then says .dev.vars instead of the secret command.
   */
  EVERYAPP_DEV?: string;
}

export interface SerializedRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  cf: Record<string, unknown> | null;
  body: string;
  receivedAt: number;
}

export interface IngestTracePayload {
  id: string;
  source: string;
  acceptedAt: number;
}

export type TrackerPayloadKind =
  "pageview" | "leave" | "visibility" | "custom_event";

export interface TrackerUaBrandVersion {
  brand?: string;
  version?: string;
}

export interface TrackerUaClientHints {
  brands?: TrackerUaBrandVersion[];
  fullVersionList?: TrackerUaBrandVersion[];
  mobile?: boolean;
  platform?: string;
  platformVersion?: string;
  model?: string;
  formFactors?: string[];
}

export interface TrackerClientPayload {
  siteId?: string;
  kind?: TrackerPayloadKind;
  visitId?: string;
  previousVisitId?: string;
  eventId?: string;
  sequence?: number;
  navigation?: string;
  timestamp?: number;
  startedAt?: number;
  pathname?: string;
  query?: string;
  hash?: string;
  hostname?: string;
  title?: string;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
  referrerUrl?: string;
  exitReason?: string;
  visibilityState?: string;
  /** The page view's scroll depth, on a hidden visibility payload or a leave. */
  scrollDepth?: number;
  /** The depth of the page view a route change ends. */
  previousScrollDepth?: number;
  eventName?: string;
  eventData?: unknown;
  /** `{ amount, currency }`, validated by the ingest Durable Object. */
  revenue?: unknown;
  /** A page view's custom properties: flat string pairs. */
  props?: unknown;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  uaClientHints?: TrackerUaClientHints;
}

export interface IngestEnvelope {
  request: SerializedRequestPayload;
  client: TrackerClientPayload;
  trace?: IngestTracePayload;
}

export interface IngestEnvelopePayload extends IngestEnvelope {
  request: SerializedRequestPayload;
  client: TrackerClientPayload;
  trace?: IngestTracePayload;
}

export interface NormalizedVisitContext {
  traceId?: string;
  siteId: string;
  visitId: string;
  visitorId: string;
  sessionId: string;
  startedAt: number;
  pathname: string;
  queryString: string;
  hashFragment: string;
  hostname: string;
  title: string;
  referrerUrl: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  isEU: boolean;
  country: string;
  region: string;
  regionCode: string;
  city: string;
  continent: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  screenWidth: number | null;
  screenHeight: number | null;
  language: string;
}

export interface NormalizedPageview extends NormalizedVisitContext {
  kind: "pageview";
  previousVisitId: string;
  previousVisitStartedAt: number | null;
  previousScrollDepth: number | null;
  receivedAt: number;
  /** The session's channel, from its referrer and UTM tags. */
  channel: TrafficChannelId;
  /** Custom properties, normalized by `normalizePageProperties`. */
  properties: Record<string, string>;
}

export interface NormalizedLeave {
  kind: "leave";
  traceId?: string;
  siteId: string;
  visitId: string;
  receivedAt: number;
  leaveAt: number;
  exitReason: string;
  scrollDepth: number | null;
}

export interface NormalizedVisibility {
  kind: "visibility";
  traceId?: string;
  siteId: string;
  visitId: string;
  visibilityState: "hidden" | "visible";
  receivedAt: number;
  eventAt: number;
  scrollDepth: number | null;
}

export interface NormalizedCustomEvent extends NormalizedVisitContext {
  kind: "custom_event";
  eventId: string;
  sequence: number;
  receivedAt: number;
  eventAt: number;
  eventName: string;
  eventDataJson: string;
  revenueAmount: number | null;
  revenueCurrency: string | null;
}

export type NormalizedIngestRecord =
  | NormalizedPageview
  | NormalizedLeave
  | NormalizedVisibility
  | NormalizedCustomEvent;
