import { createDatabaseRuntime } from "@/lib/db";
import { REQUEST_OBSERVATION_RETENTION_MS } from "@/lib/edge/collector/request-observations";
import { ONE_HOUR_MS } from "@/lib/edge/utils";

import { readRetentionConfig } from "./retention-config";
import type { ScheduledTaskContext, ScheduledTaskOutcome } from "./runner";

const DAY_MS = 24 * ONE_HOUR_MS;
const DELETE_BATCH_SIZE = 200;
// Bounds one run; what's left is deleted on the next day's run.
const MAX_DELETE_BATCHES = 500;

interface SiteRetentionRow {
  sitePk: number;
  aggregatedUntilHour: number;
}

/**
 * Deletes page views and custom events older than the configured detail
 * retention, and Request Observation rows older than 30 days. Hourly rollups stay, so long-range counters and trends keep
 * working; breakdowns, sessions and journeys cover the retained window.
 *
 * Nothing is deleted past a site's rollup watermark: an hour that hasn't been
 * rolled up keeps its rows until it has been.
 */
export async function runAnalyticsRetention(
  context: ScheduledTaskContext,
): Promise<ScheduledTaskOutcome> {
  const { env, logger } = context;
  const db = createDatabaseRuntime(env.DB);
  const { analyticsDetailDays } = await readRetentionConfig(env);
  const cutoffMs = Date.now() - analyticsDetailDays * DAY_MS;

  const sites = await db.all<SiteRetentionRow>({
    sql: `
      SELECT site_pk AS sitePk, aggregated_until_hour AS aggregatedUntilHour
      FROM visit_hourly_aggregation_state
    `,
    bindings: [],
    tag: "scheduled_tasks.retention.sites",
  });

  let batches = 0;
  let visitsDeleted = 0;
  let eventsDeleted = 0;
  for (const site of sites.results) {
    const limitMs = Math.min(
      cutoffMs,
      (site.aggregatedUntilHour + 1) * ONE_HOUR_MS,
    );
    // Events first, with their payload rows; then the page views, whose
    // remaining events (ones newer than their page view) cascade.
    while (batches < MAX_DELETE_BATCHES) {
      batches += 1;
      const results = await db.batch([
        {
          sql: `
            DELETE FROM custom_event_json_values
            WHERE event_pk IN (
              SELECT event_pk FROM custom_events
              WHERE site_pk = ? AND occurred_at < ?
              ORDER BY occurred_at LIMIT ?
            )
          `,
          bindings: [site.sitePk, limitMs, DELETE_BATCH_SIZE],
          tag: "scheduled_tasks.retention.event_values",
        },
        {
          sql: `
            DELETE FROM custom_event_json_nodes
            WHERE event_pk IN (
              SELECT event_pk FROM custom_events
              WHERE site_pk = ? AND occurred_at < ?
              ORDER BY occurred_at LIMIT ?
            )
          `,
          bindings: [site.sitePk, limitMs, DELETE_BATCH_SIZE],
          tag: "scheduled_tasks.retention.event_nodes",
        },
        {
          sql: `
            DELETE FROM custom_events
            WHERE event_pk IN (
              SELECT event_pk FROM custom_events
              WHERE site_pk = ? AND occurred_at < ?
              ORDER BY occurred_at LIMIT ?
            )
          `,
          bindings: [site.sitePk, limitMs, DELETE_BATCH_SIZE],
          tag: "scheduled_tasks.retention.events",
        },
      ]);
      const changes = Number(results[2]?.meta?.changes ?? 0);
      eventsDeleted += changes;
      if (changes < DELETE_BATCH_SIZE) break;
    }
    while (batches < MAX_DELETE_BATCHES) {
      batches += 1;
      const result = await db.run({
        sql: `
          DELETE FROM visits
          WHERE visit_id IN (
            SELECT visit_id FROM visits
            WHERE site_pk = ? AND started_at < ?
            ORDER BY started_at LIMIT ?
          )
        `,
        bindings: [site.sitePk, limitMs, DELETE_BATCH_SIZE],
        tag: "scheduled_tasks.retention.visits",
      });
      const changes = Number(result.meta?.changes ?? 0);
      visitsDeleted += changes;
      if (changes < DELETE_BATCH_SIZE) break;
    }
  }

  let observationsDeleted = 0;
  while (batches < MAX_DELETE_BATCHES) {
    batches += 1;
    const result = await db.run({
      sql: `
        DELETE FROM request_observations
        WHERE id IN (
          SELECT id FROM request_observations
          WHERE received_at < ? ORDER BY received_at LIMIT ?
        )
      `,
      bindings: [
        Date.now() - REQUEST_OBSERVATION_RETENTION_MS,
        DELETE_BATCH_SIZE,
      ],
      tag: "scheduled_tasks.retention.request_observations",
    });
    const changes = Number(result.meta?.changes ?? 0);
    observationsDeleted += changes;
    if (changes < DELETE_BATCH_SIZE) break;
  }

  const summary = {
    analyticsDetailDays,
    cutoffMs,
    sites: sites.results.length,
    visitsDeleted,
    eventsDeleted,
    observationsDeleted,
    complete: batches < MAX_DELETE_BATCHES,
  };
  await logger.info(
    "analytics_retention_complete",
    "Analytics retention finished",
    summary,
  );
  return { status: "success", summary };
}
