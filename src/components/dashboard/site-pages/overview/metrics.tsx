import { useCallback, useMemo } from "react";
import { MetricAreaChart } from "@insightflare/product-ui/charts";
import { Card, CardContent } from "@insightflare/ui/card";
import { Spinner } from "@insightflare/ui/spinner";

import { MetricTrendChart } from "@/components/dashboard/charts/metric-trend-chart";
import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import {
  dashboardComparisonLabel,
  useDashboardComparisonQuery,
} from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import {
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import { serializeDashboardSearchParams } from "@/lib/dashboard/filter-state";
import {
  durationFormat,
  intlLocale,
  numberFormat,
  percentFormat,
} from "@/lib/dashboard/format";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";

import type { DashboardLoad } from "./dashboard-load";
import { useOverviewSummaryQuery } from "./metrics-data";
import {
  ChangeRateInline,
  COMPARISON_AREA_COLOR,
  METRIC_AREA_COLOR,
} from "./overview-model";
import {
  alignComparisonPoints,
  graphMetricFromSearchParams,
  graphPoints,
  LOWER_IS_BETTER,
  TopStat,
  topStatChange,
  topStats,
  topStatValue,
  withGraphMetric,
} from "./top-stats";

interface OverviewMetricsSectionProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  load: DashboardLoad;
}

function statFormatter(
  stat: TopStat,
  locale: Locale,
): (value: number) => string {
  if (stat === TopStat.ViewsPerVisit) {
    const formatter = new Intl.NumberFormat(intlLocale(locale), {
      maximumFractionDigits: 2,
    });
    return (value) => formatter.format(value);
  }
  if (stat === TopStat.BounceRate) {
    return (value) => percentFormat(locale, value);
  }
  if (stat === TopStat.ScrollDepth) {
    return (value) => percentFormat(locale, value / 100);
  }
  if (stat === TopStat.VisitDuration) {
    return (value) => durationFormat(locale, value);
  }
  return (value) => numberFormat(locale, Math.round(value));
}

const COUNT_STATS: ReadonlySet<TopStat> = new Set([
  TopStat.Visitors,
  TopStat.Visits,
  TopStat.Pageviews,
]);

/** Two columns on phones, three from large screens, with inner borders. */
function statCellBorderClasses(index: number): string {
  return cn(
    index % 2 !== 0 && "border-l",
    index >= 2 && "border-t",
    index % 3 !== 0 ? "lg:border-l" : "lg:border-l-0",
    index >= 3 ? "lg:border-t" : "lg:border-t-0",
  );
}

/**
 * The top stats, and under them the main graph of the one that is picked.
 * Picking a stat redraws the graph with it and keeps it in the address. A
 * page path filter adds the scroll depth.
 */
export function OverviewMetricsSection({
  locale,
  messages,
  siteId,
  window,
  filters,
  load,
}: OverviewMetricsSectionProps) {
  const searchParams = useLiveSearchParams();
  const pathname = usePathname() || "/";
  const stats = useMemo(() => topStats(filters), [filters]);
  const selected = graphMetricFromSearchParams(searchParams, stats);
  const comparisonQuery = useDashboardComparisonQuery(window, filters);
  const summary = useOverviewSummaryQuery({
    siteId,
    window,
    filters,
    comparisonQuery,
    load,
  });
  const data = summary.data;
  const comparisonLabel = dashboardComparisonLabel(messages, comparisonQuery);
  const labels: Record<TopStat, string> = messages.dashboard.stats;

  const selectStat = useCallback(
    (stat: TopStat) => {
      const query = serializeDashboardSearchParams(
        withGraphMetric(searchParams, stat),
      );
      replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  const tiles = useMemo(
    () =>
      stats.map((stat) => {
        const current = data ? topStatValue(stat, data.current) : null;
        const reference = data ? topStatValue(stat, data.reference) : null;
        return {
          stat,
          current,
          change: topStatChange(current, reference),
          format: statFormatter(stat, locale),
          trend: data
            ? graphPoints(window, data.currentPoints, stat).flatMap((point) =>
                point.value === null
                  ? []
                  : [{ timestampMs: point.timestampMs, value: point.value }],
              )
            : [],
          comparisonTrend:
            data?.comparisonPoints && comparisonQuery
              ? graphPoints(
                  comparisonQuery.window,
                  data.comparisonPoints,
                  stat,
                ).map((point) => ({
                  timestampMs: point.timestampMs,
                  value: point.value ?? 0,
                }))
              : undefined,
        };
      }),
    [comparisonQuery, data, locale, stats, window],
  );
  const selectedFormat = useMemo(
    () => statFormatter(selected, locale),
    [locale, selected],
  );
  const graph = useMemo(() => {
    if (!data) return null;
    const points = graphPoints(window, data.currentPoints, selected);
    return {
      points,
      comparison:
        data.comparisonPoints && comparisonQuery
          ? {
              label: comparisonLabel,
              points: alignComparisonPoints(
                window,
                comparisonQuery.mode,
                points,
                graphPoints(
                  comparisonQuery.window,
                  data.comparisonPoints,
                  selected,
                ),
              ),
            }
          : undefined,
    };
  }, [comparisonLabel, comparisonQuery, data, selected, window]);
  const refreshing = summary.isPlaceholderData || summary.isFetching;
  const failed = summary.isError && !summary.isFetching;
  const retry = () => void summary.refetch();

  return (
    <div className="space-y-6">
      <Card className="gap-0 py-0">
        <CardContent className="px-0">
          {failed ? (
            <div className="flex min-h-[172px] items-center justify-center text-sm text-destructive">
              <LoadFailedContent messages={messages} onRetry={retry} />
            </div>
          ) : (
            <section
              className="grid grid-cols-2 lg:grid-cols-3"
              aria-label={messages.dashboard.statsLabel}
            >
              {tiles.map((tile, index) => {
                const active = tile.stat === selected;
                return (
                  <button
                    type="button"
                    key={tile.stat}
                    aria-pressed={active}
                    onClick={() => selectStat(tile.stat)}
                    className={cn(
                      "group @container relative min-h-[86px] cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:z-20 after:h-0.5 after:transition-colors",
                      active
                        ? "after:bg-primary"
                        : "after:bg-transparent hover:after:bg-border",
                      statCellBorderClasses(index),
                    )}
                  >
                    {/* A narrow tile starts the sparkline under the label,
                        so no text sits on the line. */}
                    <div className="absolute inset-y-0 right-0 w-1/2 min-w-0 @max-sm:top-7">
                      <MetricAreaChart
                        points={tile.trend}
                        color={METRIC_AREA_COLOR}
                        animationKey={`${window.from}:${window.to}:${comparisonQuery?.mode ?? "none"}`}
                        comparisonPoints={tile.comparisonTrend}
                        comparisonColor={COMPARISON_AREA_COLOR}
                      />
                    </div>
                    <div className="pointer-events-none relative z-10 flex min-h-[86px] min-w-0 flex-col justify-between px-3 py-2.5">
                      <p
                        className={cn(
                          "mb-2 truncate text-xs",
                          active
                            ? "font-medium text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {labels[tile.stat]}
                      </p>
                      {data ? (
                        <p
                          className={cn(
                            "flex flex-col items-start gap-1 text-2xl font-semibold leading-none tracking-tight tabular-nums transition-opacity",
                            refreshing && "opacity-60",
                          )}
                        >
                          <span>
                            {tile.current === null
                              ? "—"
                              : tile.format(tile.current)}
                          </span>
                          <ChangeRateInline
                            value={tile.change}
                            lowerIsBetter={LOWER_IS_BETTER.has(tile.stat)}
                          />
                        </p>
                      ) : (
                        <div className="inline-flex h-6 items-center">
                          <Spinner className="size-5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </CardContent>
      </Card>
      <Card className="overflow-visible">
        <CardContent>
          {failed ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-destructive">
              <LoadFailedContent messages={messages} onRetry={retry} />
            </div>
          ) : (
            <MetricTrendChart
              locale={locale}
              timeZone={window.timeZone}
              interval={window.interval}
              label={labels[selected]}
              points={graph?.points ?? []}
              formatValue={selectedFormat}
              wholeNumbers={COUNT_STATS.has(selected)}
              comparison={graph?.comparison}
              loading={!data || refreshing}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
