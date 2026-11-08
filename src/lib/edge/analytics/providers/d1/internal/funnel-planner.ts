import { CompoundOperator, compoundSelectSql } from "@/lib/db";
import {
  concat,
  join,
  parameter,
  type SqlFragment,
  text,
} from "@/lib/db/sql/fragment";
import {
  type FilterDocument,
  type FunnelConfigV2,
  MAX_FUNNEL_STEPS,
  parseFunnelStepFilter,
} from "@/lib/edge/analytics/contract";
import {
  FUNNEL_SQL_CTES_PER_STEP,
  FUNNEL_SQL_MAX_BINDINGS as FUNNEL_CONFIG_MAX_SQL_BINDINGS,
  FUNNEL_SQL_MAX_LENGTH as FUNNEL_CONFIG_MAX_SQL_LENGTH,
  FUNNEL_SQL_STRUCTURAL_BUDGET,
  type FunnelSqlStructuralBudget,
} from "@/lib/edge/analytics/contract/funnel-budget";

import {
  eventMatchSql,
  type FilterSqlScope,
  pageViewMatchSql,
  sitePk,
  visitFilterSql,
} from "./filter-compiler";
export { FUNNEL_SQL_CTES_PER_STEP, FUNNEL_SQL_STRUCTURAL_BUDGET };
export type { FunnelSqlStructuralBudget };
/** D1's existing provider code treats one hundred parameters as the safe cap. */
export const FUNNEL_SQL_MAX_BINDINGS = FUNNEL_CONFIG_MAX_SQL_BINDINGS;
/** A bounded statement budget for a ten-step plan and its filter expansion. */
export const FUNNEL_SQL_MAX_LENGTH = FUNNEL_CONFIG_MAX_SQL_LENGTH;
export const MAX_HISTORICAL_FUNNEL_STEPS = 12 as const;
/** Compatibility budget for the pre-v2 database maximum. It is only used for
 * an already-stored definition; all new writes remain on the ten-step budget. */
export const FUNNEL_SQL_HISTORICAL_STRUCTURAL_BUDGET: FunnelSqlStructuralBudget =
  Object.freeze({
    maxSteps: MAX_HISTORICAL_FUNNEL_STEPS,
    maxStagedCtes: MAX_HISTORICAL_FUNNEL_STEPS,
    maxFunnelCtes: MAX_HISTORICAL_FUNNEL_STEPS * FUNNEL_SQL_CTES_PER_STEP + 1,
    maxSqlLength: FUNNEL_SQL_MAX_LENGTH,
    maxBindings: FUNNEL_SQL_MAX_BINDINGS,
  });
export interface FunnelSqlShape {
  readonly stepCount: number;
  readonly stagedCteCount: number;
  readonly funnelCteCount: number;
  readonly sqlLength: number;
  readonly bindingCount: number;
}
export interface FunnelSqlStepLayer {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly reachedRelation: string;
}
export interface FunnelSqlPlan {
  readonly sql: string;
  readonly bindings: readonly (string | number | null)[];
  readonly steps: readonly FunnelSqlStepLayer[];
  readonly shape: FunnelSqlShape;
}
/** The page views and custom events a funnel reads: one site's, in a window. */
export interface FunnelSource {
  readonly siteId: string;
  readonly startMs: number;
  readonly endExclusiveMs: number;
  /**
   * The dashboard's filter. It picks the sessions or visitors the funnel
   * follows: those with a page view in the window that matches it. Their
   * steps are read from all of their page views and events.
   */
  readonly filters: FilterDocument;
}
type Identity = "session_id" | "visitor_id";
function mergedBudget(
  budget: Partial<FunnelSqlStructuralBudget>,
): FunnelSqlStructuralBudget {
  return {
    ...FUNNEL_SQL_STRUCTURAL_BUDGET,
    ...budget,
  };
}
export function measureFunnelSqlShape(input: {
  readonly sql: string;
  readonly bindings: readonly unknown[];
  readonly stepCount: number;
  readonly funnelCteCount: number;
}): FunnelSqlShape {
  return {
    stepCount: input.stepCount,
    stagedCteCount: input.stepCount,
    funnelCteCount: input.funnelCteCount,
    sqlLength: input.sql.length,
    bindingCount: input.bindings.length,
  };
}
export function assertFunnelSqlShapeWithinBudget(
  shape: FunnelSqlShape,
  budget: Partial<FunnelSqlStructuralBudget> = {},
): void {
  const limits = mergedBudget(budget);
  if (shape.stepCount > limits.maxSteps) {
    throw new Error("funnel_sql_step_limit_exceeded");
  }
  if (shape.stagedCteCount > limits.maxStagedCtes) {
    throw new Error("funnel_sql_staged_cte_limit_exceeded");
  }
  if (shape.funnelCteCount > limits.maxFunnelCtes) {
    throw new Error("funnel_sql_cte_limit_exceeded");
  }
  if (shape.sqlLength > limits.maxSqlLength) {
    throw new Error("funnel_sql_length_exceeded");
  }
  if (shape.bindingCount > limits.maxBindings) {
    throw new Error("funnel_sql_binding_limit_exceeded");
  }
}
function identityColumn(scope: FunnelConfigV2["progressionScope"]): Identity {
  return scope === "session" ? "session_id" : "visitor_id";
}
function observationAfter(candidate: string, previous: string): string {
  return `(
    ${candidate}.observed_at > ${previous}.last_observed_at
    OR (
      ${candidate}.observed_at = ${previous}.last_observed_at
      AND (
        ${candidate}.observation_rank > ${previous}.last_observation_rank
        OR (
          ${candidate}.observation_rank = ${previous}.last_observation_rank
          AND (
            ${candidate}.sequence > ${previous}.last_sequence
            OR (
              ${candidate}.sequence = ${previous}.last_sequence
              AND ${candidate}.source_id > ${previous}.last_source_id
            )
          )
        )
      )
    )
  )`;
}
function stepColumns(
  steps: readonly FilterDocument[],
  match: (filters: FilterDocument) => SqlFragment,
): SqlFragment {
  return join(
    steps.map((step, index) =>
      concat(text("("), match(step), text(`) AS step_${index}`)),
    ),
    text(",\n      "),
  );
}
/**
 * `filtered_identities`: the sessions or visitors with a page view in the
 * window that matches the filter, from one scan of the window's page views.
 * Null without a filter.
 */
function filteredIdentitiesCte(
  source: FunnelSource,
  identity: Identity,
): SqlFragment | null {
  const predicate = visitFilterSql(source.filters, source);
  if (!predicate) return null;
  return concat(
    text(`
filtered_identities AS MATERIALIZED (
  SELECT DISTINCT v.${identity} AS identity
  FROM visits v
  WHERE v.site_pk = `),
    sitePk(source.siteId),
    text(" AND v.started_at >= "),
    parameter(source.startMs),
    text(" AND v.started_at < "),
    parameter(source.endExclusiveMs),
    text(`
    AND v.${identity} != ''
    AND `),
    predicate,
    text("\n),"),
  );
}
/**
 * Every page view and custom event of the window that matches a step, with
 * a flag per step: one scan of visits and one of custom events, kept as a
 * narrow table that every step reads. With a filter, only those of the
 * filtered sessions or visitors.
 */
function observationsCte(
  source: FunnelSource,
  steps: readonly FilterDocument[],
  identity: Identity,
): SqlFragment {
  const scope: FilterSqlScope = source;
  const identities = filteredIdentitiesCte(source, identity);
  const followed = text(
    identities
      ? `\n      AND v.${identity} IN (SELECT identity FROM filtered_identities)`
      : "",
  );
  return concat(
    identities ?? text(""),
    text(`
funnel_observations AS MATERIALIZED (
  SELECT * FROM (
    SELECT
      v.session_id,
      v.visitor_id,
      v.started_at AS observed_at,
      0 AS observation_rank,
      0 AS sequence,
      v.visit_id AS source_id,
      `),
    stepColumns(steps, (step) => pageViewMatchSql(step, scope)),
    text(`
    FROM visits v
    WHERE v.site_pk = `),
    sitePk(source.siteId),
    text(" AND v.started_at >= "),
    parameter(source.startMs),
    text(" AND v.started_at < "),
    parameter(source.endExclusiveMs),
    followed,
    text(`
    UNION ALL
    SELECT
      v.session_id,
      v.visitor_id,
      ce.occurred_at AS observed_at,
      1 AS observation_rank,
      ce.sequence,
      ce.event_id AS source_id,
      `),
    stepColumns(steps, (step) => eventMatchSql(step, scope)),
    text(`
    FROM custom_events ce
    INNER JOIN custom_event_names cen
      ON cen.id = ce.event_name_id
    INNER JOIN visits v
      ON v.site_pk = ce.site_pk
     AND v.visit_id = ce.visit_id
    WHERE ce.site_pk = `),
    sitePk(source.siteId),
    text(" AND ce.occurred_at >= "),
    parameter(source.startMs),
    text(" AND ce.occurred_at < "),
    parameter(source.endExclusiveMs),
    followed,
    text(`
  )
  WHERE ${steps.map((_step, index) => `step_${index}`).join(" OR ")}
)`),
  );
}
function reachedZeroCte(identity: Identity): string {
  return `
reached_0 AS (
  SELECT
    ranked.session_id,
    ranked.visitor_id,
    ranked.observed_at AS first_observed_at,
    ranked.observed_at AS last_observed_at,
    ranked.observation_rank AS last_observation_rank,
    ranked.sequence AS last_sequence,
    ranked.source_id AS last_source_id
  FROM (
    SELECT
      observations.*,
      ROW_NUMBER() OVER (
        PARTITION BY observations.${identity}
        ORDER BY observations.observed_at ASC,
                 observations.observation_rank ASC,
                 observations.sequence ASC,
                 observations.source_id ASC
      ) AS reached_rank
    FROM funnel_observations observations
    WHERE observations.step_0
      AND TRIM(COALESCE(observations.${identity}, '')) != ''
  ) ranked
  WHERE ranked.reached_rank = 1
)`;
}
function reachedNextCte(
  stepIndex: number,
  identity: Identity,
  visitorWindow: boolean,
): string {
  const windowClause = visitorWindow
    ? `
     AND candidate.observed_at <= previous.first_observed_at
       + (SELECT conversion_window_ms FROM funnel_params)`
    : "";
  return `
reached_${stepIndex} AS (
  SELECT
    ranked.session_id,
    ranked.visitor_id,
    ranked.first_observed_at,
    ranked.observed_at AS last_observed_at,
    ranked.observation_rank AS last_observation_rank,
    ranked.sequence AS last_sequence,
    ranked.source_id AS last_source_id
  FROM (
    SELECT
      previous.session_id,
      previous.visitor_id,
      previous.first_observed_at,
      candidate.observed_at,
      candidate.observation_rank,
      candidate.sequence,
      candidate.source_id,
      ROW_NUMBER() OVER (
        PARTITION BY previous.${identity}
        ORDER BY candidate.observed_at ASC,
                 candidate.observation_rank ASC,
                 candidate.sequence ASC,
                 candidate.source_id ASC
      ) AS reached_rank
    FROM reached_${stepIndex - 1} previous
    INNER JOIN funnel_observations candidate
      ON candidate.step_${stepIndex}
     AND candidate.${identity} = previous.${identity}
     AND ${observationAfter("candidate", "previous")}${windowClause}
  ) ranked
  WHERE ranked.reached_rank = 1
)`;
}
function countDistinct(relation: string, column: Identity, where = ""): string {
  return `(SELECT COUNT(DISTINCT ${column})
    FROM ${relation}
    WHERE TRIM(COALESCE(${column}, '')) != ''${where})`;
}
/**
 * One row per step: the sessions and visitors that reached it. The first
 * step's are those of every observation that matches it.
 */
function resultSql(stepCount: number): string {
  const rows = Array.from({ length: stepCount }, (_step, index) => {
    const [relation, where] =
      index === 0
        ? ["funnel_observations", " AND step_0"]
        : [`reached_${index}`, ""];
    return `
SELECT
  ${index} AS stepIndex,
  ? AS stepId,
  ${countDistinct(relation, "session_id", where)} AS sessions,
  ${countDistinct(relation, "visitor_id", where)} AS visitors`;
  });
  return `${compoundSelectSql(rows, CompoundOperator.UnionAll)}
ORDER BY stepIndex ASC`;
}
export function assertFunnelStructuralBudget(stepCount: number): void {
  if (!Number.isSafeInteger(stepCount) || stepCount < 1) {
    throw new Error("funnel_steps_required");
  }
  if (stepCount > MAX_FUNNEL_STEPS) {
    throw new Error("funnel_sql_step_limit_exceeded");
  }
  const estimatedCtes = stepCount * FUNNEL_SQL_CTES_PER_STEP + 1;
  if (estimatedCtes > FUNNEL_SQL_STRUCTURAL_BUDGET.maxFunnelCtes) {
    throw new Error("funnel_sql_cte_limit_exceeded");
  }
}
function assertConversionWindow(config: FunnelConfigV2): void {
  if (config.progressionScope === "visitor") {
    if (
      config.conversionWindowMs === null ||
      !Number.isFinite(config.conversionWindowMs) ||
      config.conversionWindowMs <= 0
    ) {
      throw new Error("visitor_funnel_conversion_window_must_be_positive");
    }
  } else if (config.conversionWindowMs !== null) {
    throw new Error("session_funnel_conversion_window_must_be_null");
  }
}
function assertConfigShape(
  config: FunnelConfigV2,
  allowHistoricalOverLimit: boolean,
): void {
  if (!allowHistoricalOverLimit) {
    assertFunnelStructuralBudget(config.steps.length);
  } else if (
    !Number.isSafeInteger(config.steps.length) ||
    config.steps.length < 1
  ) {
    throw new Error("funnel_steps_required");
  } else if (config.steps.length > MAX_HISTORICAL_FUNNEL_STEPS) {
    throw new Error("funnel_historical_step_limit_exceeded");
  }
  assertConversionWindow(config);
}
/**
 * One D1 statement for a funnel: the window's page views and custom events
 * of the followed sessions or visitors are read once, each flagged with the
 * steps it matches, and each step's progression starts after the previous
 * step's.
 */
export function buildFunnelSqlPlan(
  config: FunnelConfigV2,
  source: FunnelSource,
  options: { readonly allowHistoricalOverLimit?: boolean } = {},
): FunnelSqlPlan {
  assertConfigShape(config, options.allowHistoricalOverLimit ?? false);
  const identity = identityColumn(config.progressionScope);
  const visitorWindow = config.progressionScope === "visitor";
  const observations = observationsCte(
    source,
    config.steps.map(parseFunnelStepFilter),
    identity,
  );
  const reached = config.steps.map((_step, index) =>
    index === 0
      ? reachedZeroCte(identity)
      : reachedNextCte(index, identity, visitorWindow),
  );
  const sql = `WITH${
    visitorWindow
      ? "\nfunnel_params AS (SELECT ? AS conversion_window_ms),"
      : ""
  }${observations.text},
${reached.join(",\n")}
${resultSql(config.steps.length)}`;
  const bindings = [
    ...(visitorWindow ? [config.conversionWindowMs!] : []),
    ...(observations.bindings as (string | number | null)[]),
    ...config.steps.map((step) => step.id),
  ];
  const shape = measureFunnelSqlShape({
    sql,
    bindings,
    stepCount: config.steps.length,
    funnelCteCount:
      1 +
      reached.length +
      (visitorWindow ? 1 : 0) +
      (source.filters.conditions.length > 0 ? 1 : 0),
  });
  assertFunnelSqlShapeWithinBudget(
    shape,
    options.allowHistoricalOverLimit
      ? FUNNEL_SQL_HISTORICAL_STRUCTURAL_BUDGET
      : FUNNEL_SQL_STRUCTURAL_BUDGET,
  );
  return {
    sql,
    bindings,
    steps: config.steps.map((step, stepIndex) => ({
      stepId: step.id,
      stepIndex,
      reachedRelation: `reached_${stepIndex}`,
    })),
    shape,
  };
}
