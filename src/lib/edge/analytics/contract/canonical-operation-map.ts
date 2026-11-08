import type { PageRequest, PaginationMeta } from "@/lib/pagination";

import type { DashboardQuery, DashboardResult } from "./dashboard";
import type {
  CanonicalEventRecordPageResult,
  CanonicalEventSummaryResult,
  CanonicalEventTrendResult,
  CanonicalEventTypeDetailResult,
  CanonicalEventTypeResult,
  CanonicalGoalConversionsResult,
  CanonicalGoalSummaryResult,
  CanonicalGoalTimeseriesResult,
} from "./operation-results";
import type { PagesDashboardResult } from "./pages-dashboard";
import type {
  PropertyKeysQuery,
  PropertyKeysResult,
  PropertyValuesQuery,
  PropertyValuesResult,
} from "./properties";
import type { TeamSitesQueryResult } from "./team-results";
import type { TeamDashboardData } from "./team-results";
import type {
  BaseQuery,
  BreakdownResult,
  CalendarGranularity,
  ChannelsResult,
  ComparisonBreakdownQuery,
  ComparisonBreakdownResult,
  ComparisonDatasetQuery,
  ComparisonMetricKey,
  ComparisonQuery,
  ComparisonResult,
  ComparisonTrendQuery,
  ComparisonTrendResult,
  EventRecordSortKey,
  FilterValuesQuery,
  FilterValuesResult,
  FunnelAnalysis,
  FunnelDefinition,
  Interval,
  ListSort,
  OverviewQuery,
  OverviewResult,
  OverviewTableComparisonQuery,
  PageQuery,
  PageResult,
  PagesDashboardQuery,
  PagesQuery,
  PagesResult,
  QueryOperation,
  RealtimeQuery,
  RealtimeQueryResult,
  ReferrersQuery,
  ReferrersResult,
  Sort,
  TrendQuery,
  TrendResult,
} from "./types";

/**
 * Query/result contracts at the canonical operation boundary.
 *
 * The catch-all entries below are individually named legacy contracts. New
 * providers should add a concrete query/result pair instead of extending
 * BaseQuery or CanonicalObject at their boundary.
 */
export interface DimensionOverviewTabQuery extends BaseQuery {
  readonly mode: "overview-tab";
  readonly tab: string;
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
  readonly limit?: number;
  readonly cursor?: string;
  readonly sort?: string;
  readonly direction?: "asc" | "desc";
  readonly search?: string;
  readonly comparison?: OverviewTableComparisonQuery;
  readonly current?: ComparisonDatasetQuery;
  readonly reference?: ComparisonDatasetQuery;
}

export interface OverviewTabResult {
  readonly data: {
    readonly items: readonly OverviewTabItem[];
    readonly pagination: PaginationMeta;
  };
}

export interface OverviewTabItem {
  readonly key?: string;
  readonly value?: string;
  readonly label?: string;
  readonly views?: number;
  readonly sessions?: number;
  readonly visitors?: number;
  readonly occurrences?: number;
  readonly reference?: object;
  readonly change?: object;
}

export interface DimensionBreakdownQuery extends BaseQuery {
  readonly mode: "breakdown";
  readonly dimension: string;
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
  readonly limit?: number;
  readonly page?: PageRequest;
  readonly sort?: Sort;
  readonly search?: string;
  readonly comparison?: object;
}

export type CanonicalDimensionQuery =
  DimensionBreakdownQuery | DimensionOverviewTabQuery;
export type CanonicalDimensionResult = BreakdownResult | OverviewTabResult;

export interface ChannelListQuery extends BaseQuery {
  readonly mode: "list";
  readonly limit: number;
}

export interface ChannelOverviewTabQuery extends BaseQuery {
  readonly mode: "overview-tab";
  readonly tab: "source.channel";
  readonly limit?: number;
  readonly cursor?: string;
  readonly direction?: "asc" | "desc";
  readonly search?: string;
  readonly sort?: string;
  readonly comparison?: OverviewTableComparisonQuery;
  readonly current?: ComparisonDatasetQuery;
  readonly reference?: ComparisonDatasetQuery;
}

export type CanonicalChannelsQuery = ChannelListQuery | ChannelOverviewTabQuery;
export type CanonicalChannelsResult = ChannelsResult | OverviewTabResult;

export type CanonicalFunnelAnalysisResult =
  | PageResult<FunnelDefinition>
  | {
      readonly funnel: FunnelDefinition | null;
      readonly analysis: FunnelAnalysis | null;
    };

export interface CanonicalPagesDashboardResult {
  readonly items: PagesResult["items"];
  readonly pagination: PagesResult["pagination"];
  readonly interval: CalendarGranularity;
}

export type CanonicalReferrersQuery = ReferrersQuery & {
  readonly mode?: "list" | "summary";
};

export type LegacyEventQuery = BaseQuery & {
  readonly page?: PageRequest;
  readonly eventId?: string;
  readonly eventName?: string;
  readonly fieldPath?: string;
  readonly fieldValueType?: string;
  readonly siteId?: string;
  readonly search?: string;
  readonly cursor?: string;
  readonly includeContext?: boolean;
  readonly includeBreakdowns?: boolean;
  readonly timeZone?: string;
  readonly limit?: number;
  readonly interval?: CalendarGranularity;
  readonly tab?: string;
  readonly sort?: ListSort<EventRecordSortKey>;
  readonly direction?: "asc" | "desc";
  readonly comparison?: object;
  readonly current?: object;
  readonly reference?: object;
};
export type LegacyAnalysisQuery = BaseQuery & {
  readonly goalId?: string;
  readonly funnelId?: string;
  readonly interval?: Interval;
  readonly page?: PageRequest;
};
export type LegacyTeamDashboardQuery = BaseQuery & {
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
  readonly interval?: Interval;
};
export type CanonicalOverviewQuery = OverviewQuery & {
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
};
export type CanonicalTrendQuery = TrendQuery & {
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
};
export type CanonicalTeamSitesQuery = PageQuery & {
  readonly teamId?: string;
  readonly allowedSiteIds?: readonly string[];
  readonly interval?: Interval;
};
export type CanonicalComparisonResult = ComparisonResult & {
  readonly trend?: ComparisonTrendResult;
};
export interface CanonicalComparisonQuery extends ComparisonQuery {
  readonly interval?: ComparisonTrendQuery["interval"];
  readonly trendMetrics?: readonly ComparisonMetricKey[];
}

/** Every QueryOperation must have exactly one canonical query/result pair. */
export interface CanonicalOperationMap {
  readonly overview: {
    readonly query: CanonicalOverviewQuery;
    readonly result: OverviewResult;
  };
  readonly trend: {
    readonly query: CanonicalTrendQuery;
    readonly result: TrendResult;
  };
  readonly dashboard: {
    readonly query: DashboardQuery;
    readonly result: DashboardResult;
  };
  readonly "team-sites": {
    readonly query: CanonicalTeamSitesQuery;
    readonly result: TeamSitesQueryResult["data"];
  };
  readonly comparison: {
    readonly query: CanonicalComparisonQuery;
    readonly result: CanonicalComparisonResult;
  };
  readonly "comparison-breakdown": {
    readonly query: ComparisonBreakdownQuery;
    readonly result: ComparisonBreakdownResult;
  };
  readonly dimension: {
    readonly query: CanonicalDimensionQuery;
    readonly result: CanonicalDimensionResult;
  };
  readonly pages: {
    readonly query: PagesQuery;
    readonly result: PagesResult;
  };
  readonly "pages-dashboard": {
    readonly query: PagesDashboardQuery;
    readonly result: PagesDashboardResult;
  };
  readonly referrers: {
    readonly query: CanonicalReferrersQuery;
    readonly result: ReferrersResult;
  };
  readonly channels: {
    readonly query: CanonicalChannelsQuery;
    readonly result: CanonicalChannelsResult;
  };
  readonly "filter-values": {
    readonly query: FilterValuesQuery;
    readonly result: FilterValuesResult;
  };
  readonly realtime: {
    readonly query: RealtimeQuery;
    readonly result: RealtimeQueryResult;
  };
  readonly "event-summary": {
    readonly query: LegacyEventQuery;
    readonly result: CanonicalEventSummaryResult;
  };
  readonly "event-trend": {
    readonly query: LegacyEventQuery;
    readonly result: CanonicalEventTrendResult;
  };
  readonly "event-types": {
    readonly query: LegacyEventQuery;
    readonly result: CanonicalEventTypeResult;
  };
  readonly "event-type-detail": {
    readonly query: LegacyEventQuery;
    readonly result: CanonicalEventTypeDetailResult;
  };
  readonly "event-records": {
    readonly query: LegacyEventQuery;
    readonly result: CanonicalEventRecordPageResult;
  };
  readonly "funnel-analysis": {
    readonly query: LegacyAnalysisQuery;
    readonly result: CanonicalFunnelAnalysisResult;
  };
  readonly "goal-conversions": {
    readonly query: BaseQuery;
    readonly result: CanonicalGoalConversionsResult;
  };
  readonly "goal-summary": {
    readonly query: LegacyAnalysisQuery;
    readonly result: CanonicalGoalSummaryResult | null;
  };
  readonly "goal-timeseries": {
    readonly query: LegacyAnalysisQuery;
    readonly result: CanonicalGoalTimeseriesResult | null;
  };
  readonly "property-keys": {
    readonly query: PropertyKeysQuery;
    readonly result: PropertyKeysResult;
  };
  readonly "property-values": {
    readonly query: PropertyValuesQuery;
    readonly result: PropertyValuesResult;
  };
  readonly "team-dashboard": {
    readonly query: LegacyTeamDashboardQuery;
    readonly result: TeamDashboardData;
  };
}

type MissingCanonicalOperations = Exclude<
  QueryOperation,
  keyof CanonicalOperationMap
>;
type ExtraCanonicalOperations = Exclude<
  keyof CanonicalOperationMap,
  QueryOperation
>;
type AssertNever<Value extends never> = Value;
type _AllQueryOperationsAreMapped = AssertNever<MissingCanonicalOperations>;
type _NoUnknownCanonicalOperationKeys = AssertNever<ExtraCanonicalOperations>;

export type CanonicalQuery<Operation extends QueryOperation> =
  CanonicalOperationMap[Operation]["query"];
export type CanonicalResult<Operation extends QueryOperation> =
  CanonicalOperationMap[Operation]["result"];
