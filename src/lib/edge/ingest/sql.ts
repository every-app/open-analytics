export type SqlBinding = string | number | null;

export interface VisitBindingRow {
  visitId: string;
  siteId: string;
  visitorId: string;
  sessionId: string;
  status: string;
  startedAt: number;
  lastActivityAt: number;
  endedAt: number | null;
  finalizedAt: number | null;
  durationMs: number | null;
  scrollDepth: number | null;
  durationSource: string;
  exitReason: string;
  pathname: string;
  queryString: string;
  hashFragment: string;
  hostname: string;
  title: string;
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
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
  screenWidth: number | null;
  screenHeight: number | null;
  language: string;
  createdAt: number;
  updatedAt: number;
}

export const VISIT_D1_COLUMNS = [
  "visit_id",
  "site_id",
  "site_pk",
  "visitor_id",
  "session_id",
  "status",
  "started_at",
  "last_activity_at",
  "ended_at",
  "finalized_at",
  "duration_ms",
  "scroll_depth",
  "duration_source",
  "exit_reason",
  "pathname",
  "query_string",
  "hash_fragment",
  "hostname",
  "title",
  "referrer_url",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "is_eu",
  "country",
  "region",
  "region_code",
  "city",
  "continent",
  "latitude",
  "longitude",
  "timezone",
  "browser",
  "browser_version",
  "os",
  "os_version",
  "device_type",
  "screen_width",
  "screen_height",
  "language",
  "created_at",
  "updated_at",
] as const;

const VISIT_D1_COLUMN_SQL = VISIT_D1_COLUMNS.join(", ");
const VISIT_D1_PLACEHOLDER_SQL = VISIT_D1_COLUMNS.map(() => "?").join(", ");
type VisitD1Column = (typeof VISIT_D1_COLUMNS)[number];

const ACTIVE_VISIT_UPDATE_COLUMNS = [
  "status",
  "last_activity_at",
  "scroll_depth",
] as const satisfies readonly VisitD1Column[];

const FINALIZED_VISIT_UPDATE_COLUMNS = [
  "status",
  "last_activity_at",
  "ended_at",
  "finalized_at",
  "duration_ms",
  "scroll_depth",
  "duration_source",
  "exit_reason",
] as const satisfies readonly VisitD1Column[];

function buildVisitUpsertSql(
  updateColumns: readonly VisitD1Column[],
  conflictGuard?: string,
): string {
  const assignments = updateColumns
    .map((column) => `    ${column} = excluded.${column}`)
    .join(",\n");
  const changes = updateColumns
    .map((column) => `      visits.${column} IS NOT excluded.${column}`)
    .join("\n      OR ");
  const where = conflictGuard
    ? `    ${conflictGuard}\n    AND (\n${changes}\n    )`
    : changes;

  return `
  INSERT INTO visits (${VISIT_D1_COLUMN_SQL})
  VALUES (${VISIT_D1_PLACEHOLDER_SQL})
  ON CONFLICT(visit_id) DO UPDATE SET
${assignments},
    updated_at = excluded.updated_at
  WHERE
${where}
`;
}

export const INSERT_VISIT_SQL = `
  INSERT OR IGNORE INTO visits (${VISIT_D1_COLUMN_SQL})
  VALUES (${VISIT_D1_PLACEHOLDER_SQL})
`;

/**
 * A visit's flush statement: it inserts the full row, while an existing row
 * only receives lifecycle changes.
 */
export const UPSERT_ACTIVE_VISIT_SQL = buildVisitUpsertSql(
  ACTIVE_VISIT_UPDATE_COLUMNS,
  "visits.status IN ('open', 'hidden_pending')",
);

export const UPSERT_FINALIZED_VISIT_SQL = buildVisitUpsertSql(
  FINALIZED_VISIT_UPDATE_COLUMNS,
);

export function visitUpsertSql(status: string): string {
  return status === "open" || status === "hidden_pending"
    ? UPSERT_ACTIVE_VISIT_SQL
    : UPSERT_FINALIZED_VISIT_SQL;
}

/**
 * Records a UTC day (?2) of a site (?1) for the rollup task to rebuild when
 * that day is already rolled up. It runs in the same D1 batch as the write
 * of a page view started that day, so the record can't be lost.
 */
export const MARK_ROLLED_UP_DAY_SQL = `
  INSERT OR IGNORE INTO visit_rollup_dirty_days (site_pk, day)
  SELECT site_pk, ?2 FROM visit_rollup_state
  WHERE site_pk = ?1 AND ?2 BETWEEN first_day AND last_day
`;

/**
 * Page views' custom properties, from one JSON array (?1) of
 * [visit_id, key, value, site_pk, started_at] rows. A page view is flushed
 * again on each change of its state; its properties never change, so a
 * flush after the first adds nothing.
 */
export const INSERT_VISIT_PROPERTIES_SQL = `
  INSERT OR IGNORE INTO visit_properties (visit_id, key, value, site_pk, started_at)
  SELECT
    json_extract(property.value, '$[0]'),
    json_extract(property.value, '$[1]'),
    json_extract(property.value, '$[2]'),
    json_extract(property.value, '$[3]'),
    json_extract(property.value, '$[4]')
  FROM json_each(?1) AS property
`;

export const CREATE_BUFFERED_CUSTOM_EVENTS_SQL = `
  CREATE TABLE IF NOT EXISTS buffered_custom_events (
    event_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    visit_id TEXT NOT NULL,
    occurred_at INTEGER NOT NULL,
    received_at INTEGER NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    event_name TEXT NOT NULL,
    event_data_json TEXT NOT NULL DEFAULT '{}',
    revenue_amount REAL,
    revenue_currency TEXT,
    dirty INTEGER NOT NULL DEFAULT 1,
    flush_attempts INTEGER NOT NULL DEFAULT 0,
    last_flush_error TEXT,
    created_at INTEGER NOT NULL
  )
`;

export function visitBindings(
  row: VisitBindingRow,
  sitePk: number | null = null,
): SqlBinding[] {
  return [
    row.visitId,
    row.siteId,
    sitePk,
    row.visitorId,
    row.sessionId,
    row.status,
    row.startedAt,
    row.lastActivityAt,
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
    row.createdAt,
    row.updatedAt,
  ];
}
