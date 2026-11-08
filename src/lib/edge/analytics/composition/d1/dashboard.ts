import { typedQueryProviderFor } from "@/lib/edge/analytics/application/provider-registry";
import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import { queryDashboardFromD1 } from "@/lib/edge/analytics/providers/d1/internal/dashboard";
import type { D1ReadDiagnostics } from "@/lib/edge/analytics/providers/d1/internal/diagnostics";
import {
  overviewMetricsOf,
  trendPointOf,
} from "@/lib/edge/analytics/providers/d1/operations/overview-reader";

import { type D1SiteRuntimeBindings, timeWindow } from "./shared";

export function dashboardProvider(
  options: D1SiteRuntimeBindings,
  diagnostics: D1ReadDiagnostics,
) {
  return typedQueryProviderFor("dashboard", async (query) => {
    const read = await queryDashboardFromD1(
      options.env,
      options.siteId,
      timeWindow(query.time),
      query.interval,
      query.filters ?? EMPTY_FILTER_DOCUMENT,
      query.cards,
      diagnostics,
    );
    return {
      value: {
        overview: overviewMetricsOf(read.overview),
        trend: {
          interval: query.interval,
          points: read.trend.map(trendPointOf),
        },
        ...(read.cards ? { cards: read.cards } : {}),
      },
      source: read.source,
      approximateVisitors: false,
    };
  });
}
