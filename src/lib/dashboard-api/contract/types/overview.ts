import type { DashboardCard } from "@/lib/edge/analytics/contract/dashboard";

import type { PaginatedCollection } from "./pagination";

export interface OverviewMetrics {
  views: number;
  sessions: number;
  visitors: number;
  bounces: number;
  totalDurationMs: number;
  avgDurationMs: number;
  bounceRate: number;
  approximateVisitors?: boolean;
  /**
   * Each visitor's deepest scroll on each page, averaged over the visitors,
   * in %; null when no page view reported one. Only with a page path filter.
   */
  scrollDepth?: number | null;
}

export interface OverviewDetailPoint {
  bucket: number;
  timestampMs: number;
  views: number;
  visitors: number;
  sessions: number;
  bounces: number;
  totalDurationMs: number;
  avgDurationMs: number;
  /**
   * Each visitor's deepest scroll on each page, averaged over the visitors,
   * in %; null when no page view reported one. Only with a page path filter.
   */
  scrollDepth?: number | null;
  source: "detail";
}

export interface OverviewDetailData {
  interval: "minute" | "hour" | "day" | "week" | "month";
  data: OverviewDetailPoint[];
}

export interface OverviewData {
  ok: boolean;
  data: OverviewMetrics;
  detail?: OverviewDetailData;
}

export interface TrendPoint {
  bucket: number;
  timestampMs: number;
  views: number;
  visitors: number;
  sessions: number;
  bounces: number;
  totalDurationMs: number;
  avgDurationMs: number;
  /**
   * Each visitor's deepest scroll on each page, averaged over the visitors,
   * in %; null when no page view reported one. Only with a page path filter.
   */
  scrollDepth?: number | null;
  source: "detail";
}

export interface TrendData {
  ok: boolean;
  interval: "minute" | "hour" | "day" | "week" | "month";
  data: TrendPoint[];
}

/**
 * A dashboard load: the totals, the graph's points and, unless Compare is
 * on, the top rows of the tab each card shows.
 */
export interface DashboardData {
  ok: boolean;
  overview: OverviewMetrics;
  trend: Omit<TrendData, "ok">;
  cards?: Record<DashboardCard, DashboardCardRowData[]>;
}

/** A card row of a dashboard load: what it groups by, and how that reads. */
export interface DashboardCardRowData {
  value: string;
  label: string;
  views: number;
  sessions: number;
  visitors: number;
}

export interface OverviewClientDimensionTabsData {
  ok: boolean;
  tabs: {
    browser: Array<{ label: string; views: number; sessions: number }>;
    osVersion: Array<{ label: string; views: number; sessions: number }>;
    deviceType: Array<{ label: string; views: number; sessions: number }>;
    language: Array<{ label: string; views: number; sessions: number }>;
    screenSize: Array<{ label: string; views: number; sessions: number }>;
  };
}

export interface OverviewGeoDimensionTabsData {
  ok: boolean;
  tabs: {
    country: Array<{ label: string; views: number; sessions: number }>;
    region: Array<{ label: string; views: number; sessions: number }>;
    city: Array<{ label: string; views: number; sessions: number }>;
    continent: Array<{ label: string; views: number; sessions: number }>;
    timezone: Array<{ label: string; views: number; sessions: number }>;
  };
}

export interface OverviewTabData {
  ok: boolean;
  data: PaginatedCollection<OverviewTableRow>;
}

export interface OverviewGeoTabData {
  ok: boolean;
  data: PaginatedCollection<OverviewTableRow & { value?: string }>;
}

export interface OverviewTableRow {
  /** Canonical dimension key. Legacy responses may omit it. */
  key?: string;
  value?: string;
  label: string;
  views: number;
  sessions: number;
  visitors: number;
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
}
