import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import { withFilters } from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { ClientDimensionKey } from "@/lib/dashboard-api/client/edge";
import type {
  BrowserCrossBreakdownDimensionData,
  BrowserTrendData,
  ClientCrossBreakdownData,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract";
export async function fetchClientDimensionTrend(
  siteId: string,
  window: TimeWindow,
  dimension: ClientDimensionKey,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<BrowserTrendData> {
  return fetchPrivateJson<BrowserTrendData>(
    "/api/private/client-dimension-trend",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
        dimension,
        limit: options?.limit ?? 5,
      },
      filters,
    ),
    { signal: options?.signal },
  );
}
/** The dimensions a cross-tab of the visitors' technology can pair. */
export type CrossBreakdownDimension =
  ClientDimensionKey | "client.browserEngine";
export async function fetchClientCrossBreakdown(
  siteId: string,
  window: TimeWindow,
  primaryDimension: CrossBreakdownDimension,
  secondaryDimension: CrossBreakdownDimension,
  filters?: FilterDocument,
  options?: {
    primaryLimit?: number;
    secondaryLimit?: number;
    signal?: AbortSignal;
  },
): Promise<BrowserCrossBreakdownDimensionData> {
  const response = await fetchPrivateJson<ClientCrossBreakdownData>(
    "/api/private/client-cross-breakdown",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        primaryDimension,
        secondaryDimension,
        primaryLimit: options?.primaryLimit ?? 5,
        secondaryLimit: options?.secondaryLimit ?? 6,
      },
      filters,
    ),
    { signal: options?.signal },
  );
  return response.data;
}
export async function fetchBrowserTrend(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<BrowserTrendData> {
  return fetchPrivateJson<BrowserTrendData>(
    "/api/private/browser-trend",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
        limit: options?.limit ?? 5,
      },
      filters,
    ),
    { signal: options?.signal },
  );
}
export async function fetchBrowserEngineTrend(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    signal?: AbortSignal;
  },
): Promise<BrowserTrendData> {
  return fetchPrivateJson<BrowserTrendData>(
    "/api/private/browser-engine-trend",
    withFilters(
      {
        siteId,
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
        limit: options?.limit ?? 5,
      },
      filters,
    ),
    { signal: options?.signal },
  );
}
