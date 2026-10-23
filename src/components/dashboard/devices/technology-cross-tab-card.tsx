import { useMemo, useState } from "react";
import {
  StackedBreakdownBarChart,
  type StackedBreakdownBarRow,
  type StackedBreakdownBarSeries,
} from "@insightflare/product-ui/charts";
import { AsyncContent as ContentSwitch } from "@insightflare/ui/async-content";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { Label } from "@insightflare/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { useQuery } from "@tanstack/react-query";
import { ChartColumnIcon } from "lucide-react";

import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import { useDashboardComparisonQuery } from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { fetchClientCrossBreakdown } from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  BrowserCrossBreakdownDimensionData,
  BrowserCrossBreakdownItem,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import {
  isTechnologyDimension,
  TECHNOLOGY_CROSS_DIMENSIONS,
  TECHNOLOGY_DIMENSIONS,
  TechnologyDimension,
  technologyDimensionLabel,
  technologyValueLabel,
} from "./technology-dimensions";

const STACK_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--muted-foreground)",
] as const;

interface CrossChart {
  rows: StackedBreakdownBarRow[];
  series: StackedBreakdownBarSeries[];
}

function crossItemLabel(
  item: BrowserCrossBreakdownItem,
  dimension: TechnologyDimension,
  messages: AppMessages,
): string {
  if (item.isOther) return messages.devices.otherLabel;
  if (item.isUnknown) return messages.common.unknown;
  return technologyValueLabel(dimension, item.label, messages);
}

function buildCrossChart(
  data: BrowserCrossBreakdownDimensionData,
  rowDimension: TechnologyDimension,
  columnDimension: TechnologyDimension,
  messages: AppMessages,
): CrossChart {
  return {
    series: data.columns.map((column, index) => ({
      key: column.key,
      label: crossItemLabel(column, columnDimension, messages),
      color: column.isOther
        ? "var(--muted-foreground)"
        : STACK_COLORS[index % STACK_COLORS.length],
    })),
    rows: data.rows.map((row) => ({
      key: row.key,
      label: crossItemLabel(row, rowDimension, messages),
      values: Object.fromEntries(
        row.cells.map((cell) => [cell.key, cell.visitors]),
      ),
    })),
  };
}

function hasCrossContent(chart: CrossChart | undefined): boolean {
  return Boolean(chart && chart.rows.length > 0 && chart.series.length > 0);
}

function AxisSelect({
  id,
  label,
  value,
  exclude,
  messages,
  onChange,
}: {
  id: string;
  label: string;
  value: TechnologyDimension;
  exclude: TechnologyDimension;
  messages: AppMessages;
  onChange: (value: TechnologyDimension) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (isTechnologyDimension(next)) onChange(next);
        }}
      >
        <SelectTrigger id={id} size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TECHNOLOGY_DIMENSIONS.filter((item) => item !== exclude).map(
            (item) => (
              <SelectItem key={item} value={item}>
                {technologyDimensionLabel(item, messages)}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Visitors split two ways, by any pair of device, OS, browser, engine and screen size. */
export function TechnologyCrossTabCard({
  locale,
  messages,
  siteId,
  window,
  filters,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
}) {
  const [rowDimension, setRowDimension] = useState(TechnologyDimension.Device);
  const [columnDimension, setColumnDimension] = useState(
    TechnologyDimension.Browser,
  );
  const comparisonQuery = useDashboardComparisonQuery(window, filters);
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonFiltersKey = useMemo(
    () => (comparisonQuery ? filterQueryKey(comparisonQuery.filters) : "none"),
    [comparisonQuery],
  );
  const query = useQuery({
    queryKey: [
      "dashboard",
      "technology-cross-tab",
      siteId,
      rowDimension,
      columnDimension,
      window.from,
      window.to,
      window.timeZone,
      filtersKey,
      comparisonQuery?.mode ?? "none",
      comparisonQuery?.window.from ?? "none",
      comparisonQuery?.window.to ?? "none",
      comparisonQuery?.window.timeZone ?? "none",
      comparisonFiltersKey,
    ],
    queryFn: async ({ signal }) => {
      const fetchCrossTab = (
        requestedWindow: TimeWindow,
        requestedFilters: FilterDocument,
      ) =>
        fetchClientCrossBreakdown(
          siteId,
          requestedWindow,
          TECHNOLOGY_CROSS_DIMENSIONS[rowDimension],
          TECHNOLOGY_CROSS_DIMENSIONS[columnDimension],
          requestedFilters,
          { primaryLimit: 6, secondaryLimit: 6, signal },
        );
      const [current, comparison] = await Promise.all([
        fetchCrossTab(window, filters),
        comparisonQuery
          ? fetchCrossTab(comparisonQuery.window, comparisonQuery.filters)
          : Promise.resolve(null),
      ]);
      return { current, comparison };
    },
    enabled: !import.meta.env.SSR,
  });
  const chart = useMemo(
    () =>
      query.data
        ? buildCrossChart(
            query.data.current,
            rowDimension,
            columnDimension,
            messages,
          )
        : undefined,
    [columnDimension, messages, query.data, rowDimension],
  );
  const comparisonChart = useMemo(
    () =>
      query.data?.comparison
        ? buildCrossChart(
            query.data.comparison,
            rowDimension,
            columnDimension,
            messages,
          )
        : undefined,
    [columnDimension, messages, query.data, rowDimension],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="inline-flex items-center gap-2">
          <ChartColumnIcon className="size-4" />
          {messages.devices.crossTabTitle}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <AxisSelect
            id="technology-cross-tab-rows"
            label={messages.devices.crossTabRows}
            value={rowDimension}
            exclude={columnDimension}
            messages={messages}
            onChange={setRowDimension}
          />
          <AxisSelect
            id="technology-cross-tab-columns"
            label={messages.devices.crossTabColumns}
            value={columnDimension}
            exclude={rowDimension}
            messages={messages}
            onChange={setColumnDimension}
          />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <ContentSwitch
          loading={query.isPending}
          hasContent={
            hasCrossContent(chart) || hasCrossContent(comparisonChart)
          }
          loadingLabel={messages.common.loading}
          emptyContent={
            query.isError ? (
              <LoadFailedContent
                messages={messages}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <p>{messages.common.noData}</p>
            )
          }
          minHeightClassName="min-h-[320px]"
        >
          <StackedBreakdownBarChart
            rows={chart?.rows ?? []}
            series={chart?.series ?? []}
            comparisonRows={comparisonChart?.rows}
            comparisonSeries={comparisonChart?.series}
            locale={locale}
            stackId={`${rowDimension}:${columnDimension}`}
            className="w-full aspect-auto"
          />
        </ContentSwitch>
      </CardContent>
    </Card>
  );
}
