import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import type { Env } from "@/lib/edge/types";

import type {
  EventRecordRow,
  EventRecordSortKey,
  FilterDocument,
  ListSort,
  QueryWindow,
} from "./core";
import {
  buildEventAnalyticsSourceCte,
  buildEventFilterSql,
  buildVisitSourceCte,
  eventRecordOrderBy,
  eventSourceBindings,
  queryD1All,
  visitSourceBindings,
} from "./core";
import type { ScopedDatasetSql } from "./scoped-dataset";
import { scopedDatasetFor } from "./scoped-dataset";
// Event-record lists only need this projection for their output, filters, and
// cursor predicates. Keeping it explicit prevents the shared analytics source
// from carrying unrelated visit columns through every page query.
const EVENT_RECORD_BASE_SOURCE_COLUMNS = [
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
const EVENT_RECORD_FILTER_SOURCE_COLUMNS: Readonly<
  Record<string, readonly string[]>
> = {
  "page.query": ["v.query_string"],
  "page.hash": ["v.hash_fragment"],
  "referrer.url": ["v.referrer_url"],
  "utm.source": ["v.utm_source"],
  "utm.medium": ["v.utm_medium"],
  "utm.campaign": ["v.utm_campaign"],
  "utm.term": ["v.utm_term"],
  "utm.content": ["v.utm_content"],
  "traffic.channel": ["v.channel"],
  "client.language": ["v.language"],
  "client.screenSize": ["v.screen_width", "v.screen_height"],
  "geo.city": ["v.city"],
  "geo.continent": ["v.continent"],
  "geo.timeZone": ["v.timezone"],
};
function eventRecordSourceColumns(filters: FilterDocument): string {
  const columns = new Set<string>(EVENT_RECORD_BASE_SOURCE_COLUMNS);
  const collect = (expression: FilterDocument["root"]): void => {
    if (!expression) return;
    if (expression.kind === "condition") {
      if (expression.target.kind === "field") {
        for (const column of EVENT_RECORD_FILTER_SOURCE_COLUMNS[
          expression.target.field
        ] ?? []) {
          columns.add(column);
        }
      }
      return;
    }
    if (expression.kind === "not") {
      collect(expression.child);
      return;
    }
    for (const child of expression.children) collect(child);
  };
  collect(filters.root);
  return [...columns].join(",\n    ");
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
  filterClause: string,
  cursorClause: string,
  sort: ListSort<EventRecordSortKey>,
  sourceColumns: string,
  eventName?: string,
  scopedDataset?: ScopedDatasetSql | null,
): string {
  return `
WITH
${
  scopedDataset
    ? scopedDataset.ctes
    : `${buildVisitSourceCte()},
${buildEventAnalyticsSourceCte({
  eventName,
  selectColumns: sourceColumns,
})}`
}
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
FROM ${scopedDataset?.eventRelation ?? "event_source"} es
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
  const scopedDataset = scopedDatasetFor(siteId, window, filters);
  const filter = buildEventFilterSql(
    scopedDataset ? EMPTY_FILTER_DOCUMENT : filters,
    "es",
    {
      search: options.search,
    },
  );
  const eventNameClause =
    scopedDataset && eventName
      ? `${filter.clause ? " AND" : "WHERE"} TRIM(COALESCE(es.event_name, '')) = ?`
      : "";
  const cursor = options.cursor
    ? eventRecordCursorFilter(options.cursor, options.sort)
    : { clause: "", bindings: [] };
  const rows = await queryD1All<EventRecordCursorRow>(
    env,
    eventRecordsSql(
      `${filter.clause}${eventNameClause}`,
      cursor.clause,
      options.sort,
      eventRecordSourceColumns(filters),
      eventName,
      scopedDataset,
    ),
    [
      ...(scopedDataset
        ? scopedDataset.bindings.map((binding) => binding.value)
        : [
            ...visitSourceBindings(siteId, window),
            ...eventSourceBindings(siteId, window, eventName),
          ]),
      ...filter.bindings,
      ...(scopedDataset && eventName ? [eventName] : []),
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
