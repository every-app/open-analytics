import { type TrafficChannelId } from "@/lib/analytics/traffic-channel-rules";
import { type OverviewTabRows } from "@/lib/dashboard/client/data/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

export interface OverviewClientPageProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  siteDomain: string;
  /** The site's Goals page, for the goal card's rows; none on a share page. */
  goalsPath?: string;
}

export type SourceTab = "channel" | "domain" | "campaigns";

export type PageTab = "path" | "entry" | "exit";

export type LocationTab = "map" | "country" | "region" | "city";

export type DeviceTab = "browser" | "osVersion" | "deviceType";

/** What a row can be sorted by: its metrics, or a comparison's columns. */
export type ReportSortKey =
  | "visitors"
  | "sessions"
  | "views"
  | "events"
  | "bounceRate"
  | "avgDurationMs"
  | "scrollDepth"
  | "current"
  | "reference"
  | "change";

/** One row of a dashboard card, whichever card. */
export interface ReportRow {
  key: string;
  /** Shown, searched and exported. */
  label: string;
  /** Shown instead of the label, like a decoded URL. */
  displayLabel?: string;
  /** The value a click filters by. */
  filterValue: string;
  views: number;
  sessions: number;
  visitors: number;
  /** The Pages card's extra metrics. */
  bounceRate?: number;
  avgDurationMs?: number;
  /** Null for a page none of whose page views reported a scroll depth. */
  scrollDepth?: number | null;
  /** The Properties card's events with the value. */
  events?: number;
  reference?: {
    views: number;
    sessions: number;
    visitors: number;
  };
  change?: {
    views: { absolute: number; relative: number | null };
    sessions: { absolute: number; relative: number | null };
    visitors: { absolute: number; relative: number | null };
  };
  mono: boolean;
  iconName?: string | null;
  channelId?: TrafficChannelId;
  /** Where the row's label links to, like a referring page. */
  targetUrl?: string | null;
  regionBreadcrumb?: {
    countryLabel: string;
    countryIconName: string | null;
    regionLabel: string;
    countryCode: string;
    stateCode: string;
    hideRegion: boolean;
  };
  cityBreadcrumb?: {
    countryLabel: string;
    countryIconName: string | null;
    regionLabel: string;
    cityLabel: string;
    countryCode: string;
    stateCode: string;
    cityNameDefault: string;
    hideRegion: boolean;
    hideCity: boolean;
  };
}

/** Rows handed to the cards instead of fetched: Realtime's live visits. */
export interface LocalCardData {
  source: { domain: OverviewTabRows };
  page: Record<PageTab, OverviewTabRows>;
  geo: Record<Exclude<LocationTab, "map">, OverviewTabRows>;
  client: Record<DeviceTab, OverviewTabRows>;
}
