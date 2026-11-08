import { SITE_PK_FROM_SITE_ID_SQL } from "@/lib/edge/sites/identity-sql";
import type { Env } from "@/lib/edge/types";

import { type BoundSql, VISIT_SOURCE_COLUMNS } from "./core-sources";
import type { FilterDocument, QueryWindow } from "./core-types";
import type { D1ReadDiagnostics } from "./diagnostics";
import type { RollupDimension } from "./rollup-dimensions";
import {
  readRollupDays,
  type RollupSplit,
  splitRollupWindow,
} from "./rollup-window";

/**
 * An unfiltered breakdown read from rollups plus raw edges. `visitSource`
 * defines the `visit_source` CTE as the raw page views outside the
 * rolled-up days, so a card's raw grouping runs over it unchanged; the
 * rolled-up rows are added to that grouping's result.
 */
export interface RollupEdgeSource {
  readonly split: RollupSplit;
  readonly visitSource: BoundSql;
}

function rawEdgeVisitSource(siteId: string, split: RollupSplit): BoundSql {
  if (split.rawWindows.length === 0) {
    return {
      sql: `
visit_source AS (
  SELECT ${VISIT_SOURCE_COLUMNS}
  FROM visits
  WHERE 0
)`,
      bindings: [],
    };
  }
  return {
    sql: `
visit_source AS (
  ${split.rawWindows
    .map(
      () => `SELECT ${VISIT_SOURCE_COLUMNS}
  FROM visits
  WHERE site_pk = ${SITE_PK_FROM_SITE_ID_SQL}
    AND started_at >= ? AND started_at < ?`,
    )
    .join("\n  UNION ALL\n  ")}
)`,
    bindings: split.rawWindows.flatMap((window) => [
      siteId,
      window.startMs,
      window.endExclusiveMs,
    ]),
  };
}

/** The rollup source for an unfiltered read of a site with rolled-up days. */
export async function rollupEdgeSource(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<RollupEdgeSource | null> {
  if (filters.conditions.length > 0) return null;
  const days = (await readRollupDays(env, [siteId], diagnostics)).get(siteId);
  const split = days ? splitRollupWindow(window, days) : null;
  return split
    ? { split, visitSource: rawEdgeVisitSource(siteId, split) }
    : null;
}

/** A dimension's rolled-up rows: value, views, sessions, visitors. */
export function dailyDimensionRows(
  siteId: string,
  dimension: RollupDimension,
  split: RollupSplit,
): BoundSql {
  return {
    sql: `
SELECT value, views, sessions, visitors
FROM visit_daily_dimension_rollups
WHERE site_pk = ${SITE_PK_FROM_SITE_ID_SQL}
  AND dimension = ?
  AND day >= ? AND day < ?`,
    bindings: [siteId, dimension, split.startDay, split.endDay],
  };
}
