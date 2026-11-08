import type { DatabaseStatement } from "@/lib/db";
import { D1QueryBudgetExceededError } from "@/lib/edge/scheduled-tasks/d1-query-budget";
import { latestCompleteDay } from "@/lib/edge/scheduled-tasks/visit-rollups";
import { clampString, ONE_DAY_MS, ONE_HOUR_MS } from "@/lib/edge/utils";

import {
  D1_FLUSH_BATCH_SIZE,
  FLUSHED_BUFFER_RETENTION_MS,
  HIDDEN_LEAVE_GRACE_MS,
  ORPHAN_CUSTOM_EVENT_TIMEOUT_MS,
  VISIT_TIMEOUT_MS,
  WS_PRESENCE_LEAVE_EVENT,
} from "./constants";
import { flushCustomEventRow } from "./custom-event-flush";
import { engagedDurationMs } from "./engaged-time";
import {
  type IngestFlushContext,
  recordFlushCounter,
  resolveSitePk,
} from "./flush-types";
import {
  INSERT_VISIT_PROPERTIES_SQL,
  MARK_ROLLED_UP_DAY_SQL,
  visitBindings,
  visitUpsertSql,
} from "./sql";
import { toUnixSeconds } from "./time";
import type { BufferedCustomEventRow, BufferedVisitRow } from "./types";
type BufferedVisitFlushRow = BufferedVisitRow & {
  /** The page view's custom properties as a JSON object, NULL if none. */
  propertiesJson: string | null;
};
/** Buffered custom events read at a time. Not a limit on how many flush. */
const CUSTOM_EVENT_PAGE_SIZE = 100;
/**
 * A flush marks a page view's day for the rollup task only once the day
 * could be rolled up: from this long before, so a flush racing the rollup
 * run still marks it.
 */
const ROLLUP_MARK_MARGIN_MS = ONE_HOUR_MS;
/** What a maintenance run of the alarm got through. */
export enum MaintenanceOutcome {
  /** Everything due is done, or waits for the next alarm after a failure. */
  Done = "done",
  /** The invocation's D1 queries ran out with work left. */
  OutOfQueries = "out_of_queries",
}
interface FinishedVisitCandidate {
  visitId: string;
  siteId: string;
  visitorId: string;
  sessionId: string;
  status: string;
  startedAt: number;
  lastActivityAt: number;
  hiddenAt: number | null;
  hiddenMs: number;
  pathname: string;
  queryString: string;
  hash: string;
  title: string;
  hostname: string;
  referrerUrl: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  isEU: number;
  country: string;
  region: string;
  regionCode: string;
  city: string;
  continent: string;
  timezone: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  language: string;
  screenWidth: number | null;
  screenHeight: number | null;
  latitude: number | null;
  longitude: number | null;
}
const FINISHED_VISIT_CANDIDATE_COLUMNS = `
  visit_id AS visitId,
  site_id AS siteId,
  visitor_id AS visitorId,
  session_id AS sessionId,
  status,
  started_at AS startedAt,
  last_activity_at AS lastActivityAt,
  hidden_at AS hiddenAt,
  hidden_ms AS hiddenMs,
  pathname,
  query_string AS queryString,
  hash_fragment AS hash,
  title,
  hostname,
  referrer_url AS referrerUrl,
  referrer_host AS referrerHost,
  utm_source AS utmSource,
  utm_medium AS utmMedium,
  utm_campaign AS utmCampaign,
  utm_term AS utmTerm,
  utm_content AS utmContent,
  is_eu AS isEU,
  country,
  region,
  region_code AS regionCode,
  city,
  continent,
  timezone,
  browser,
  browser_version AS browserVersion,
  os,
  os_version AS osVersion,
  device_type AS deviceType,
  language,
  screen_width AS screenWidth,
  screen_height AS screenHeight,
  latitude,
  longitude
`;
async function pushFinalizedVisitRealtimeEvent(
  context: IngestFlushContext,
  visit: FinishedVisitCandidate,
  eventAt: number,
  durationMs: number | null,
  durationSource: string,
  exitReason: string,
): Promise<void> {
  await context.pushRealtimeRecord({
    id: `leave:${visit.visitId}`,
    eventType: WS_PRESENCE_LEAVE_EVENT,
    eventKind: "leave",
    eventAt,
    siteId: visit.siteId,
    visitId: visit.visitId,
    sessionId: visit.sessionId,
    startedAt: visit.startedAt,
    pathname: visit.pathname,
    queryString: visit.queryString,
    hash: visit.hash,
    title: visit.title,
    hostname: visit.hostname,
    referrerUrl: visit.referrerUrl,
    referrerHost: visit.referrerHost,
    utmSource: visit.utmSource,
    utmMedium: visit.utmMedium,
    utmCampaign: visit.utmCampaign,
    utmTerm: visit.utmTerm,
    utmContent: visit.utmContent,
    visitorId: visit.visitorId,
    isEU: visit.isEU,
    country: visit.country,
    region: visit.region,
    regionCode: visit.regionCode,
    city: visit.city,
    continent: visit.continent,
    timezone: visit.timezone,
    browser: visit.browser,
    browserVersion: visit.browserVersion,
    os: visit.os,
    osVersion: visit.osVersion,
    deviceType: visit.deviceType,
    screenWidth: visit.screenWidth,
    screenHeight: visit.screenHeight,
    language: visit.language,
    status: "complete",
    endedAt: eventAt,
    finalizedAt: eventAt,
    durationMs,
    durationSource,
    exitReason,
    leaveAt: eventAt,
    latitude: visit.latitude,
    longitude: visit.longitude,
  });
}
/**
 * The alarm's work: finish the page views whose time is up, write every
 * dirty row to D1, then delete what the buffer no longer needs. A D1 failure
 * leaves rows dirty for the next alarm; running out of the invocation's D1
 * queries ends the run early.
 */
export async function runMaintenance(
  context: IngestFlushContext,
): Promise<MaintenanceOutcome> {
  await finalizeDueVisits(context);
  return withinQueryBudget(context, async () => {
    await flushPendingToD1(context);
    await cleanupBufferedRows(context);
  });
}
/** Cleanup on its own, for a site whose alarm doesn't run. */
export async function runCleanup(
  context: IngestFlushContext,
): Promise<MaintenanceOutcome> {
  return withinQueryBudget(context, () => cleanupBufferedRows(context));
}
async function withinQueryBudget(
  context: IngestFlushContext,
  work: () => Promise<void>,
): Promise<MaintenanceOutcome> {
  try {
    await work();
  } catch (error) {
    if (!(error instanceof D1QueryBudgetExceededError)) throw error;
    context.observability?.warn("do.maintenance.out_of_d1_queries");
    return MaintenanceOutcome.OutOfQueries;
  }
  return MaintenanceOutcome.Done;
}
/**
 * Writes every dirty page view to D1, batch after batch, then every custom
 * event whose page view is there.
 */
export async function flushPendingToD1(
  context: IngestFlushContext,
): Promise<void> {
  await flushVisits(context);
  await flushCustomEvents(context);
}
async function flushVisits(context: IngestFlushContext): Promise<void> {
  for (;;) {
    const rows = selectDirtyVisits(context);
    if (rows.length === 0) return;
    // Rows come oldest first, those that failed before last. Those go one
    // by one, so a page view D1 rejects can't fail the others' batch.
    const fresh = rows.filter((row) => row.flushAttempts === 0);
    if (fresh.length > 1 && (await writeVisits(context, fresh))) continue;
    // A failed batch's rows, or those that failed before, one by one. The
    // first that fails ends the run: D1 may be down.
    for (const row of fresh.length > 0 ? fresh : rows) {
      if (!(await writeVisits(context, [row]))) return;
    }
  }
}
function selectDirtyVisits(
  context: IngestFlushContext,
): BufferedVisitFlushRow[] {
  return context.sqlAll<BufferedVisitFlushRow>(
    `
      SELECT
        visit_id AS visitId,
        status,
        site_id AS siteId,
        visitor_id AS visitorId,
        session_id AS sessionId,
        started_at AS startedAt,
        last_activity_at AS lastActivityAt,
        ended_at AS endedAt,
        finalized_at AS finalizedAt,
        duration_ms AS durationMs,
        scroll_depth AS scrollDepth,
        COALESCE(duration_source, '') AS durationSource,
        COALESCE(exit_reason, '') AS exitReason,
        pathname,
        query_string AS queryString,
        hash_fragment AS hashFragment,
        hostname,
        title,
        referrer_url AS referrerUrl,
        referrer_host AS referrerHost,
        utm_source AS utmSource,
        utm_medium AS utmMedium,
        utm_campaign AS utmCampaign,
        utm_term AS utmTerm,
        utm_content AS utmContent,
        channel,
        is_eu AS isEU,
        country,
        region,
        region_code AS regionCode,
        city,
        continent,
        latitude,
        longitude,
        timezone,
        browser,
        browser_version AS browserVersion,
        os,
        os_version AS osVersion,
        device_type AS deviceType,
        screen_width AS screenWidth,
        screen_height AS screenHeight,
        language,
        properties_json AS propertiesJson,
        dirty,
        flush_attempts AS flushAttempts,
        buffer_revision AS bufferRevision,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM buffered_visits
      WHERE dirty = 1
      ORDER BY flush_attempts ASC, started_at ASC
      LIMIT ?
    `,
    D1_FLUSH_BATCH_SIZE,
  );
}
/**
 * Writes page views to D1 in one batch. Whether it did: a single page view
 * that failed has the failure counted.
 */
async function writeVisits(
  context: IngestFlushContext,
  rows: readonly BufferedVisitFlushRow[],
): Promise<boolean> {
  try {
    const sitePks = new Map<string, number>();
    for (const row of rows) {
      if (!sitePks.has(row.siteId)) {
        sitePks.set(row.siteId, await resolveSitePk(context, row.siteId));
      }
    }
    await context.db.batch(prepareVisitStatements(rows, sitePks, Date.now()));
  } catch (error) {
    if (error instanceof D1QueryBudgetExceededError) throw error;
    if (rows.length > 1) {
      context.observability?.error("do.flush.visit_batch_failed");
      return false;
    }
    context.observability?.error("do.flush.visit_failed");
    context.sqlRun(
      `
        UPDATE buffered_visits
        SET flush_attempts = flush_attempts + 1, last_flush_error = ?
        WHERE visit_id = ?
      `,
      clampString(String(error instanceof Error ? error.message : error), 400),
      rows[0]!.visitId,
    );
    return false;
  }
  recordFlushCounter(context, "flushedVisits", rows.length);
  // A row changed while D1 wrote it keeps its new revision and stays dirty.
  context.sqlRun(
    `
      UPDATE buffered_visits
      SET dirty = 0, flush_attempts = 0, last_flush_error = NULL
      WHERE (visit_id, buffer_revision) IN (
        SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]')
        FROM json_each(?)
      )
    `,
    JSON.stringify(rows.map((row) => [row.visitId, row.bufferRevision])),
  );
  return true;
}
/**
 * The page views' writes, then a statement per site and UTC day they start
 * on that marks the day for the rollup task if it is already rolled up (only
 * for a day that could be), then one statement for their custom properties
 * if they have any.
 */
function prepareVisitStatements(
  rows: readonly BufferedVisitFlushRow[],
  sitePks: ReadonlyMap<string, number>,
  now: number,
): DatabaseStatement[] {
  const rolledUpDaysFrom = latestCompleteDay(now + ROLLUP_MARK_MARGIN_MS);
  const days = new Map<string, { sitePk: number; day: number }>();
  const properties: (string | number)[][] = [];
  const visits = rows.map((row) => ({ row, sitePk: sitePks.get(row.siteId)! }));
  for (const { row, sitePk } of visits) {
    const day = Math.floor(row.startedAt / ONE_DAY_MS);
    if (day <= rolledUpDaysFrom) days.set(`${sitePk}:${day}`, { sitePk, day });
    if (row.propertiesJson === null) continue;
    const pairs = JSON.parse(row.propertiesJson) as Record<string, string>;
    for (const [key, value] of Object.entries(pairs)) {
      properties.push([row.visitId, key, value, sitePk, row.startedAt]);
    }
  }
  return [
    ...visits.map(({ row, sitePk }) => ({
      sql: visitUpsertSql(row.status),
      bindings: visitBindings(row, sitePk),
      tag: "ingest.visits.upsert",
    })),
    ...[...days.values()].map(({ sitePk, day }) => ({
      sql: MARK_ROLLED_UP_DAY_SQL,
      bindings: [sitePk, day],
      tag: "ingest.visit_rollup_dirty_days.mark",
    })),
    ...(properties.length > 0
      ? [
          {
            sql: INSERT_VISIT_PROPERTIES_SQL,
            bindings: [JSON.stringify(properties)],
            tag: "ingest.visit_properties.insert",
          },
        ]
      : []),
  ];
}
/**
 * Writes the dirty custom events whose page view is in D1: one the buffer
 * holds clean. The others wait for their page view.
 */
async function flushCustomEvents(context: IngestFlushContext): Promise<void> {
  for (;;) {
    const rows = context.sqlAll<BufferedCustomEventRow>(
      `
        SELECT
          e.event_id AS eventId,
          e.site_id AS siteId,
          e.visit_id AS visitId,
          e.occurred_at AS occurredAt,
          e.received_at AS receivedAt,
          e.sequence,
          e.event_name AS eventName,
          e.event_data_json AS eventDataJson,
          e.revenue_amount AS revenueAmount,
          e.revenue_currency AS revenueCurrency,
          e.dirty,
          e.flush_attempts AS flushAttempts,
          e.created_at AS createdAt
        FROM buffered_custom_events e
        WHERE e.dirty = 1
          AND EXISTS (
            SELECT 1
            FROM buffered_visits v
            WHERE v.visit_id = e.visit_id
              AND v.site_id = e.site_id
              AND v.dirty = 0
          )
        ORDER BY e.flush_attempts ASC, e.occurred_at ASC
        LIMIT ?
      `,
      CUSTOM_EVENT_PAGE_SIZE,
    );
    if (rows.length === 0) return;
    for (const row of rows) {
      if (!(await flushCustomEventRow(context, row))) return;
    }
  }
}
/**
 * Deletes what the buffer no longer needs: finished page views once a new
 * one can't join their session (a timed-out one at once, one that ended
 * hidden after the visit timeout, as a late event may still need its
 * context), written custom events after the same retention, and custom
 * events whose page view never arrived.
 */
export async function cleanupBufferedRows(
  context: IngestFlushContext,
): Promise<void> {
  const now = Date.now();
  const deletedVisits = context.sqlRun(
    `
      DELETE FROM buffered_visits
      WHERE dirty = 0
        AND status NOT IN ('open', 'hidden_pending')
        AND (
          status = 'timeout'
          OR COALESCE(finalized_at, ended_at, started_at) < CASE
            WHEN COALESCE(duration_source, '') = 'hidden'
              OR COALESCE(exit_reason, '') = 'hidden_timeout'
              THEN ?
            ELSE ?
          END
        )
    `,
    now - VISIT_TIMEOUT_MS,
    now - FLUSHED_BUFFER_RETENTION_MS,
  );
  if (deletedVisits > 0) {
    context.observability?.info("do.cleanup.visit_rows_deleted");
  }
  const deletedEvents = context.sqlRun(
    `
      DELETE FROM buffered_custom_events
      WHERE dirty = 0
        AND occurred_at < ?
    `,
    now - FLUSHED_BUFFER_RETENTION_MS,
  );
  if (deletedEvents > 0) {
    context.observability?.info("do.cleanup.custom_event_rows_deleted");
  }
  await cleanupOrphanedCustomEvents(context, now);
}
/**
 * Finishes the page views whose time is up: hidden ones the visitor didn't
 * come back to, and open ones without activity for the visit timeout.
 */
export async function finalizeDueVisits(
  context: IngestFlushContext,
): Promise<void> {
  const now = Date.now();
  await finalizeHiddenVisits(context, now);
  const rows = context.sqlAll<FinishedVisitCandidate>(
    `
      SELECT ${FINISHED_VISIT_CANDIDATE_COLUMNS}
      FROM buffered_visits
      WHERE (
          status = 'open'
          OR (status = 'hidden_pending' AND hidden_at IS NULL)
        )
        AND last_activity_at <= ?
    `,
    now - VISIT_TIMEOUT_MS,
  );
  if (rows.length > 0) {
    context.observability?.info("do.timeout_visits_found");
  }

  for (const visit of rows) {
    const rowsWritten = context.sqlRun(
      `
        UPDATE buffered_visits
        SET status = 'timeout',
            last_activity_at = ?,
            hidden_at = NULL,
            ended_at = ?,
            finalized_at = ?,
            duration_ms = NULL,
            duration_source = 'timeout',
            dirty = 1,
            updated_at = ?,
            buffer_revision = buffer_revision + 1
        WHERE site_id = ?
          AND visit_id = ?
          AND (status = 'open' OR (status = 'hidden_pending' AND hidden_at IS NULL))
      `,
      now,
      now,
      now,
      toUnixSeconds(now),
      visit.siteId,
      visit.visitId,
    );
    if (rowsWritten === 0) continue;
    if (!context.hasOpenVisitsForVisitor(visit.siteId, visit.visitorId)) {
      await pushFinalizedVisitRealtimeEvent(
        context,
        visit,
        now,
        null,
        "timeout",
        "timeout",
      );
    }
  }
}
async function finalizeHiddenVisits(
  context: IngestFlushContext,
  now: number,
): Promise<void> {
  const rows = context.sqlAll<FinishedVisitCandidate>(
    `
      SELECT ${FINISHED_VISIT_CANDIDATE_COLUMNS}
      FROM buffered_visits
      WHERE status = 'hidden_pending'
        AND hidden_at IS NOT NULL
        AND hidden_at <= ?
    `,
    now - HIDDEN_LEAVE_GRACE_MS,
  );
  if (rows.length > 0) {
    context.observability?.info("do.hidden_fallbacks_found");
  }

  for (const visit of rows) {
    const hiddenAt = Math.max(visit.hiddenAt ?? now, visit.startedAt);
    const durationMs = engagedDurationMs({
      startedAt: visit.startedAt,
      endAt: hiddenAt,
      hiddenAt,
      hiddenMs: visit.hiddenMs,
    });
    const rowsWritten = context.sqlRun(
      `
        UPDATE buffered_visits
        SET status = 'complete',
            last_activity_at = ?,
            hidden_at = NULL,
            ended_at = ?,
            finalized_at = ?,
            duration_ms = ?,
            duration_source = 'hidden',
            exit_reason = 'hidden_timeout',
            dirty = 1,
            updated_at = ?,
            buffer_revision = buffer_revision + 1
        WHERE site_id = ? AND visit_id = ? AND status = 'hidden_pending'
      `,
      hiddenAt,
      hiddenAt,
      hiddenAt,
      durationMs,
      toUnixSeconds(now),
      visit.siteId,
      visit.visitId,
    );
    if (rowsWritten === 0) continue;
    if (!context.hasOpenVisitsForVisitor(visit.siteId, visit.visitorId)) {
      await pushFinalizedVisitRealtimeEvent(
        context,
        visit,
        hiddenAt,
        durationMs,
        "hidden",
        "hidden_timeout",
      );
    }
  }
}
/**
 * Custom events whose page view the buffer hasn't held for the visit
 * timeout: one whose page view D1 has gets it back, so the event flushes;
 * the others are deleted.
 */
async function cleanupOrphanedCustomEvents(
  context: IngestFlushContext,
  now: number,
): Promise<void> {
  let deleted = 0;
  for (;;) {
    const rows = context.sqlAll<{
      eventId: string;
      siteId: string;
      visitId: string;
    }>(
      `
        SELECT
          e.event_id AS eventId,
          e.site_id AS siteId,
          e.visit_id AS visitId
        FROM buffered_custom_events e
        WHERE e.dirty = 1
          AND e.occurred_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM buffered_visits v
            WHERE v.site_id = e.site_id
              AND v.visit_id = e.visit_id
          )
        ORDER BY e.occurred_at ASC, e.created_at ASC
        LIMIT ?
      `,
      now - ORPHAN_CUSTOM_EVENT_TIMEOUT_MS,
      CUSTOM_EVENT_PAGE_SIZE,
    );
    if (rows.length === 0) break;
    for (const row of rows) {
      const persistedVisit = await context.readPersistedVisitRow(
        row.siteId,
        row.visitId,
      );
      if (persistedVisit) {
        context.insertBufferedVisitRow(persistedVisit);
        continue;
      }
      // Its page view may have arrived while D1 was asked for it.
      deleted += context.sqlRun(
        `
          DELETE FROM buffered_custom_events
          WHERE event_id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM buffered_visits v
              WHERE v.site_id = buffered_custom_events.site_id
                AND v.visit_id = buffered_custom_events.visit_id
            )
        `,
        row.eventId,
      );
    }
  }
  if (deleted > 0) {
    context.observability?.warn("do.cleanup.orphan_custom_events_deleted");
  }
}
