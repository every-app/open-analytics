import { memo, type ReactNode, useCallback, useMemo } from "react";

import {
  TabbedDataTableCard,
  type TabbedDataTableColumn,
  type TabbedDataTableLoader,
  type TabbedDataTableRowAdapter,
  type TabbedDataTableRowBase,
  type TabbedDataTableTab,
} from "@/components/dashboard/common/tabbed-data-table-card";
import { numberFormat } from "@/lib/dashboard/format";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";
type NonEmptyArray<T> = readonly [T, ...T[]];
type SortKey = "views" | "visitors" | "reference" | "current" | "change";
export interface AsyncDimensionBreakdownRow extends TabbedDataTableRowBase {
  label: string;
  views: number;
  visitors: number;
  reference?: {
    views: number;
    visitors: number;
  };
  change?: {
    views: { absolute: number; relative: number | null };
    visitors: { absolute: number; relative: number | null };
  };
  mono?: boolean;
}
export type AsyncDimensionBreakdownLoader<T extends string> =
  TabbedDataTableLoader<T, AsyncDimensionBreakdownRow, SortKey>;
export interface AsyncDimensionBreakdownTab<
  T extends string = string,
> extends TabbedDataTableTab<T> {
  primaryMetricLabel?: string;
}
interface AsyncDimensionBreakdownCardProps<T extends string> {
  locale: Locale;
  messages: AppMessages;
  tabs: NonEmptyArray<AsyncDimensionBreakdownTab<T>>;
  value?: T;
  onValueChange?: (value: T) => void;
  loader: TabbedDataTableLoader<T, AsyncDimensionBreakdownRow, SortKey>;
  requestKey: string;
  className?: string;
  showVisitors?: boolean;
  secondaryMetricLabel?: string;
  emptyLabel?: string;
  comparisonLabel?: string;
  comparisonCurrentLabel?: string;
  comparisonMetric?: "views" | "visitors";
}
function normalizeRows(
  rows: readonly AsyncDimensionBreakdownRow[],
): AsyncDimensionBreakdownRow[] {
  return rows.map((row, index) => ({
    ...row,
    key: row.key || `${row.label}-${index}`,
    label: String(row.label ?? "").trim(),
    views: Math.max(0, Number(row.views ?? 0)),
    visitors: Math.max(0, Number(row.visitors ?? 0)),
    reference: row.reference
      ? {
          views: Math.max(0, Number(row.reference.views ?? 0)),
          visitors: Math.max(0, Number(row.reference.visitors ?? 0)),
        }
      : undefined,
    change: row.change
      ? {
          views: {
            absolute: Number(row.change.views.absolute ?? 0),
            relative:
              row.change.views.relative === null
                ? null
                : Number(row.change.views.relative ?? 0),
          },
          visitors: {
            absolute: Number(row.change.visitors.absolute ?? 0),
            relative:
              row.change.visitors.relative === null
                ? null
                : Number(row.change.visitors.relative ?? 0),
          },
        }
      : undefined,
    mono: Boolean(row.mono),
  }));
}
export const AsyncDimensionBreakdownCard = memo(
  function AsyncDimensionBreakdownCard<T extends string>({
    locale,
    messages,
    tabs,
    value,
    onValueChange,
    loader,
    requestKey,
    className,
    showVisitors = true,
    secondaryMetricLabel,
    emptyLabel,
    comparisonLabel,
    comparisonCurrentLabel,
    comparisonMetric = "views",
  }: AsyncDimensionBreakdownCardProps<T>) {
    const resolvedEmptyLabel = emptyLabel ?? messages.common.noData;
    const resolvedSecondaryMetricLabel =
      secondaryMetricLabel ?? messages.common.visitors;
    const rowAdapter = useMemo<
      TabbedDataTableRowAdapter<AsyncDimensionBreakdownRow, T, SortKey>
    >(
      () => ({
        renderLabel: (row) => (
          <span className={cn("break-words", row.mono && "font-mono")}>
            {row.label}
          </span>
        ),
        getSearchText: (row) => row.label,
        getExportLabel: (row) => row.label,
        getClassName: () => "hover:brightness-95",
      }),
      [],
    );
    const labelColumnLabel = useCallback(
      (tab: TabbedDataTableTab<T>) => tab.columnLabel ?? tab.label,
      [],
    );
    const search = useMemo(
      () => ({
        actionLabel: messages.common.search,
        placeholder: (tab: TabbedDataTableTab<T>) =>
          formatI18nTemplate(messages.overview.searchInTab, {
            tab: tab.label,
          }),
      }),
      [messages.common.search, messages.overview.searchInTab],
    );
    const exportConfig = useMemo(
      () => ({
        labels: messages.common.tableExport,
      }),
      [messages.common.tableExport],
    );
    const columns = useMemo<
      (
        tab: T,
      ) => readonly TabbedDataTableColumn<
        AsyncDimensionBreakdownRow,
        SortKey,
        T
      >[]
    >(
      () => (tab) => {
        const primaryMetricLabel =
          tabs.find((item) => item.value === tab)?.primaryMetricLabel ??
          messages.common.views;

        if (comparisonLabel) {
          const comparisonMetricLabel =
            comparisonMetric === "views"
              ? primaryMetricLabel
              : resolvedSecondaryMetricLabel;

          return [
            {
              key: "reference" as const,
              label: comparisonLabel,
              getValue: (row: AsyncDimensionBreakdownRow) =>
                row.reference?.[comparisonMetric] ?? 0,
              sortValue: (row: AsyncDimensionBreakdownRow) =>
                row.reference?.[comparisonMetric] ?? 0,
              format: (value: number) => numberFormat(locale, value),
            },
            {
              key: "current" as const,
              label: comparisonCurrentLabel ?? comparisonMetricLabel,
              getValue: (row: AsyncDimensionBreakdownRow) =>
                row[comparisonMetric],
              sortValue: (row: AsyncDimensionBreakdownRow) =>
                row[comparisonMetric],
              format: (value: number) => numberFormat(locale, value),
            },
            {
              key: "change" as const,
              label: messages.common.change,
              getValue: (row: AsyncDimensionBreakdownRow) =>
                row.change?.[comparisonMetric]?.absolute ?? 0,
              sortValue: (row: AsyncDimensionBreakdownRow) =>
                row.change?.[comparisonMetric]?.relative ?? Infinity,
              format: (_value: number, row: AsyncDimensionBreakdownRow) => {
                const change = row.change?.[comparisonMetric];
                if (!change) {
                  return <span className="text-muted-foreground">—</span>;
                }
                if (change.relative === null) {
                  return (
                    <span
                      className={
                        row[comparisonMetric] > 0
                          ? "text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {row[comparisonMetric] > 0 ? messages.common.new : "—"}
                    </span>
                  );
                }
                const percentage = change.relative * 100;
                return (
                  <span
                    className={
                      percentage >= 0 ? "text-success" : "text-destructive"
                    }
                  >
                    {`${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`}
                  </span>
                );
              },
            },
            ...(showVisitors && comparisonMetric === "views"
              ? [
                  {
                    key: "visitors" as const,
                    label: resolvedSecondaryMetricLabel,
                    getValue: (row: AsyncDimensionBreakdownRow) => row.visitors,
                    sortValue: (row: AsyncDimensionBreakdownRow) =>
                      row.visitors,
                    format: (value: number) => numberFormat(locale, value),
                  },
                ]
              : []),
          ];
        }

        return [
          {
            key: "views" as const,
            label: primaryMetricLabel,
            getValue: (row: AsyncDimensionBreakdownRow) => row.views,
            format: (value: number) => numberFormat(locale, value),
          },
          ...(showVisitors
            ? [
                {
                  key: "visitors" as const,
                  label: resolvedSecondaryMetricLabel,
                  getValue: (row: AsyncDimensionBreakdownRow) => row.visitors,
                  format: (value: number) => numberFormat(locale, value),
                },
              ]
            : []),
        ];
      },
      [
        comparisonCurrentLabel,
        comparisonLabel,
        comparisonMetric,
        locale,
        messages.common.change,
        messages.common.new,
        messages.common.views,
        resolvedSecondaryMetricLabel,
        showVisitors,
        tabs,
      ],
    );

    return (
      <TabbedDataTableCard<T, AsyncDimensionBreakdownRow, SortKey>
        messages={messages}
        tabs={tabs}
        value={value}
        onValueChange={onValueChange}
        columns={columns}
        requestKey={requestKey}
        loader={loader}
        normalizeRows={normalizeRows}
        rowAdapter={rowAdapter}
        labelColumnLabel={labelColumnLabel}
        sortActionLabel={(label) =>
          formatI18nTemplate(messages.common.sortBy, { label })
        }
        loadingLabel={messages.common.loading}
        emptyLabel={resolvedEmptyLabel}
        className={className}
        search={search}
        export={exportConfig}
        defaultSort={
          comparisonLabel
            ? {
                key: "current",
                direction: "desc",
              }
            : undefined
        }
      />
    );
  },
) as <T extends string>(
  props: AsyncDimensionBreakdownCardProps<T>,
) => ReactNode;
