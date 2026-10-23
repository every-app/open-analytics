import { memo, useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  dashboardComparisonLabel,
  useDashboardComparisonQuery,
} from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { DIRECT_REFERRER_FILTER_VALUE } from "@/components/dashboard/referrers/referrer-utils";
import { ShareTrendChartCard } from "@/components/dashboard/sharing/share-trend-card";
import type { TrafficChannelId } from "@/lib/analytics/traffic-channel-rules";
import { fetchReferrerAndChannelTrend } from "@/lib/dashboard/client/data/referrers";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  BrowserTrendData,
  BrowserTrendSeries,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
interface ReferrerShareTrendCardProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
}
function emptyTrendData(interval: TimeWindow["interval"]): BrowserTrendData {
  return {
    ok: true,
    interval,
    series: [],
    data: [],
  };
}
function emptyReferrerTrendData(interval: TimeWindow["interval"]) {
  return {
    ok: true as const,
    interval,
    source: emptyTrendData(interval),
    channel: emptyTrendData(interval),
  };
}
function fallbackUnlessAborted<T>(error: unknown, fallback: () => T): T {
  if (error instanceof Error && error.name === "AbortError") throw error;
  return fallback();
}
function asBrowserTrendData(
  interval: BrowserTrendData["interval"],
  dimension: Pick<BrowserTrendData, "series" | "data">,
): BrowserTrendData {
  return {
    ok: true,
    interval,
    ...dimension,
  };
}
/** The two share trends, side by side: referring sites and traffic channels. */
enum ReferrerTrendDimension {
  Source = "source",
  Channel = "channel",
}
const TREND_DIMENSIONS = Object.values(ReferrerTrendDimension);
function ReferrerTrendPanel({
  locale,
  messages,
  siteId,
  window,
  filters,
}: ReferrerShareTrendCardProps) {
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonQuery = useDashboardComparisonQuery(window, filters);
  const comparisonFiltersKey = useMemo(
    () => (comparisonQuery ? filterQueryKey(comparisonQuery.filters) : "none"),
    [comparisonQuery],
  );
  const currentDataWindow = useMemo(
    () => ({
      from: window.from,
      to: window.to,
      interval: window.interval,
      timeZone: window.timeZone,
    }),
    [window.from, window.interval, window.timeZone, window.to],
  );
  const fallbackTrendData = useMemo(
    () => emptyReferrerTrendData(window.interval),
    [window.interval],
  );
  const comparisonDataWindow = useMemo(
    () =>
      comparisonQuery
        ? {
            from: comparisonQuery.window.from,
            to: comparisonQuery.window.to,
            interval: comparisonQuery.window.interval,
            timeZone: comparisonQuery.window.timeZone,
          }
        : null,
    [comparisonQuery],
  );
  const {
    data: trendQueryData,
    isPlaceholderData,
    isPending,
  } = useQuery({
    queryKey: [
      "dashboard",
      "referrer-channel-trend",
      siteId,
      window.from,
      window.to,
      window.interval,
      window.timeZone,
      filtersKey,
      comparisonQuery?.mode ?? "none",
      comparisonQuery?.window.from ?? "none",
      comparisonQuery?.window.to ?? "none",
      comparisonQuery?.window.interval ?? "none",
      comparisonQuery?.window.timeZone ?? "none",
      comparisonFiltersKey,
      5,
    ],
    queryFn: async ({ signal }) => {
      const fetchTrendData = (
        requestedWindow: TimeWindow,
        requestedFilters: FilterDocument,
      ) =>
        fetchReferrerAndChannelTrend(
          siteId,
          requestedWindow,
          requestedFilters,
          { limit: 5, signal },
        ).catch((error) =>
          fallbackUnlessAborted(error, () =>
            emptyReferrerTrendData(requestedWindow.interval),
          ),
        );
      const [trendData, comparisonTrendData] = await Promise.all([
        fetchTrendData(window, filters),
        comparisonQuery
          ? fetchTrendData(comparisonQuery.window, comparisonQuery.filters)
          : Promise.resolve(null),
      ]);
      return {
        trendData,
        comparisonTrendData,
        dataWindow: currentDataWindow,
        comparisonDataWindow,
      };
    },
    enabled: typeof window !== "undefined",
    placeholderData: keepPreviousData,
  });
  const loading = isPending || isPlaceholderData;
  const trendData = trendQueryData?.trendData ?? fallbackTrendData;
  const dataWindow = trendQueryData?.dataWindow ?? currentDataWindow;
  const comparisonTrendData = comparisonQuery
    ? trendQueryData?.comparisonTrendData
    : undefined;
  const resolvedComparisonDataWindow = comparisonQuery
    ? (trendQueryData?.comparisonDataWindow ?? comparisonDataWindow)
    : null;
  const hydrated = Boolean(trendQueryData);
  const formatSeriesLabel = useMemo(
    () => ({
      [ReferrerTrendDimension.Source]: (series: BrowserTrendSeries) =>
        series.label === DIRECT_REFERRER_FILTER_VALUE
          ? messages.overview.direct
          : series.label,
      [ReferrerTrendDimension.Channel]: (series: BrowserTrendSeries) =>
        messages.overview.channelLabels[series.label as TrafficChannelId] ??
        series.label,
    }),
    [messages.overview.channelLabels, messages.overview.direct],
  );
  const titles = {
    [ReferrerTrendDimension.Source]: messages.overview.sourceTab,
    [ReferrerTrendDimension.Channel]: messages.overview.channelTab,
  };
  const otherLabels = {
    [ReferrerTrendDimension.Source]: messages.referrers.longTail,
    [ReferrerTrendDimension.Channel]: messages.referrers.channelLongTail,
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {TREND_DIMENSIONS.map((dimension) => (
        <ShareTrendChartCard
          key={dimension}
          locale={locale}
          messages={messages}
          title={titles[dimension]}
          trendData={asBrowserTrendData(
            trendData.interval,
            trendData[dimension],
          )}
          dataWindow={dataWindow}
          comparisonTrendData={
            comparisonTrendData
              ? asBrowserTrendData(
                  comparisonTrendData.interval,
                  comparisonTrendData[dimension],
                )
              : null
          }
          comparisonDataWindow={resolvedComparisonDataWindow}
          comparisonLabel={dashboardComparisonLabel(messages, comparisonQuery)}
          syncId={`share-trend:${siteId}:referrer-${dimension}`}
          loading={loading}
          hydrated={hydrated}
          otherLabel={otherLabels[dimension]}
          formatSeriesLabel={formatSeriesLabel[dimension]}
        />
      ))}
    </div>
  );
}
export const ReferrerShareTrendCard = memo(function ReferrerShareTrendCard(
  props: ReferrerShareTrendCardProps,
) {
  return <ReferrerTrendPanel {...props} />;
});
