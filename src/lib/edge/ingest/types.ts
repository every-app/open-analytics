import type {
  NormalizedIngestRecord,
  NormalizedVisitContext,
} from "@/lib/edge/types";

import type { SqlBinding, VisitBindingRow } from "./sql";
export interface StoredOpenVisit extends NormalizedVisitContext {
  lastActivityAt: number;
}
export interface VisitRow {
  visitId: string;
  status: string;
  siteId: string;
  visitorId: number;
  sessionId: number;
  startedAt: number;
  lastActivityAt: number;
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
  isEU: number;
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
export interface BufferedVisitRow extends VisitRow, VisitBindingRow {
  hiddenAt?: number | null;
  endedAt: number | null;
  finalizedAt: number | null;
  durationMs: number | null;
  durationSource: string;
  exitReason: string;
  dirty: number;
  flushAttempts: number;
  lastFlushError?: string | null;
  bufferRevision: number;
  createdAt: number;
  updatedAt: number;
}
export interface BufferedCustomEventRow {
  eventId: string;
  siteId: string;
  visitId: string;
  occurredAt: number;
  receivedAt: number;
  sequence: number;
  eventName: string;
  /** The event's custom properties as a JSON object, NULL if none. */
  propertiesJson: string | null;
  revenueAmount: number | null;
  revenueCurrency: string | null;
  dirty: number;
  flushAttempts: number;
  lastFlushError?: string | null;
  createdAt: number;
}
export interface BufferedCustomEventInput {
  eventId: string;
  siteId: string;
  visitId: string;
  occurredAt: number;
  receivedAt: number;
  sequence: number;
  eventName: string;
  /** The event's custom properties as a JSON object, NULL if none. */
  propertiesJson: string | null;
  revenueAmount: number | null;
  revenueCurrency: string | null;
}
/** The attribution every pageview of a session carries: its entry's source. */
export interface SessionAttribution {
  referrerUrl: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
}
export interface RecentVisitorSession extends SessionAttribution {
  sessionId: number;
  visitId?: string;
  status?: string;
  routeMatch?: number;
  startedAt: number;
  lastActivityAt: number;
}
export interface NormalizeResult {
  record: NormalizedIngestRecord | null;
  reason?: string;
  detail?: Record<string, unknown>;
}
export interface SqlReader {
  sqlAll<T>(query: string, ...bindings: SqlBinding[]): T[];
  sqlOne<T>(query: string, ...bindings: SqlBinding[]): T | null;
}
export interface SqlWriter extends SqlReader {
  sqlRun(query: string, ...bindings: SqlBinding[]): number;
}
