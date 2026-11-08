import type { DatabaseRuntime } from "@/lib/db";
import { SITE_PK_FROM_SITE_ID_SQL } from "@/lib/edge/sites/identity-sql";
import type {
  NormalizedCustomEvent,
  NormalizedPageview,
} from "@/lib/edge/types";

import { SESSION_WINDOW_MS } from "./constants";
import { toUnixSeconds } from "./time";
import type {
  BufferedCustomEventInput,
  BufferedVisitRow,
  RecentVisitorSession,
  SqlWriter,
  StoredOpenVisit,
  VisitRow,
} from "./types";
/**
 * A page view's context for a custom event, from the buffer or, for one the
 * buffer no longer holds, from D1 (which the buffer then keeps again).
 */
export async function getVisitContext(
  sql: SqlWriter,
  db: DatabaseRuntime,
  siteId: string,
  visitId: string,
): Promise<StoredOpenVisit | null> {
  let row = readVisitRow(sql, siteId, visitId);
  if (!row) {
    const persisted = await readPersistedVisitRow(db, siteId, visitId);
    if (persisted) {
      insertBufferedVisitRow(sql, persisted);
      // Do not return the D1 snapshot after a raced INSERT ... DO NOTHING:
      // another invocation may already have a newer local business state.
      row = readVisitRow(sql, siteId, visitId) ?? persisted;
    }
  }
  if (!row) return null;
  return {
    siteId: row.siteId,
    visitId: row.visitId,
    visitorId: row.visitorId,
    sessionId: row.sessionId,
    startedAt: row.startedAt,
    lastActivityAt: row.lastActivityAt,
    pathname: row.pathname,
    queryString: row.queryString,
    hashFragment: row.hashFragment,
    hostname: row.hostname,
    title: row.title,
    referrerUrl: row.referrerUrl,
    referrerHost: row.referrerHost,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmTerm: row.utmTerm,
    utmContent: row.utmContent,
    isEU: row.isEU === 1,
    country: row.country,
    region: row.region,
    regionCode: row.regionCode,
    city: row.city,
    continent: row.continent,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    browser: row.browser,
    browserVersion: row.browserVersion,
    os: row.os,
    osVersion: row.osVersion,
    deviceType: row.deviceType,
    screenWidth: row.screenWidth,
    screenHeight: row.screenHeight,
    language: row.language,
  };
}
/**
 * The visitor's session a page view starting at `startedAt` continues: one
 * with activity in the last 30 minutes. The buffer keeps every finished page
 * view that long (FLUSHED_BUFFER_RETENTION_MS), so it holds every session a
 * page view can still join and D1 is never asked.
 */
export function findRecentVisitorSession(
  context: Pick<SqlWriter, "sqlOne">,
  input: {
    siteId: string;
    visitorId: string;
    visitId: string;
    startedAt: number;
    routePreviousHostname?: string;
    routePreviousPathname?: string;
    routePreviousQueryString?: string;
    routePreviousHashFragment?: string;
  },
): RecentVisitorSession | null {
  const routeMatchEnabled =
    input.routePreviousHostname && input.routePreviousPathname ? 1 : 0;
  const routePreviousHostname = input.routePreviousHostname || "";
  const routePreviousPathname = input.routePreviousPathname || "";
  const routePreviousQueryString = input.routePreviousQueryString || "";
  const routePreviousHashFragment = input.routePreviousHashFragment || "";
  return context.sqlOne<RecentVisitorSession>(
    `
      SELECT
        session_id AS sessionId,
        visit_id AS visitId,
        status,
        CASE
          WHEN ? = 1
            AND status IN ('open', 'hidden_pending')
            AND hostname = ?
            AND pathname = ?
            AND query_string = ?
            AND hash_fragment = ?
            THEN 2
          WHEN ? = 1
            AND status IN ('open', 'hidden_pending')
            AND hostname = ?
            AND pathname = ?
            AND (query_string = ? OR query_string = '' OR ? = '')
            AND (hash_fragment = ? OR hash_fragment = '' OR ? = '')
            THEN 1
          ELSE 0
        END AS routeMatch,
        started_at AS startedAt,
        last_activity_at AS lastActivityAt,
        referrer_url AS referrerUrl,
        referrer_host AS referrerHost,
        utm_source AS utmSource,
        utm_medium AS utmMedium,
        utm_campaign AS utmCampaign,
        utm_term AS utmTerm,
        utm_content AS utmContent
      FROM buffered_visits
      WHERE site_id = ?
        AND visitor_id = ?
        AND visit_id != ?
        AND session_id != ''
        AND last_activity_at >= ?
      ORDER BY
        routeMatch DESC,
        CASE WHEN status IN ('open', 'hidden_pending') THEN 0 ELSE 1 END,
        last_activity_at DESC,
        started_at DESC
      LIMIT 1
    `,
    routeMatchEnabled,
    routePreviousHostname,
    routePreviousPathname,
    routePreviousQueryString,
    routePreviousHashFragment,
    routeMatchEnabled,
    routePreviousHostname,
    routePreviousPathname,
    routePreviousQueryString,
    routePreviousQueryString,
    routePreviousHashFragment,
    routePreviousHashFragment,
    input.siteId,
    input.visitorId,
    input.visitId,
    input.startedAt - SESSION_WINDOW_MS,
  );
}
export function readVisitRow(
  context: Pick<SqlWriter, "sqlOne">,
  siteId: string,
  visitId: string,
): VisitRow | null {
  return context.sqlOne<VisitRow>(
    `
      SELECT
        visit_id AS visitId,
        status,
        site_id AS siteId,
        visitor_id AS visitorId,
        session_id AS sessionId,
        started_at AS startedAt,
        last_activity_at AS lastActivityAt,
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
        language
      FROM buffered_visits
      WHERE site_id = ? AND visit_id = ?
      LIMIT 1
    `,
    siteId,
    visitId,
  );
}
/** A page view the buffer no longer holds, read back from D1, clean. */
export async function readPersistedVisitRow(
  db: DatabaseRuntime,
  siteId: string,
  visitId: string,
): Promise<BufferedVisitRow | null> {
  const row = await db.first<BufferedVisitRow>({
    sql: `
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
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM visits
      WHERE site_pk = ${SITE_PK_FROM_SITE_ID_SQL} AND visit_id = ?
      LIMIT 1
    `,
    bindings: [siteId, visitId],
    tag: "ingest.visits.find_persisted",
  });

  return row
    ? {
        ...row,
        dirty: 0,
        flushAttempts: 0,
        hiddenAt: null,
        lastFlushError: null,
        bufferRevision: 1,
      }
    : null;
}
export function insertBufferedVisitRow(
  context: Pick<SqlWriter, "sqlRun">,
  row: BufferedVisitRow,
): void {
  const bindings: Array<string | number | null> = [
    row.visitId,
    row.siteId,
    row.visitorId,
    row.sessionId,
    row.status,
    row.startedAt,
    row.lastActivityAt,
    row.hiddenAt ?? null,
    row.endedAt,
    row.finalizedAt,
    row.durationMs,
    row.scrollDepth,
    row.durationSource || null,
    row.exitReason || null,
    row.pathname,
    row.queryString,
    row.hashFragment,
    row.hostname,
    row.title,
    row.referrerUrl,
    row.referrerHost,
    row.utmSource,
    row.utmMedium,
    row.utmCampaign,
    row.utmTerm,
    row.utmContent,
    row.isEU,
    row.country,
    row.region,
    row.regionCode,
    row.city,
    row.continent,
    row.latitude,
    row.longitude,
    row.timezone,
    row.browser,
    row.browserVersion,
    row.os,
    row.osVersion,
    row.deviceType,
    row.screenWidth,
    row.screenHeight,
    row.language,
    row.dirty,
    row.flushAttempts,
    row.lastFlushError ?? null,
    row.bufferRevision,
    row.createdAt,
    row.updatedAt,
  ];
  context.sqlRun(
    `
      INSERT INTO buffered_visits (
        visit_id, site_id, visitor_id, session_id, status, started_at, last_activity_at,
        hidden_at, ended_at, finalized_at, duration_ms, scroll_depth, duration_source, exit_reason,
        pathname, query_string, hash_fragment, hostname, title, referrer_url, referrer_host,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        is_eu, country, region, region_code, city, continent, latitude, longitude,
        timezone, browser, browser_version,
        os, os_version, device_type, screen_width, screen_height, language,
        dirty, flush_attempts, last_flush_error, buffer_revision, created_at, updated_at
      ) VALUES (${bindings.map(() => "?").join(", ")})
      ON CONFLICT(visit_id) DO NOTHING
    `,
    ...bindings,
  );
}
/** Buffers a new page view, dirty. Whether it was new. */
export function insertVisit(
  context: Pick<SqlWriter, "sqlRun">,
  record: NormalizedPageview,
): boolean {
  const createdAt = toUnixSeconds(record.receivedAt);
  const bindings: Array<string | number | null> = [
    record.visitId,
    record.siteId,
    record.visitorId,
    record.sessionId,
    "open",
    record.startedAt,
    record.startedAt,
    record.pathname,
    record.queryString,
    record.hashFragment,
    record.hostname,
    record.title,
    record.referrerUrl,
    record.referrerHost,
    record.utmSource,
    record.utmMedium,
    record.utmCampaign,
    record.utmTerm,
    record.utmContent,
    record.isEU ? 1 : 0,
    record.country,
    record.region,
    record.regionCode,
    record.city,
    record.continent,
    record.latitude,
    record.longitude,
    record.timezone,
    record.browser,
    record.browserVersion,
    record.os,
    record.osVersion,
    record.deviceType,
    record.screenWidth,
    record.screenHeight,
    record.language,
    Object.keys(record.properties).length > 0
      ? JSON.stringify(record.properties)
      : null,
    createdAt,
    createdAt,
  ];
  const rowsWritten = context.sqlRun(
    `
      INSERT INTO buffered_visits (
          visit_id, site_id, visitor_id, session_id, status, started_at, last_activity_at,
          pathname, query_string, hash_fragment, hostname, title, referrer_url, referrer_host,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          is_eu, country, region, region_code, city, continent, latitude, longitude,
          timezone, browser, browser_version,
          os, os_version, device_type, screen_width, screen_height, language,
          properties_json, created_at, updated_at
        ) VALUES (${bindings.map(() => "?").join(", ")})
        ON CONFLICT(visit_id) DO NOTHING
      `,
    ...bindings,
  );
  return rowsWritten > 0;
}
export function insertCustomEvent(
  context: Pick<SqlWriter, "sqlRun">,
  record: NormalizedCustomEvent,
): boolean {
  return insertBufferedCustomEvent(context, {
    eventId: record.eventId,
    siteId: record.siteId,
    visitId: record.visitId,
    occurredAt: record.eventAt,
    receivedAt: record.receivedAt,
    sequence: record.sequence,
    eventName: record.eventName,
    eventDataJson: record.eventDataJson,
    revenueAmount: record.revenueAmount,
    revenueCurrency: record.revenueCurrency,
  });
}
/**
 * Buffers a custom event, dirty. The alarm writes it once its page view is
 * in D1. Whether it was new.
 */
export function insertBufferedCustomEvent(
  context: Pick<SqlWriter, "sqlRun">,
  record: BufferedCustomEventInput,
): boolean {
  const rowsWritten = context.sqlRun(
    `
      INSERT INTO buffered_custom_events (
        event_id, site_id, visit_id, occurred_at, received_at, sequence,
        event_name, event_data_json, revenue_amount, revenue_currency,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO NOTHING
    `,
    record.eventId,
    record.siteId,
    record.visitId,
    record.occurredAt,
    record.receivedAt,
    record.sequence,
    record.eventName,
    record.eventDataJson,
    record.revenueAmount,
    record.revenueCurrency,
    toUnixSeconds(record.receivedAt),
  );
  return rowsWritten > 0;
}
/**
 * A custom event's activity on its open page view. Only the buffer keeps
 * it, for the realtime view and the visit timeout: D1 receives the page
 * view's state when it ends.
 */
export function updateOpenVisitActivity(
  context: Pick<SqlWriter, "sqlRun">,
  visitId: string,
  eventAt: number,
): void {
  context.sqlRun(
    `
      UPDATE buffered_visits
      SET last_activity_at = ?,
          updated_at = ?
      WHERE visit_id = ?
        AND status = 'open'
        AND last_activity_at < ?
    `,
    eventAt,
    toUnixSeconds(Date.now()),
    visitId,
    eventAt,
  );
}
/** Whether the visitor has another page view open, so presence stays. */
export function hasOpenVisitsForVisitor(
  context: Pick<SqlWriter, "sqlOne">,
  siteId: string,
  visitorId: string,
): boolean {
  const row = context.sqlOne<{ ok: number }>(
    `
      SELECT 1 AS ok
      FROM buffered_visits
      WHERE site_id = ?
        AND visitor_id = ?
        AND status = 'open'
      LIMIT 1
    `,
    siteId,
    visitorId,
  );
  return row !== null;
}
