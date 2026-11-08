import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import type {
  DashboardFilterOption,
  OverviewClientDimensionTabsData as OverviewClientDimensionTabsResponse,
  OverviewGeoDimensionTabsData as OverviewGeoDimensionTabsResponse,
  OverviewTabData,
  PagesDashboardData,
} from "@/lib/dashboard-api/client/edge";
import type {
  PagesDashboardMetric,
  PagesDashboardSortKey,
} from "@/lib/dashboard-api/contract/types/pages";
import type { AnalyticsFilterFieldId } from "@/lib/filter-contract";
export type DashboardFilterOptionData = DashboardFilterOption;
export type OverviewClientDimensionTabsData =
  OverviewClientDimensionTabsResponse["tabs"];
export type OverviewGeoDimensionTabsData =
  OverviewGeoDimensionTabsResponse["tabs"];
export type OverviewTabRows = OverviewTabData["data"]["items"];
export type OverviewTabCollection = OverviewTabData["data"];
export type OverviewGeoTabRows = Array<{
  value: string;
  label: string;
  views: number;
  sessions: number;
  visitors: number;
  key?: string;
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
}>;
export type PagesDashboardRows = PagesDashboardData["data"]["items"];
export type PagesDashboardRow = PagesDashboardRows[number];
export type SortDirection = "asc" | "desc";
export type PrivateRequestParams = Record<string, string | number>;
export type DashboardListRequestOptions = {
  limit?: number;
  cursor?: string | null;
  search?: string;
  sort?: "views" | "sessions" | "visitors";
  direction?: SortDirection;
  comparison?: DashboardComparisonQuery | null;
  comparisonMetric?: "views" | "visitors" | "sessions";
  comparisonSortBy?: "current" | "reference" | "change";
  signal?: AbortSignal;
};
export type PagesDashboardListRequestOptions = Omit<
  DashboardListRequestOptions,
  "sort" | "comparisonMetric"
> & {
  sort?: PagesDashboardSortKey;
  comparisonMetric?: PagesDashboardMetric;
};
export type FetchPrivateJsonOptions = {
  signal?: AbortSignal;
  dedupe?: boolean;
};
export type OverviewPageCardTab = "path" | "entry" | "exit";
export type OverviewSourceCardTab = "domain" | "channel";
export type OverviewClientDimensionTab = "browser" | "osVersion" | "deviceType";
export type OverviewGeoDimensionTab = "country" | "region" | "city";
export type DashboardFilterOptionKey = Exclude<
  AnalyticsFilterFieldId,
  "event.payload"
>;
export type UtmDimensionTab =
  "source" | "medium" | "campaign" | "term" | "content";
