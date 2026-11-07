import { useId, useMemo } from "react";
import {
  calculateChartYAxisWidth,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipIndicator,
} from "@insightflare/ui/chart";
import { Spinner } from "@insightflare/ui/spinner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import {
  createChartAxisDateFormatter,
  createChartTooltipDateFormatter,
} from "@/lib/dashboard/chart-time";
import type { DashboardInterval } from "@/lib/dashboard/query-state";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export interface MetricTrendPoint {
  timestampMs: number;
  value: number | null;
}

interface ChartRow {
  timestampMs: number;
  value: number | null;
  comparisonTimestampMs?: number;
  comparisonValue?: number | null;
}

interface MetricTrendChartProps {
  locale: Locale;
  timeZone: string;
  interval: DashboardInterval;
  label: string;
  points: readonly MetricTrendPoint[];
  formatValue: (value: number) => string;
  /** Counts: the axis ticks whole numbers only. */
  wholeNumbers: boolean;
  /**
   * The same stat over the comparison window: the point paired with each of
   * `points`, at its index, or none where a bucket has no counterpart.
   */
  comparison?: {
    label: string;
    points: readonly (MetricTrendPoint | undefined)[];
  };
  loading: boolean;
  className?: string;
}

// Recharts hands its content its own `label` (the hovered x value), so the
// stat's name goes by another prop.
function MetricTrendTooltip({
  active,
  payload,
  metricLabel,
  comparisonLabel,
  formatValue,
  dateFormatter,
}: TooltipProps<number, string> & {
  metricLabel: string;
  comparisonLabel?: string;
  formatValue: (value: number) => string;
  dateFormatter: Intl.DateTimeFormat;
}) {
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !row) return null;
  const lines = [
    {
      key: "value",
      color: "var(--color-value)",
      date: row.timestampMs,
      name: metricLabel,
      value: row.value,
    },
    ...(comparisonLabel && row.comparisonTimestampMs !== undefined
      ? [
          {
            key: "comparisonValue",
            color: "var(--color-comparisonValue)",
            date: row.comparisonTimestampMs,
            name: comparisonLabel,
            value: row.comparisonValue ?? null,
          },
        ]
      : []),
  ];
  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-xl">
      {lines.map((line) => (
        <div key={line.key} className="grid gap-1">
          <span className="text-muted-foreground">
            {dateFormatter.format(new Date(line.date))}
          </span>
          <div className="flex items-center gap-2">
            <ChartTooltipIndicator color={line.color} />
            <span className="flex-1 text-muted-foreground">{line.name}</span>
            <span className="font-medium tabular-nums text-foreground">
              {line.value === null ? "—" : formatValue(line.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The dashboard's main graph: one stat per interval across the range, and
 * the comparison's line over it when Compare is on.
 */
export function MetricTrendChart({
  locale,
  timeZone,
  interval,
  label,
  points,
  formatValue,
  wholeNumbers,
  comparison,
  loading,
  className,
}: MetricTrendChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const rows = useMemo<ChartRow[]>(
    () =>
      points.map((point, index) => {
        const reference = comparison?.points[index];
        return {
          timestampMs: point.timestampMs,
          value: point.value,
          ...(comparison
            ? {
                comparisonTimestampMs: reference?.timestampMs,
                comparisonValue: reference?.value ?? null,
              }
            : {}),
        };
      }),
    [comparison, points],
  );
  const axisFormatter = useMemo(
    () => createChartAxisDateFormatter(locale, interval, timeZone, "regular"),
    [interval, locale, timeZone],
  );
  const tooltipFormatter = useMemo(
    () => createChartTooltipDateFormatter(locale, interval, timeZone),
    [interval, locale, timeZone],
  );
  const yAxisWidth = useMemo(() => {
    const values = rows.flatMap((row) => [
      row.value ?? 0,
      row.comparisonValue ?? 0,
    ]);
    return calculateChartYAxisWidth([formatValue(Math.max(0, ...values))], 4);
  }, [formatValue, rows]);

  return (
    <div className="relative">
      <ChartContainer
        className={cn(
          "h-[280px] w-full min-w-0 aspect-auto [&_.recharts-area-area]:transition-[filter] [&_.recharts-area-area]:duration-200",
          loading
            ? "[&_.recharts-area-area]:brightness-50"
            : "[&_.recharts-area-area]:brightness-100",
          className,
        )}
        config={{
          value: { label, color: "var(--color-chart-1)" },
          ...(comparison
            ? {
                comparisonValue: {
                  label: comparison.label,
                  color: "var(--color-chart-secondary-1)",
                },
              }
            : {}),
        }}
      >
        <AreaChart
          accessibilityLayer
          data={rows}
          margin={{ left: 0, right: 8, top: 12 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-value)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="var(--color-value)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="timestampMs"
            tickFormatter={(value) =>
              axisFormatter.format(new Date(Number(value ?? 0)))
            }
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={14}
          />
          <YAxis
            width={yAxisWidth}
            tickFormatter={(value) => formatValue(Number(value))}
            allowDecimals={!wholeNumbers}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={false}
            allowEscapeViewBox={{ x: false, y: true }}
            wrapperStyle={{ zIndex: 20 }}
            content={
              <MetricTrendTooltip
                metricLabel={label}
                comparisonLabel={comparison?.label}
                formatValue={formatValue}
                dateFormatter={tooltipFormatter}
              />
            }
          />
          {comparison ? (
            <Area
              dataKey="comparisonValue"
              type="linear"
              stroke="var(--color-comparisonValue)"
              strokeDasharray="4 3"
              fill="none"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Area
            dataKey="value"
            type="linear"
            stroke="var(--color-value)"
            fill={`url(#${gradientId})`}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 3,
              stroke: "var(--color-value)",
              fill: "var(--color-value)",
            }}
            isAnimationActive={false}
          />
          {comparison ? (
            <ChartLegend content={<ChartLegendContent className="pt-2" />} />
          ) : null}
        </AreaChart>
      </ChartContainer>
      <div
        aria-hidden={!loading}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-muted-foreground"
      >
        {loading ? <Spinner className="size-5" /> : null}
      </div>
    </div>
  );
}
