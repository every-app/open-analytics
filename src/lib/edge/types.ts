export interface Env {
  DB: D1Database;
  INGEST_DO: DurableObjectNamespace;
  SITE_SETTINGS_KV?: KVNamespace;
  MAIN_SECRET?: string;
  DAILY_SALT_SECRET?: string;
  DISABLE_CRON_TASKS?: string;
  MAP_RELAY_BASE_URL?: string;
  SESSION_WINDOW_MINUTES?: string;
  SCRIPT_CACHE_TTL_SECONDS?: string;
  /** The organization a deployment is pinned to (everyAppWorker). */
  EVERY_APP_ORG_ID?: string;
  /** The Every App gateway's URL (everyAppWorker). */
  GATEWAY_URL?: string;
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
  "pageview" | "leave" | "visibility" | "custom_event" | "identify";

export interface TrackerPerformancePayload {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  inp?: number;
}

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
  performanceVisitId?: string;
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
  visitorId?: string;
  userId?: string;
  userName?: string;
  durationMs?: number;
  exitReason?: string;
  visibilityState?: string;
  eventName?: string;
  eventData?: unknown;
  performance?: TrackerPerformancePayload;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  uaClientHints?: TrackerUaClientHints;
  collectToken?: string;
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
  userId?: string;
  userName?: string;
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
  postalCode: string;
  metroCode: string;
  timezone: string;
  asOrganization: string;
  uaRaw: string;
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
  receivedAt: number;
}

export interface NormalizedLeave {
  kind: "leave";
  traceId?: string;
  siteId: string;
  visitId: string;
  performanceVisitId: string;
  receivedAt: number;
  leaveAt: number;
  durationMs: number | null;
  exitReason: string;
  performance: TrackerPerformancePayload | null;
}

export interface NormalizedVisibility {
  kind: "visibility";
  traceId?: string;
  siteId: string;
  visitId: string;
  visibilityState: "hidden" | "visible";
  receivedAt: number;
  eventAt: number;
}

export interface NormalizedCustomEvent extends NormalizedVisitContext {
  kind: "custom_event";
  eventId: string;
  sequence: number;
  receivedAt: number;
  eventAt: number;
  eventName: string;
  eventDataJson: string;
}

export interface NormalizedIdentify {
  kind: "identify";
  traceId?: string;
  siteId: string;
  visitId: string;
  userId: string;
  userName: string;
  receivedAt: number;
}

export type NormalizedIngestRecord =
  | NormalizedPageview
  | NormalizedLeave
  | NormalizedVisibility
  | NormalizedCustomEvent
  | NormalizedIdentify;
