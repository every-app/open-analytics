import type { DatabaseStatement } from "@/lib/db";
import { D1QueryBudgetExceededError } from "@/lib/edge/scheduled-tasks/d1-query-budget";
import { clampString } from "@/lib/edge/utils";

import {
  type IngestFlushContext,
  recordFlushCounter,
  resolveSitePk,
} from "./flush-types";
import type { BufferedCustomEventRow } from "./types";
/**
 * Writes a buffered custom event to D1, whose page view is already there.
 * Whether it was written: one that wasn't stays dirty, its failure counted,
 * for the next alarm. Running out of the invocation's D1 queries isn't a
 * failure of the event, so that error passes through.
 */
export async function flushCustomEventRow(
  context: IngestFlushContext,
  row: BufferedCustomEventRow,
): Promise<boolean> {
  try {
    const sitePk = await resolveSitePk(context, row.siteId);
    const eventNameId = await resolveEventNameId(context, row, sitePk);
    await context.db.batch(
      prepareCustomEventStatements(row, eventNameId, sitePk),
    );
    if (!(await hasPersistedCustomEvent(context, row.eventId))) {
      throw new Error("insert_did_not_create_event");
    }
  } catch (error) {
    if (error instanceof D1QueryBudgetExceededError) throw error;
    context.observability?.error("do.flush.custom_event_failed");
    context.sqlRun(
      `
        UPDATE buffered_custom_events
        SET flush_attempts = flush_attempts + 1, last_flush_error = ?
        WHERE event_id = ?
      `,
      clampString(String(error instanceof Error ? error.message : error), 400),
      row.eventId,
    );
    return false;
  }
  recordFlushCounter(context, "flushedCustomEvents");
  context.sqlRun(
    `
      UPDATE buffered_custom_events
      SET dirty = 0, flush_attempts = 0, last_flush_error = NULL
      WHERE event_id = ?
    `,
    row.eventId,
  );
  return true;
}
/** The event name's id in D1, created on its first event. */
async function resolveEventNameId(
  context: IngestFlushContext,
  row: BufferedCustomEventRow,
  sitePk: number,
): Promise<number> {
  const cacheKey = `${sitePk}:${row.eventName}`;
  const cached = context.eventNameIds.get(cacheKey);
  if (cached !== undefined) return cached;

  await context.db.run({
    sql: `
      INSERT INTO custom_event_names (site_pk, name, created_at, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(site_pk, name) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
    `,
    bindings: [sitePk, row.eventName, row.createdAt, row.createdAt],
    tag: "ingest.custom_event_names.upsert",
  });
  const name = await context.db.first<{ id: number }>({
    sql: `
      SELECT id
      FROM custom_event_names
      WHERE site_pk = ? AND name = ?
      LIMIT 1
    `,
    bindings: [sitePk, row.eventName],
    tag: "ingest.custom_event_names.first",
  });
  if (!name) throw new Error("Failed to resolve the custom event name's id");
  context.eventNameIds.set(cacheKey, name.id);
  return name.id;
}
async function hasPersistedCustomEvent(
  context: IngestFlushContext,
  eventId: string,
): Promise<boolean> {
  const persisted = await context.db.first<{ ok: number }>({
    sql: `
      SELECT 1 AS ok
      FROM custom_events
      WHERE event_id = ?
      LIMIT 1
    `,
    bindings: [eventId],
    tag: "ingest.custom_events.confirm_persisted",
  });
  return persisted !== null;
}
/**
 * The event's write, only once its page view is in D1, then one statement
 * for its custom properties if it has any.
 */
function prepareCustomEventStatements(
  row: BufferedCustomEventRow,
  eventNameId: number,
  sitePk: number,
): DatabaseStatement[] {
  const event: DatabaseStatement = {
    sql: `
      INSERT OR IGNORE INTO custom_events (
        event_id, site_pk, visit_id, event_name_id, occurred_at, received_at,
        sequence, revenue_amount, revenue_currency, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM visits
      WHERE site_pk = ? AND visit_id = ?
      LIMIT 1
    `,
    bindings: [
      row.eventId,
      sitePk,
      row.visitId,
      eventNameId,
      row.occurredAt,
      row.receivedAt,
      row.sequence,
      row.revenueAmount,
      row.revenueCurrency,
      row.createdAt,
      sitePk,
      row.visitId,
    ],
    tag: "ingest.custom_events.insert",
  };
  if (row.propertiesJson === null) return [event];
  return [
    event,
    {
      sql: `
        INSERT OR IGNORE INTO custom_event_properties (
          event_pk, key, value, site_pk, occurred_at
        )
        SELECT ce.event_pk, property.key, property.value, ce.site_pk, ce.occurred_at
        FROM custom_events ce, json_each(?2) AS property
        WHERE ce.event_id = ?1
      `,
      bindings: [row.eventId, row.propertiesJson],
      tag: "ingest.custom_event_properties.insert",
    },
  ];
}
