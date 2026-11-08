import type { PaginatedCollection } from "./pagination";

export interface PageItem {
  pathname: string;
  views: number;
  sessions: number;
}

export interface PagesData {
  ok: boolean;
  data: PaginatedCollection<PageItem>;
}

export interface PagesDashboardMetrics {
  views: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  pagesPerSession: number;
  avgDurationMs: number;
}

export interface PagesDashboardChangeRates {
  views: number | null;
  visitors: number | null;
  sessions: number | null;
  bounceRate: number | null;
  pagesPerSession: number | null;
  avgDurationMs: number | null;
}

export type PagesDashboardMetric = keyof PagesDashboardMetrics;

/** The scroll depth sorts the pages but has no comparison. */
export type PagesDashboardSortKey = PagesDashboardMetric | "scrollDepth";

export interface PagesDashboardChange {
  views: { absolute: number; relative: number | null };
  visitors: { absolute: number; relative: number | null };
  sessions: { absolute: number; relative: number | null };
  bounceRate: { absolute: number; relative: number | null };
  pagesPerSession: { absolute: number; relative: number | null };
  avgDurationMs: { absolute: number; relative: number | null };
}

export interface PagesDashboardItem {
  pathname: string;
  titles: string[];
  /**
   * Each visitor's deepest scroll on the page, averaged over the visitors,
   * in %; null when no page view reported one.
   */
  scrollDepth: number | null;
  trend: Array<{
    timestampMs: number;
    views: number;
    visitors: number;
  }>;
  referenceTrend?: Array<{
    timestampMs: number;
    views: number;
    visitors: number;
  }>;
  metrics: PagesDashboardMetrics;
  changeRates: PagesDashboardChangeRates;
  reference?: PagesDashboardMetrics;
  change?: PagesDashboardChange;
}

export interface PagesDashboardData {
  ok: boolean;
  interval: "minute" | "hour" | "day" | "week" | "month";
  data: PaginatedCollection<PagesDashboardItem>;
}
