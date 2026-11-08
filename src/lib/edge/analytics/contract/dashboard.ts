import type {
  BaseQuery,
  CalendarGranularity,
  OverviewMetrics,
  TrendResult,
} from "./types";

/** The dashboard's report cards. */
export enum DashboardCard {
  Sources = "sources",
  Pages = "pages",
  Locations = "locations",
  Devices = "devices",
}

/**
 * What the Sources card lists: channels, referring sites, or the visits
 * tagged with one UTM parameter.
 */
export enum SourcesCardTab {
  Channel = "channel",
  Domain = "domain",
  UtmSource = "utm.source",
  UtmMedium = "utm.medium",
  UtmCampaign = "utm.campaign",
  UtmTerm = "utm.term",
  UtmContent = "utm.content",
}

export enum PagesCardTab {
  Path = "path",
  Entry = "entry",
  Exit = "exit",
}

/** The map lists every country; the other tabs their top rows. */
export enum LocationsCardTab {
  Map = "map",
  Country = "country",
  Region = "region",
  City = "city",
}

export enum DevicesCardTab {
  Browser = "browser",
  OsVersion = "osVersion",
  DeviceType = "deviceType",
}

/** The tab each card shows. */
export interface DashboardCardTabs {
  readonly [DashboardCard.Sources]: SourcesCardTab;
  readonly [DashboardCard.Pages]: PagesCardTab;
  readonly [DashboardCard.Locations]: LocationsCardTab;
  readonly [DashboardCard.Devices]: DevicesCardTab;
}

/** The rows a card shows before its Details view, by visitors. */
export const DASHBOARD_CARD_ROW_LIMIT = 10;

export interface DashboardQuery extends BaseQuery {
  readonly interval: CalendarGranularity;
  /**
   * The tab each card shows, whose top rows come along. None while Compare
   * is on: the cards then read their comparison rows themselves.
   */
  readonly cards?: DashboardCardTabs;
}

/** One row of a card: what it groups by, how that reads, and its counts. */
export interface DashboardCardRow {
  readonly value: string;
  readonly label: string;
  readonly views: number;
  readonly sessions: number;
  readonly visitors: number;
}

/** Everything a dashboard load shows: the top stats, the graph and the cards. */
export interface DashboardResult {
  readonly overview: OverviewMetrics;
  readonly trend: TrendResult;
  readonly cards?: Readonly<Record<DashboardCard, readonly DashboardCardRow[]>>;
}
