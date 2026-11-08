export type { FilterDocument } from "@/lib/edge/analytics/contract";
export type {
  EventRecordSortKey,
  Interval,
  ListSort,
  QueryWindow,
} from "@/lib/edge/analytics/contract";
export type { TeamSiteRow } from "@/lib/edge/analytics/contract";
export { DEFAULT_EVENT_RECORD_SORT } from "@/lib/edge/analytics/contract";
export interface OverviewAggregateRow {
  views: number;
  sessions: number;
  visitors: number;
  bounces: number;
  totalDuration: number;
  durationViews: number;
  /**
   * Each visitor's deepest scroll on each page, averaged over the visitors,
   * in %; null when no page view reported one. Read only with a page path
   * filter, the only time the dashboard shows it.
   */
  scrollDepth?: number | null;
}
export interface TrendAggregateRow extends OverviewAggregateRow {
  bucket: number;
  timestampMs: number;
}
export interface DimensionRow {
  value: string;
  views: number;
  sessions: number;
  visitors: number;
}
export interface GeoTabRow {
  value: string;
  label: string;
  views: number;
  sessions: number;
  visitors: number;
}
export interface EventAnalyticsContextCards {
  page: {
    path: DimensionRow[];
    query: DimensionRow[];
    title: DimensionRow[];
    hostname: DimensionRow[];
    entry: DimensionRow[];
    exit: DimensionRow[];
  };
  source: {
    domain: DimensionRow[];
    link: DimensionRow[];
  };
  client: ClientDimensionTabs;
  geo: GeoDimensionTabs;
}
export interface EventSummaryCards {
  event: {
    name: DimensionRow[];
  };
  page: {
    path: DimensionRow[];
    title: DimensionRow[];
    hostname: DimensionRow[];
  };
}
export interface PageRow {
  pathname: string;
  views: number;
  sessions: number;
}
export interface PageCardAggregateRow extends OverviewAggregateRow {
  pathname: string;
  scrollDepth: number | null;
}
export interface PageCardTitleRow {
  pathname: string;
  title: string;
  views: number;
}
export interface PageCardTrendRow {
  pathname: string;
  bucket: number;
  timestampMs: number;
  views: number;
  visitors: number;
}
export interface ReferrerRow {
  referrer: string;
  views: number;
  sessions: number;
  visitors: number;
}
export interface EventSummaryRow {
  events: number;
  eventTypes: number;
  sessions: number;
  visitors: number;
}
export interface EventRecordRow {
  eventId: string;
  eventName: string;
  occurredAt: number;
  receivedAt: number;
  sequence: number;
  visitId: string;
  sessionId: string;
  visitorId: string;
  pathname: string;
  title: string;
  hostname: string;
  referrerHost: string;
  country: string;
  region: string;
  city: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  /** The event's custom properties, a JSON object. */
  propertiesJson: string;
}
export interface EventTrendSeriesRow {
  eventName: string;
  events: number;
  sessions: number;
  visitors: number;
}
export interface EventTrendPointRow {
  bucket: number;
  seriesKey: string;
  events: number;
}
export interface EventTypeTrendPointRow {
  bucket: number;
  events: number;
  visitors: number;
}
export type {
  ClientDimensionKey,
  UtmDimensionKey,
} from "@/lib/edge/analytics/contract";
export type OverviewGeoTabKey =
  "country" | "region" | "city" | "continent" | "timezone";
export interface ClientDimensionTabs {
  browser: DimensionRow[];
  osVersion: DimensionRow[];
  deviceType: DimensionRow[];
  language: DimensionRow[];
  screenSize: DimensionRow[];
}
export interface GeoDimensionTabs {
  country: GeoTabRow[];
  region: GeoTabRow[];
  city: GeoTabRow[];
  continent: GeoTabRow[];
  timezone: GeoTabRow[];
}
export interface PublicSiteEnvelope {
  slug: string;
  name: string;
  domain: string;
}
export interface PreferredSourceResult<T> {
  value: T;
  source: "ae" | "d1";
  diagnosticSource?: "raw" | "rollup";
  approximateVisitors?: boolean;
}
export interface DashboardFilterOption {
  value: string;
  label: string;
  group?: "country" | "region" | "city";
}
export const SHARE_TREND_OTHER_KEY = "other";
export const SHARE_TREND_OTHER_LABEL = "Other";
export const SHARE_TREND_OTHER_TOKEN = "__share_trend_other__";
export const DIRECT_REFERRER_FILTER_VALUE = "__direct__";
