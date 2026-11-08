import type { TabbedDataTableColumn } from "@/components/dashboard/common/tabbed-data-table-card";
import {
  currencyFormat,
  numberFormat,
  percentFormat,
} from "@/lib/dashboard/format";
import { GOAL_QUERY_PARAM } from "@/lib/dashboard/paths";
import type {
  GoalDefinition,
  GoalRevenue,
  GoalSummary,
} from "@/lib/dashboard-api/client/edge";
import { scrollDepthGoalFromDsl } from "@/lib/edge/analytics/contract/scroll-depth-goal";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

/** One goal on the dashboard's Goal conversions card. */
export interface GoalConversionRow {
  key: string;
  goalId: string;
  name: string;
  /** Visitors who converted. */
  uniques: number;
  /**
   * Total conversions. Null for a scroll depth goal, which, as in
   * Plausible, shows only its uniques and conversion rate.
   */
  total: number | null;
  /** The share of visitors who converted, 0 to 1. */
  conversionRate: number;
  /** Null for a goal without a currency. */
  revenue: GoalRevenue | null;
}

/** The card's rows, most unique conversions first, then by name. */
export function goalConversionRows(
  goals: readonly {
    readonly goal: GoalDefinition;
    readonly summary: GoalSummary;
  }[],
): GoalConversionRow[] {
  return goals
    .map(({ goal, summary }) => {
      return {
        key: goal.id,
        goalId: goal.id,
        name: goal.name,
        uniques: summary.visitors.converted,
        total:
          scrollDepthGoalFromDsl(goal.filterDsl) === null
            ? summary.conversions
            : null,
        conversionRate: summary.visitors.conversionRate,
        revenue: summary.revenue,
      };
    })
    .sort(
      (left, right) =>
        right.uniques - left.uniques || left.name.localeCompare(right.name),
    );
}

export type GoalSortKey =
  "uniques" | "total" | "conversionRate" | "revenue" | "averageRevenue";
type GoalColumn = TabbedDataTableColumn<GoalConversionRow, GoalSortKey, string>;

/** A revenue column: the amount in the goal's currency, "—" without one. */
function revenueColumn(
  key: Extract<GoalSortKey, "revenue" | "averageRevenue">,
  label: string,
  locale: Locale,
  amount: (revenue: NonNullable<GoalConversionRow["revenue"]>) => number,
): GoalColumn {
  return {
    key,
    label,
    getValue: (row) => (row.revenue ? amount(row.revenue) : 0),
    format: (value, row) =>
      row.revenue ? currencyFormat(locale, value, row.revenue.currency) : "—",
  };
}

/**
 * The card's columns: uniques, total ("—" for a scroll depth goal) and
 * conversion rate, then revenue and average revenue once a goal has a
 * currency.
 */
export function goalConversionColumns(
  labels: AppMessages["dashboard"]["goals"],
  locale: Locale,
  hasRevenue: boolean,
): readonly GoalColumn[] {
  return [
    {
      key: "uniques",
      label: labels.uniques,
      getValue: (row) => row.uniques,
      format: (value) => numberFormat(locale, value),
    },
    {
      key: "total",
      label: labels.total,
      getValue: (row) => row.total ?? 0,
      format: (value, row) =>
        row.total === null ? "—" : numberFormat(locale, value),
    },
    {
      key: "conversionRate",
      label: labels.conversionRate,
      getValue: (row) => row.conversionRate,
      format: (value) => percentFormat(locale, value),
    },
    ...(hasRevenue
      ? [
          revenueColumn(
            "revenue",
            labels.revenue,
            locale,
            (revenue) => revenue.total,
          ),
          revenueColumn(
            "averageRevenue",
            labels.averageRevenue,
            locale,
            (revenue) => revenue.average,
          ),
        ]
      : []),
  ];
}

/** A goal's page on Goals & funnels, keeping the dashboard's address state. */
export function goalHref(
  goalsPath: string,
  goalId: string,
  navHref: (path: string) => string,
): string {
  const href = navHref(goalsPath);
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${GOAL_QUERY_PARAM}=${encodeURIComponent(goalId)}`;
}
