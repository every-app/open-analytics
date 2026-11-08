import type { Env } from "@/lib/edge/types";

import type {
  EventRecordRow,
  EventRecordSortKey,
  FilterDocument,
  ListSort,
  QueryWindow,
} from "./core";
import { eventRecordOrderBy, filteredEventsCte, queryD1All } from "./core";
// Event-record lists only need this projection for their output, search and
// cursor predicates.
const EVENT_RECORD_SOURCE_COLUMNS = [
  "ce.event_pk",
  "ce.event_id",
  "ce.site_pk",
  "ce.visit_id",
  "cen.name AS event_name",
  "ce.occurred_at",
  "ce.received_at",
  "ce.sequence",
  "ce.node_count",
  "ce.value_count",
  "v.visitor_id",
  "v.session_id",
  "v.pathname",
  "v.hostname",
  "v.title",
  "v.referrer_host",
  "v.country",
  "v.region",
  "v.city",
  "v.browser",
  "v.browser_version",
  "v.os",
  "v.os_version",
  "v.device_type",
] as const;
const SEARCHED_COLUMNS = [
  "event_name",
  "event_id",
  "visit_id",
  "session_id",
  "visitor_id",
  "pathname",
  "title",
  "hostname",
] as const;
/** Events whose name, ids or page contain the search text, ignoring case. */
function searchClause(search: string | undefined) {
  if (!search) return { clause: "", bindings: [] as string[] };
  const escaped = search
    .toLowerCase()
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
  return {
    clause: `WHERE (${SEARCHED_COLUMNS.map(
      (column) => `LOWER(TRIM(COALESCE(es.${column}, ''))) LIKE ? ESCAPE '\\'`,
    ).join(" OR ")})`,
    bindings: SEARCHED_COLUMNS.map(() => `%${escaped}%`),
  };
}
export interface EventRecordCursor {
  readonly sortValue?: string | number;
  occurredAt: number;
  eventId: string;
  eventPk: number;
}
interface EventRecordCursorRow extends EventRecordRow {
  eventPk: number;
}
export interface EventRecordPage {
  rows: EventRecordRow[];
  nextCursor: EventRecordCursor | null;
}
function eventRecordCursorFromRow(
  row: EventRecordCursorRow,
  sort: ListSort<EventRecordSortKey>,
): EventRecordCursor {
  return sort.key === "occurredAt"
    ? {
        occurredAt: row.occurredAt,
        eventId: row.eventId,
        eventPk: row.eventPk,
      }
    : {
        sortValue: sort.key === "eventName" ? row.eventName : row.pathname,
        occurredAt: row.occurredAt,
        eventId: row.eventId,
        eventPk: row.eventPk,
      };
}
function eventRecordCursorFilter(
  cursor: EventRecordCursor,
  sort: ListSort<EventRecordSortKey>,
): { clause: string; bindings: Array<string | number> } {
  if (sort.key === "occurredAt") {
    const operator = sort.direction === "asc" ? ">" : "<";
    return {
      clause: `
        AND (
          occurred_at ${operator} ?
          OR (
            occurred_at = ? AND (
              event_id ${operator} ?
              OR (event_id = ? AND event_pk ${operator} ?)
            )
          )
        )`,
      bindings: [
        cursor.occurredAt,
        cursor.occurredAt,
        cursor.eventId,
        cursor.eventId,
        cursor.eventPk,
      ],
    };
  }

  const primaryColumn = sort.key === "eventName" ? "event_name" : "pathname";
  const primaryOperator = sort.direction === "asc" ? ">" : "<";
  return {
    clause: `
      AND (
        ${primaryColumn} ${primaryOperator} ?
        OR (
          ${primaryColumn} = ? AND (
            occurred_at < ?
            OR (
              occurred_at = ? AND (
                event_id < ?
                OR (event_id = ? AND event_pk < ?)
              )
            )
          )
        )
      )`,
    bindings: [
      cursor.sortValue!,
      cursor.sortValue!,
      cursor.occurredAt,
      cursor.occurredAt,
      cursor.eventId,
      cursor.eventId,
      cursor.eventPk,
    ],
  };
}
function eventRecordsSql(
  source: string,
  filterClause: string,
  cursorClause: string,
  sort: ListSort<EventRecordSortKey>,
): string {
  return `
WITH
${source}
SELECT
  event_pk AS eventPk,
  event_id AS eventId,
  event_name AS eventName,
  occurred_at AS occurredAt,
  received_at AS receivedAt,
  sequence,
  visit_id AS visitId,
  session_id AS sessionId,
  visitor_id AS visitorId,
  pathname,
  title,
  hostname,
  referrer_host AS referrerHost,
  country,
  region,
  city,
  browser,
  browser_version AS browserVersion,
  os,
  os_version AS osVersion,
  device_type AS deviceType,
  node_count AS nodeCount,
  value_count AS valueCount
FROM filtered_events es
${filterClause || "WHERE 1 = 1"}
${cursorClause}
ORDER BY ${eventRecordOrderBy(sort)}
LIMIT ?
`;
}
function withoutEventPk(row: EventRecordCursorRow): EventRecordRow {
  const { eventPk: _eventPk, ...event } = row;
  return event;
}
export async function queryEventRecordPageFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  options: {
    limit: number;
    sort: ListSort<EventRecordSortKey>;
    search?: string;
    eventName?: string;
    cursor?: EventRecordCursor | null;
  },
): Promise<EventRecordPage> {
  const eventName = options.eventName?.trim() || undefined;
  const source = filteredEventsCte(siteId, window, filters, {
    ...(eventName === undefined ? {} : { eventName }),
    columns: EVENT_RECORD_SOURCE_COLUMNS.join(",\n    "),
  });
  const search = searchClause(options.search);
  const cursor = options.cursor
    ? eventRecordCursorFilter(options.cursor, options.sort)
    : { clause: "", bindings: [] };
  const rows = await queryD1All<EventRecordCursorRow>(
    env,
    eventRecordsSql(source.sql, search.clause, cursor.clause, options.sort),
    [
      ...source.bindings,
      ...search.bindings,
      ...cursor.bindings,
      options.limit + 1,
    ],
  );
  const hasMore = rows.length > options.limit;
  const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
  const lastRow = pageRows.at(-1);
  return {
    rows: pageRows.map(withoutEventPk),
    nextCursor:
      hasMore && lastRow
        ? eventRecordCursorFromRow(lastRow, options.sort)
        : null,
  };
}
