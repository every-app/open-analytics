import { D1_MAX_BOUND_PARAMETERS } from "@/lib/db";
import type { Env } from "@/lib/edge/types";
import { ONE_DAY_MS } from "@/lib/edge/utils";

import { queryD1All } from "./core-sources";
import type { QueryWindow } from "./core-types";
import type { D1ReadDiagnostics } from "./diagnostics";

/** The UTC days rolled up for a site: first through last, inclusive. */
export interface RollupDays {
  readonly firstDay: number;
  readonly lastDay: number;
}

/**
 * How a query window divides between rollups and raw page views. Whole UTC
 * days inside the window that are rolled up come from rollups; the rest
 * (the partial UTC days at the window's edges, plus any days not rolled up
 * yet) come from raw rows. Every boundary between the parts is a UTC
 * midnight, which no visitor or visit crosses, so the parts add up.
 */
export interface RollupSplit {
  /** First rolled-up day read. */
  readonly startDay: number;
  /** Day after the last rolled-up day read. */
  readonly endDay: number;
  /** Raw page-view windows before and after the rolled-up days. */
  readonly rawWindows: readonly QueryWindow[];
}

export function splitRollupWindow(
  window: QueryWindow,
  days: RollupDays,
): RollupSplit | null {
  const startDay = Math.max(
    Math.ceil(window.startMs / ONE_DAY_MS),
    days.firstDay,
  );
  const endDay = Math.min(
    Math.floor(window.endExclusiveMs / ONE_DAY_MS),
    days.lastDay + 1,
  );
  if (startDay >= endDay) return null;
  const rollupStartMs = startDay * ONE_DAY_MS;
  const rollupEndMs = endDay * ONE_DAY_MS;
  const rawWindows: QueryWindow[] = [];
  if (window.startMs < rollupStartMs) {
    rawWindows.push({ ...window, endExclusiveMs: rollupStartMs });
  }
  if (rollupEndMs < window.endExclusiveMs) {
    rawWindows.push({ ...window, startMs: rollupEndMs });
  }
  return { startDay, endDay, rawWindows };
}

export function rollupSplitKey(split: RollupSplit): string {
  return [
    split.startDay,
    split.endDay,
    ...split.rawWindows.flatMap((window) => [
      window.startMs,
      window.endExclusiveMs,
    ]),
  ].join(":");
}

export async function readRollupDays(
  env: Env,
  siteIds: readonly string[],
  diagnostics?: D1ReadDiagnostics,
): Promise<Map<string, RollupDays>> {
  const days = new Map<string, RollupDays>();
  for (
    let index = 0;
    index < siteIds.length;
    index += D1_MAX_BOUND_PARAMETERS
  ) {
    const chunk = siteIds.slice(index, index + D1_MAX_BOUND_PARAMETERS);
    const rows = await queryD1All<{
      siteId: string;
      firstDay: number;
      lastDay: number;
    }>(
      env,
      `
SELECT si.site_id AS siteId, st.first_day AS firstDay, st.last_day AS lastDay
FROM visit_rollup_state st
JOIN site_identities si ON si.site_pk = st.site_pk
WHERE si.site_id IN (${chunk.map(() => "?").join(", ")})
  AND st.first_day <= st.last_day
`,
      chunk,
      diagnostics,
    );
    for (const row of rows) {
      days.set(String(row.siteId), {
        firstDay: Number(row.firstDay),
        lastDay: Number(row.lastDay),
      });
    }
  }
  return days;
}

/** Each site's split of the window, grouped by identical splits. */
export async function groupSitesByRollupSplit(
  env: Env,
  siteIds: readonly string[],
  window: QueryWindow,
  diagnostics?: D1ReadDiagnostics,
): Promise<{
  readonly groups: ReadonlyArray<{
    readonly siteIds: readonly string[];
    readonly split: RollupSplit;
  }>;
  readonly rawSiteIds: readonly string[];
}> {
  const days = await readRollupDays(env, siteIds, diagnostics);
  const groups = new Map<string, { siteIds: string[]; split: RollupSplit }>();
  const rawSiteIds: string[] = [];
  for (const siteId of siteIds) {
    const siteDays = days.get(siteId);
    const split = siteDays ? splitRollupWindow(window, siteDays) : null;
    if (!split) {
      rawSiteIds.push(siteId);
      continue;
    }
    const key = rollupSplitKey(split);
    const group = groups.get(key);
    if (group) group.siteIds.push(siteId);
    else groups.set(key, { siteIds: [siteId], split });
  }
  return { groups: [...groups.values()], rawSiteIds };
}
