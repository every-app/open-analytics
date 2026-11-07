import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  DashboardFilterOptionsData,
  DimensionData,
  EventField,
  EventFieldValuesData,
  OverviewClientDimensionTabsData as OverviewClientDimensionTabsResponse,
  OverviewData,
  OverviewGeoDimensionTabsData as OverviewGeoDimensionTabsResponse,
  OverviewGeoPointsData,
  OverviewGeoTabData,
  OverviewTabData,
  PagesData,
  ReferrersData,
  TrendData,
} from "@/lib/dashboard-api/client/edge";
function emptyPagination(limit = 1) {
  return {
    limit,
    returned: 0,
    hasMore: false,
    nextCursor: null,
  } as const;
}
type PageCardTabsData = NonNullable<PagesData["tabs"]>;
type OverviewClientDimensionTabsData =
  OverviewClientDimensionTabsResponse["tabs"];
type OverviewGeoDimensionTabsData = OverviewGeoDimensionTabsResponse["tabs"];
export function emptyOverview(): OverviewData {
  return {
    ok: true,
    data: {
      views: 0,
      sessions: 0,
      visitors: 0,
      bounces: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      bounceRate: 0,
      approximateVisitors: false,
    },
  };
}
export function emptyTrend(interval: TimeWindow["interval"]): TrendData {
  return {
    ok: true,
    interval,
    data: [],
  };
}
export function emptyPages(): PagesData {
  return { ok: true, data: { items: [], pagination: emptyPagination() } };
}
export function emptyPageCardTabs(): PageCardTabsData {
  return {
    path: [],
    title: [],
    hostname: [],
    entry: [],
    exit: [],
  };
}
export function emptyOverviewClientDimensionTabs(): OverviewClientDimensionTabsData {
  return {
    browser: [],
    osVersion: [],
    deviceType: [],
    language: [],
    screenSize: [],
  };
}
export function emptyOverviewGeoDimensionTabs(): OverviewGeoDimensionTabsData {
  return {
    country: [],
    region: [],
    city: [],
    continent: [],
    timezone: [],
    organization: [],
  };
}
export function emptyOverviewGeoPoints(): OverviewGeoPointsData {
  return {
    ok: true,
    data: [],
    countryCounts: [],
    regionCounts: [],
    cityCounts: [],
  };
}
export function emptyReferrers(): ReferrersData {
  return { ok: true, data: { items: [], pagination: emptyPagination() } };
}
export function emptyDimension(): DimensionData {
  return {
    ok: true,
    data: { items: [], pagination: emptyPagination() },
  };
}
export function emptyEventFieldValues(
  fieldPath = "",
  fieldValueType: EventField["valueType"] | "" = "",
): EventFieldValuesData {
  return {
    ok: true,
    fieldPath,
    fieldValueType,
    data: { items: [], pagination: emptyPagination() },
  };
}
export function emptyOverviewTab(): OverviewTabData {
  return { ok: true, data: { items: [], pagination: emptyPagination() } };
}
export function emptyOverviewGeoTab(): OverviewGeoTabData {
  return {
    ok: true,
    data: {
      items: [],
      pagination: emptyPagination(),
    },
  };
}
export function emptyDashboardFilterOptions(): DashboardFilterOptionsData {
  return {
    ok: true,
    data: { items: [], pagination: emptyPagination() },
  };
}
