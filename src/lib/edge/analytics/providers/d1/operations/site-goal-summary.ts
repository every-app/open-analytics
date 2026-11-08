import type { GoalDefinition } from "@/lib/edge/analytics/contract";
import {
  type FilterDocument,
  parseGoalFilter,
} from "@/lib/edge/analytics/contract";
import type {
  CanonicalGoalConversionSummary,
  CanonicalGoalMetricSummary,
} from "@/lib/edge/analytics/contract/operation-results";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core-types";
import type { D1ReadDiagnostics } from "@/lib/edge/analytics/providers/d1/internal/diagnostics";
import {
  type GoalConversionCounts,
  queryGoalConversionsFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/goal-conversions";
import {
  queryAllGoalDefinitions,
  queryGoalDefinition,
} from "@/lib/edge/analytics/providers/d1/internal/goals";
import type { Env } from "@/lib/edge/types";

export interface SiteGoalReadInput {
  readonly env: Env;
  readonly siteId: string;
  readonly window: QueryWindow;
  readonly filters: FilterDocument;
  readonly diagnostics?: D1ReadDiagnostics;
}

export interface SiteGoalSummaryResult {
  readonly goal: GoalDefinition;
  readonly summary: CanonicalGoalConversionSummary;
}

function metric(total: number, converted: number): CanonicalGoalMetricSummary {
  const safeConverted = Math.min(total, converted);
  return {
    total,
    converted: safeConverted,
    conversionRate: total > 0 ? safeConverted / total : 0,
  };
}

function summary(
  goal: GoalDefinition,
  totals: { readonly sessions: number; readonly visitors: number },
  counts: GoalConversionCounts,
): SiteGoalSummaryResult {
  return {
    goal,
    summary: {
      sessions: metric(totals.sessions, counts.sessions),
      visitors: metric(totals.visitors, counts.visitors),
      conversions: counts.conversions,
      revenue:
        goal.currency !== undefined && counts.revenue
          ? {
              currency: goal.currency,
              total: counts.revenue.total,
              // Plausible's average revenue: per event that carried revenue.
              average:
                counts.revenue.events > 0
                  ? counts.revenue.total / counts.revenue.events
                  : 0,
            }
          : null,
    },
  };
}

async function readGoals(
  input: SiteGoalReadInput,
  goals: readonly GoalDefinition[],
): Promise<SiteGoalSummaryResult[]> {
  const aggregate = await queryGoalConversionsFromD1(
    input.env,
    input.siteId,
    input.window,
    input.filters,
    goals.map((goal) => ({
      id: goal.id,
      filter: parseGoalFilter(goal),
      ...(goal.currency === undefined ? {} : { currency: goal.currency }),
    })),
    input.diagnostics,
  );
  const totals = {
    sessions: aggregate.totalSessions,
    visitors: aggregate.totalVisitors,
  };
  return goals.map((goal) =>
    summary(goal, totals, aggregate.goals.get(goal.id)!),
  );
}

/** One goal's conversions, for its detail page. */
export async function readSiteGoalSummary(
  input: SiteGoalReadInput & { readonly goalId: string },
): Promise<SiteGoalSummaryResult | null> {
  const goal = await queryGoalDefinition(input.env, input.siteId, input.goalId);
  return goal ? (await readGoals(input, [goal]))[0]! : null;
}

/** Every goal of the site with its conversions, in one statement. */
export async function readSiteGoalConversions(
  input: SiteGoalReadInput,
): Promise<{ readonly goals: readonly SiteGoalSummaryResult[] }> {
  const goals = await queryAllGoalDefinitions(input.env, input.siteId);
  return { goals: goals.length > 0 ? await readGoals(input, goals) : [] };
}
