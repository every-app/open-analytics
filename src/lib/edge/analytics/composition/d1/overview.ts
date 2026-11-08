import { typedQueryProviderFor } from "@/lib/edge/analytics/application/provider-registry";
import type { OverviewReader } from "@/lib/edge/analytics/contract";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";

export function overviewProvider(reader: OverviewReader) {
  return typedQueryProviderFor("overview", async (query) => {
    const filters = query.filters ?? EMPTY_FILTER_DOCUMENT;
    const current = await reader.readOverview({
      time: query.time,
      filters,
    });
    const detailInterval = query.detailInterval;
    const detail = detailInterval
      ? await reader.readTrend({
          time: query.time,
          filters,
          interval: detailInterval,
        })
      : undefined;
    const detailResult =
      detail && detailInterval
        ? { interval: detailInterval, points: detail.value }
        : undefined;

    return {
      value: {
        current: current.value,
        ...(detailResult ? { detail: detailResult } : {}),
      },
      source: current.source,
      approximateVisitors: current.approximateVisitors,
    };
  });
}

export function trendProvider(reader: OverviewReader) {
  return typedQueryProviderFor("trend", async (query) => {
    const result = await reader.readTrend({
      time: query.time,
      filters: query.filters ?? EMPTY_FILTER_DOCUMENT,
      interval: query.interval,
    });
    return {
      value: {
        interval: query.interval,
        points: result.value,
      },
      source: result.source,
      approximateVisitors: result.approximateVisitors,
    };
  });
}
