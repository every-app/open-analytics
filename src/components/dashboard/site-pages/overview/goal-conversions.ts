import { GOAL_QUERY_PARAM } from "@/lib/dashboard/paths";
import type {
  GoalDefinition,
  GoalSummary,
} from "@/lib/dashboard-api/client/edge";

/** One goal on the dashboard's Goal conversions card. */
export interface GoalConversionRow {
  key: string;
  goalId: string;
  name: string;
  /** Visitors who converted. */
  uniques: number;
  /** Visits that converted. */
  total: number;
  /** The share of visitors who converted, 0 to 1. */
  conversionRate: number;
}

/**
 * The card's rows, most unique conversions first, then by name. Each goal's
 * summary is in `summaries` by its id.
 */
export function goalConversionRows(
  goals: readonly GoalDefinition[],
  summaries: ReadonlyMap<string, GoalSummary>,
): GoalConversionRow[] {
  return goals
    .map((goal) => {
      const summary = summaries.get(goal.id);
      if (!summary) throw new Error(`goal_summary_missing:${goal.id}`);
      return {
        key: goal.id,
        goalId: goal.id,
        name: goal.name,
        uniques: summary.visitors.converted,
        total: summary.sessions.converted,
        conversionRate: summary.visitors.conversionRate,
      };
    })
    .sort(
      (left, right) =>
        right.uniques - left.uniques || left.name.localeCompare(right.name),
    );
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
