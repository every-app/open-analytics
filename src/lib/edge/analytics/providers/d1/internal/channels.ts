import type { TrafficChannelId } from "@/lib/analytics/traffic-channel-rules";
import type { Env } from "@/lib/edge/types";

import type { FilterDocument, QueryWindow } from "./core";
import { filteredVisitsCte, queryD1All } from "./core";

export interface ChannelAggregateRow {
  readonly channel: TrafficChannelId;
  readonly views: number;
  readonly sessions: number;
  readonly visitors: number;
}

export async function queryChannelsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  limit: number,
): Promise<ChannelAggregateRow[]> {
  const source = filteredVisitsCte(siteId, window, filters);
  const sql = `
WITH
${source.sql},
channel_rollup AS (
  SELECT
    channel,
    count(*) AS views,
    count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END) AS sessions,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors
  FROM filtered_visits
  GROUP BY channel
)
SELECT channel, views, sessions, visitors
FROM channel_rollup
ORDER BY views DESC, sessions DESC, channel ASC
LIMIT ?
`;

  return (
    await queryD1All<Record<string, unknown>>(env, sql, [
      ...source.bindings,
      limit,
    ])
  ).map((row) => ({
    channel: String(row.channel ?? "other") as TrafficChannelId,
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));
}

/** Naming aligned with the existing page/referrer aggregate adapters. */
export const queryChannelAggregate = queryChannelsFromD1;
