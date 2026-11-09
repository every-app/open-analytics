import { memo, useId, useMemo } from "react";
import { ChartContainer } from "@insightflare/ui/chart";
import { Area, AreaChart } from "recharts";

import {
  useAnimationOnChartSwitch,
  useChartVisibility,
} from "./use-chart-animation";

export interface MetricAreaPoint {
  timestampMs: number;
  value: number;
}

export interface MetricAreaChartProps {
  points: ReadonlyArray<MetricAreaPoint>;
  color: string;
  animationKey: string;
  comparisonPoints?: ReadonlyArray<MetricAreaPoint>;
  comparisonColor?: string;
}

/**
 * A stat's sparkline: only a picture of the trend, with nothing to hover or
 * click, so the pointer goes through to whatever holds it.
 */
export const MetricAreaChart = memo(function MetricAreaChart({
  points,
  color,
  animationKey,
  comparisonPoints,
  comparisonColor = color,
}: MetricAreaChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const { containerRef, isVisible, hasMeasuredVisibility } =
    useChartVisibility("80px 0px");
  const chartData = useMemo(() => {
    const normalized = points.map((point, index) => ({
      index,
      timestampMs: Number.isFinite(point.timestampMs) ? point.timestampMs : 0,
      value: Number.isFinite(point.value) ? Math.max(0, point.value) : 0,
    }));

    if (normalized.length >= 2) return normalized;
    if (normalized.length === 1) {
      const first = normalized[0] ?? { index: 0, value: 0, timestampMs: 0 };
      return [
        first,
        {
          index: 1,
          value: first.value,
          timestampMs: first.timestampMs + 1,
        },
      ];
    }
    return [
      { index: 0, value: 0, timestampMs: 0 },
      { index: 1, value: 0, timestampMs: 1 },
    ];
  }, [points]);
  const chartDataWithComparison = useMemo(() => {
    if (!comparisonPoints) return chartData;

    return chartData.map((point, index) => ({
      ...point,
      comparisonValue: Number.isFinite(comparisonPoints[index]?.value)
        ? Math.max(0, comparisonPoints[index]?.value ?? 0)
        : null,
    }));
  }, [chartData, comparisonPoints]);
  const areaChartSwitchKey = useMemo(() => {
    const firstTimestamp = chartData[0]?.timestampMs ?? 0;
    const lastTimestamp = chartData[chartData.length - 1]?.timestampMs ?? 0;
    const comparisonFirstValue = comparisonPoints?.[0]?.value ?? 0;
    const comparisonLastValue =
      comparisonPoints?.[comparisonPoints.length - 1]?.value ?? 0;
    return `${animationKey}:${chartData.length}:${firstTimestamp}:${lastTimestamp}:${comparisonPoints?.length ?? 0}:${comparisonFirstValue}:${comparisonLastValue}`;
  }, [animationKey, chartData, comparisonPoints]);
  const isAreaAnimationActive = useAnimationOnChartSwitch({
    switchKey: areaChartSwitchKey,
    hasData: chartData.length > 0,
    isVisible,
    hasMeasuredVisibility,
  });

  return (
    <div
      ref={containerRef}
      className="pointer-events-none h-full w-full"
      aria-hidden
    >
      <div className="relative h-full w-full">
        <ChartContainer className="h-full w-full aspect-auto">
          <AreaChart
            data={chartDataWithComparison}
            margin={{ top: 12, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.36} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <Area
              type="linear"
              dataKey="value"
              stroke={color}
              fill={`url(#${gradientId})`}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={isAreaAnimationActive}
              animationDuration={isAreaAnimationActive ? 280 : 0}
            />
            {comparisonPoints ? (
              <Area
                type="linear"
                dataKey="comparisonValue"
                stroke={comparisonColor}
                fill="none"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={false}
                isAnimationActive={isAreaAnimationActive}
                animationDuration={isAreaAnimationActive ? 280 : 0}
              />
            ) : null}
          </AreaChart>
        </ChartContainer>
        <div className="absolute inset-y-0 left-0 z-10 w-5 bg-gradient-to-r from-card via-card/80 to-transparent" />
      </div>
    </div>
  );
});
