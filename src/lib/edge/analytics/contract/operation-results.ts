import type { PageResult, PaginationMeta } from "@/lib/pagination";

import type { GoalDefinition } from "./goal";
import type { CalendarGranularity, Interval } from "./types";

export interface CanonicalAnalyticsTab {
  readonly label: string;
  readonly views: number;
  readonly sessions: number;
  readonly visitors: number;
}

export interface CanonicalGeoAnalyticsTab extends CanonicalAnalyticsTab {
  readonly value: string;
}

export interface CanonicalEventContextCards {
  readonly page: {
    readonly path: readonly CanonicalAnalyticsTab[];
    readonly query: readonly CanonicalAnalyticsTab[];
    readonly title: readonly CanonicalAnalyticsTab[];
    readonly hostname: readonly CanonicalAnalyticsTab[];
    readonly entry: readonly CanonicalAnalyticsTab[];
    readonly exit: readonly CanonicalAnalyticsTab[];
  };
  readonly source: {
    readonly domain: readonly CanonicalAnalyticsTab[];
    readonly link: readonly CanonicalAnalyticsTab[];
  };
  readonly client: {
    readonly browser: readonly CanonicalAnalyticsTab[];
    readonly osVersion: readonly CanonicalAnalyticsTab[];
    readonly deviceType: readonly CanonicalAnalyticsTab[];
    readonly language: readonly CanonicalAnalyticsTab[];
    readonly screenSize: readonly CanonicalAnalyticsTab[];
  };
  readonly geo: {
    readonly country: readonly CanonicalGeoAnalyticsTab[];
    readonly region: readonly CanonicalGeoAnalyticsTab[];
    readonly city: readonly CanonicalGeoAnalyticsTab[];
    readonly continent: readonly CanonicalGeoAnalyticsTab[];
    readonly timezone: readonly CanonicalGeoAnalyticsTab[];
    readonly organization: readonly CanonicalGeoAnalyticsTab[];
  };
}

export interface CanonicalEventRecord {
  readonly eventId: string;
  readonly eventName: string;
  readonly occurredAt: number;
  readonly receivedAt: number;
  readonly sequence: number;
  readonly visitId: string;
  readonly sessionId: string;
  readonly visitorId: string;
  readonly pathname: string;
  readonly title: string;
  readonly hostname: string;
  readonly referrerHost: string;
  readonly country: string;
  readonly region: string;
  readonly city: string;
  readonly browser: string;
  readonly browserVersion: string;
  readonly os: string;
  readonly osVersion: string;
  readonly deviceType: string;
  readonly nodeCount: number;
  readonly valueCount: number;
}

export interface CanonicalEventSummaryResult {
  readonly summary: {
    readonly events: number;
    readonly eventTypes: number;
    readonly sessions: number;
    readonly visitors: number;
    readonly avgEventsPerSession: number;
  };
  readonly cards: {
    readonly event: { readonly name: readonly CanonicalAnalyticsTab[] };
    readonly page: {
      readonly path: readonly CanonicalAnalyticsTab[];
      readonly title: readonly CanonicalAnalyticsTab[];
      readonly hostname: readonly CanonicalAnalyticsTab[];
    };
  };
}

export interface CanonicalEventTrendResult {
  readonly interval: CalendarGranularity;
  readonly series: readonly {
    readonly key: string;
    readonly eventName: string;
    readonly label: string;
    readonly events: number;
    readonly sessions: number;
    readonly visitors: number;
    readonly isOther?: boolean;
  }[];
  readonly data: readonly {
    readonly bucket: number;
    readonly timestampMs: number;
    readonly totalEvents: number;
    readonly eventsBySeries: Readonly<Record<string, number>>;
  }[];
}

export interface CanonicalEventTypeResult {
  readonly items: readonly CanonicalAnalyticsTab[];
  readonly pagination: PaginationMeta;
}

export interface CanonicalEventTypeDetailResult {
  readonly eventName: string;
  readonly summary: {
    readonly events: number;
    readonly eventTypes: number;
    readonly sessions: number;
    readonly visitors: number;
    readonly avgEventsPerSession: number;
    readonly shareOfAllEvents: number;
  };
  readonly trend: {
    readonly data: readonly {
      readonly bucket: number;
      readonly timestampMs: number;
      readonly events: number;
      readonly visitors: number;
    }[];
  };
  readonly breakdowns: {
    readonly pages: readonly CanonicalAnalyticsTab[];
    readonly countries: readonly CanonicalAnalyticsTab[];
    readonly devices: readonly CanonicalAnalyticsTab[];
    readonly browsers: readonly CanonicalAnalyticsTab[];
  };
  readonly cards: CanonicalEventContextCards;
}

export interface CanonicalEventField {
  readonly path: string;
  readonly valueType: string;
  readonly events: number;
  readonly occurrences: number;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly exampleValue: string | number | boolean | null;
}

export interface CanonicalEventFieldValue {
  readonly value: string | number | boolean | null;
  readonly events: number;
  readonly occurrences: number;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
}

export interface CanonicalGoalMetricSummary {
  readonly total: number;
  readonly converted: number;
  readonly conversionRate: number;
}
export interface CanonicalGoalRevenueSummary {
  readonly currency: string;
  readonly total: number;
  readonly average: number;
}
export interface CanonicalGoalSummaryResult {
  readonly goal: GoalDefinition;
  readonly summary: {
    readonly sessions: CanonicalGoalMetricSummary;
    readonly visitors: CanonicalGoalMetricSummary;
    readonly revenue: CanonicalGoalRevenueSummary | null;
  };
}
export interface CanonicalGoalTimeseriesResult {
  readonly goal: GoalDefinition;
  readonly interval: Interval;
  readonly timeseries: readonly {
    readonly timestampMs: number;
    readonly sessions: CanonicalGoalMetricSummary;
    readonly visitors: CanonicalGoalMetricSummary;
  }[];
}

export type CanonicalEventRecordPage = PageResult<CanonicalEventRecord>;
export type CanonicalEventFieldPage = PageResult<CanonicalEventField>;
export type CanonicalEventFieldValuePage = PageResult<CanonicalEventFieldValue>;
export type CanonicalEventTypesPage = CanonicalEventTypeResult;
export type CanonicalEventRecordPageResult = CanonicalEventRecordPage;
export type CanonicalEventFieldValuesResult = {
  readonly eventName: string | undefined;
  readonly fieldPath: string;
  readonly fieldValueType: string;
  readonly data: CanonicalEventFieldValuePage;
};
export type CanonicalEventFieldsResult = {
  readonly eventName: string | undefined;
  readonly data: CanonicalEventFieldPage;
};
