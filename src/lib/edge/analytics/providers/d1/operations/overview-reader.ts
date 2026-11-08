import "@tanstack/react-start/server-only";

import type {
  FilterDocument,
  OverviewMetrics,
  OverviewReader,
  OverviewReaderInput,
  TrendPoint,
  TrendReaderInput,
  TrendReaderResult,
} from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/contract";
import { queryWindowToTime } from "@/lib/edge/analytics/contract";
import type {
  OverviewAggregateRow,
  TrendAggregateRow,
} from "@/lib/edge/analytics/providers/d1/internal/core";
import {
  createD1ReadDiagnostics,
  type D1ReadDiagnostics,
} from "@/lib/edge/analytics/providers/d1/internal/diagnostics";
import {
  queryLatestSiteActivity,
  queryOverviewAggregate,
  queryTrendAggregate,
} from "@/lib/edge/analytics/providers/d1/internal/overview";
import type { Env } from "@/lib/edge/types";
export const toQueryTime = queryWindowToTime;
function sourceFromDiagnostic(
  result: { diagnosticSource?: "raw" | "rollup" } | undefined,
): "raw" | "rollup" {
  return result?.diagnosticSource ?? "raw";
}
/** The overview totals as the contract names them. */
export function overviewMetricsOf(row: OverviewAggregateRow): OverviewMetrics {
  return {
    views: row.views,
    sessions: row.sessions,
    visitors: row.visitors,
    bounces: row.bounces,
    totalDurationMs: row.totalDuration,
    durationViews: row.durationViews,
    scrollDepth: row.scrollDepth,
  };
}
/** A trend row as the contract names it. */
export function trendPointOf(row: TrendAggregateRow): TrendPoint {
  return {
    ...overviewMetricsOf(row),
    bucket: row.bucket,
    timestampMs: row.timestampMs as TrendPoint["timestampMs"],
  };
}
export function createOverviewReader(
  env: Env,
  siteId: string,
  diagnostics: D1ReadDiagnostics = createD1ReadDiagnostics(),
): OverviewReader {
  return {
    async readOverview(input: OverviewReaderInput) {
      const result = await queryOverviewAggregate(
        env,
        siteId,
        {
          startMs: input.time.range.startMs,
          endExclusiveMs: input.time.range.endExclusiveMs,
          nowMs: input.time.capturedAtMs,
          timeZone: input.time.reportingTimeZone,
        },
        input.filters,
        diagnostics,
      );
      return {
        value: overviewMetricsOf(result.value),
        source: sourceFromDiagnostic(result),
        approximateVisitors: Boolean(result.approximateVisitors),
      };
    },
    async readTrend(input: TrendReaderInput): Promise<TrendReaderResult> {
      const result = await queryTrendAggregate(
        env,
        siteId,
        {
          startMs: input.time.range.startMs,
          endExclusiveMs: input.time.range.endExclusiveMs,
          nowMs: input.time.capturedAtMs,
          timeZone: input.time.reportingTimeZone,
        },
        input.interval,
        input.filters,
        diagnostics,
      );
      return {
        value: result.value.map(trendPointOf),
        source: sourceFromDiagnostic(result),
        approximateVisitors: Boolean(result.approximateVisitors),
      };
    },
  };
}
export async function readLatestSiteActivity(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics: D1ReadDiagnostics = createD1ReadDiagnostics(),
): Promise<number | null> {
  return queryLatestSiteActivity(env, siteId, window, filters, diagnostics);
}
export type { OverviewMetrics };
