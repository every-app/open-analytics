import { propertyKeyOf } from "@/lib/analytics/property-path";
import { browserEngineCaseSql } from "@/lib/browser-engine";
import {
  concat,
  join,
  parameter,
  parenthesize,
  type SqlFragment,
  text,
} from "@/lib/db/sql/fragment";
import {
  analyticsFilterDefinition,
  type FilterColumnStrategy,
  FilterFieldSource,
  FilterTextComparison,
  matchesOnlyCustomEvents,
  matchesOnlyProperties,
  type RegisteredFilterField,
} from "@/lib/filter-contract/filter-registry";
import {
  type FilterCondition,
  type FilterDocument,
  FilterOperator,
  type FilterValue,
  NEGATED_FILTER_OPERATORS,
  targetFieldId,
} from "@/lib/filter-contract/filters";

import { DIRECT_REFERRER_FILTER_VALUE } from "./core-types";

/** What a filtered read covers: one site's rows in the query window. */
export interface FilterSqlScope {
  readonly siteId: string;
  readonly startMs: number;
  readonly endExclusiveMs: number;
}

const COLUMN_STRATEGY_COLUMNS: Readonly<Record<FilterColumnStrategy, string>> =
  {
    "column.pathname": "pathname",
    "column.title": "title",
    "column.hostname": "hostname",
    "column.query_string": "query_string",
    "column.hash_fragment": "hash_fragment",
    "column.referrer_host": "referrer_host",
    "column.referrer_url": "referrer_url",
    "column.utm_source": "utm_source",
    "column.utm_medium": "utm_medium",
    "column.utm_campaign": "utm_campaign",
    "column.utm_term": "utm_term",
    "column.utm_content": "utm_content",
    "column.channel": "channel",
    "column.browser": "browser",
    "column.browser_version": "browser_version",
    "column.os": "os",
    "column.device_type": "device_type",
    "column.language": "language",
    "column.country": "country",
    "column.region": "region",
    "column.city": "city",
    "column.continent": "continent",
    "column.timezone": "timezone",
    "column.duration_ms": "duration_ms",
    "column.scroll_depth": "scroll_depth",
    "column.screen_width": "screen_width",
    "column.screen_height": "screen_height",
    "column.is_eu": "is_eu",
  };

const COMPARISON_SQL: Partial<Record<FilterOperator, string>> = {
  [FilterOperator.Eq]: "=",
  [FilterOperator.Neq]: "!=",
  [FilterOperator.Gt]: ">",
  [FilterOperator.Gte]: ">=",
  [FilterOperator.Lt]: "<",
  [FilterOperator.Lte]: "<=",
};

/** The operator that matches what a negated operator excludes. */
const POSITIVE_OPERATOR: Partial<Record<FilterOperator, FilterOperator>> = {
  [FilterOperator.Neq]: FilterOperator.Eq,
  [FilterOperator.NotIn]: FilterOperator.In,
  [FilterOperator.NotContains]: FilterOperator.Contains,
  [FilterOperator.NotExists]: FilterOperator.Exists,
};

function definitionOf(condition: FilterCondition): RegisteredFilterField {
  const definition = analyticsFilterDefinition(targetFieldId(condition.target));
  if (!definition) {
    throw new TypeError(
      `No filter definition for ${targetFieldId(condition.target)}.`,
    );
  }
  return definition;
}

function validAlias(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new TypeError("Filter aliases must be internal SQL identifiers.");
  }
  return value;
}

function columnExpression(field: RegisteredFilterField, visit: string): string {
  const column = (name: string) => `${visit}.${name}`;
  switch (field.compilerStrategy) {
    case "derived.browserEngine":
      return browserEngineCaseSql(column("browser"), column("os"));
    case "derived.osVersion":
      return `TRIM(CASE WHEN ${column("os")} != '' AND ${column("os_version")} != '' THEN ${column("os")} || ' ' || ${column("os_version")} WHEN ${column("os")} != '' THEN ${column("os")} WHEN ${column("os_version")} != '' THEN ${column("os_version")} ELSE '' END)`;
    case "derived.screenSize":
      return `CASE WHEN ${column("screen_width")} IS NOT NULL AND ${column("screen_height")} IS NOT NULL THEN CAST(${column("screen_width")} AS TEXT) || 'x' || CAST(${column("screen_height")} AS TEXT) ELSE '' END`;
    case "session.boundary.entry":
    case "session.boundary.exit":
    case "event.name":
    case "event.payload":
      throw new TypeError(`${field.id} is not a page view column.`);
    default:
      return column(COLUMN_STRATEGY_COLUMNS[field.compilerStrategy]);
  }
}

/** The stored value a text field compares: trimmed, and lowercased if it folds case. */
function normalizedText(field: RegisteredFilterField, expression: string) {
  if (field.valueKind === "number" || field.valueKind === "boolean")
    return expression;
  const trimmed = `TRIM(COALESCE(${expression}, ''))`;
  return field.comparison === FilterTextComparison.CaseInsensitive
    ? `LOWER(${trimmed})`
    : trimmed;
}

function binding(field: RegisteredFilterField, value: FilterValue) {
  if (value === null) {
    throw new TypeError("This SQL predicate requires a non-null value.");
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  // The dashboard's "Direct" referrer is a page view with none.
  if (field.directReferrer && value === DIRECT_REFERRER_FILTER_VALUE) return "";
  return value;
}

function valueList(
  field: RegisteredFilterField,
  values: readonly FilterValue[],
) {
  return parameter(
    JSON.stringify(values.map((value) => binding(field, value))),
  );
}

function stringMatch(
  left: string,
  operator: FilterOperator,
  value: string,
): SqlFragment {
  switch (operator) {
    case FilterOperator.Contains:
      return concat(text(`INSTR(${left}, `), parameter(value), text(") > 0"));
    case FilterOperator.NotContains:
      return concat(text(`INSTR(${left}, `), parameter(value), text(") = 0"));
    case FilterOperator.StartsWith:
      return concat(text(`INSTR(${left}, `), parameter(value), text(") = 1"));
    default:
      return value === ""
        ? text("1")
        : concat(
            text(`SUBSTR(${left}, -LENGTH(`),
            parameter(value),
            text(")) = "),
            parameter(value),
          );
  }
}

/** A comparison of a page view column, or a derived value of it. */
function comparison(
  field: RegisteredFilterField,
  source: string,
  condition: FilterCondition,
): SqlFragment {
  const { operator, value } = condition;
  const normalized = normalizedText(field, source);
  switch (operator) {
    case FilterOperator.Exists:
    case FilterOperator.NotNull:
      return text(`${source} IS NOT NULL`);
    case FilterOperator.NotExists:
    case FilterOperator.IsNull:
      return text(`${source} IS NULL`);
    case FilterOperator.IsEmpty:
      return text(`${source} IS NOT NULL AND ${source} = ''`);
    case FilterOperator.NotEmpty:
      return text(`${source} IS NOT NULL AND ${source} != ''`);
    case FilterOperator.In:
    case FilterOperator.NotIn:
      return concat(
        text(
          `${normalized} ${operator === FilterOperator.NotIn ? "NOT IN" : "IN"} (SELECT value FROM json_each(`,
        ),
        valueList(field, value as readonly FilterValue[]),
        text("))"),
      );
    case FilterOperator.Between: {
      const [lower, upper] = value as readonly FilterValue[];
      return concat(
        text(`${normalized} BETWEEN `),
        parameter(binding(field, lower!)),
        text(" AND "),
        parameter(binding(field, upper!)),
      );
    }
    case FilterOperator.Contains:
    case FilterOperator.NotContains:
    case FilterOperator.StartsWith:
    case FilterOperator.EndsWith:
      return stringMatch(normalized, operator, value as string);
    default:
      return concat(
        text(`${normalized} ${COMPARISON_SQL[operator]!} `),
        parameter(binding(field, value as FilterValue)),
      );
  }
}

/** The site's primary key, looked up in the statement from its id. */
export function sitePk(siteId: string): SqlFragment {
  return concat(
    text("(SELECT site_pk FROM site_identities WHERE site_id = "),
    parameter(siteId),
    text(")"),
  );
}

/**
 * The page views of the visit's session whose first (entry) or last (exit)
 * page matches: the session's edges among its page views in the window.
 */
function sessionBoundary(
  field: RegisteredFilterField,
  condition: FilterCondition,
  scope: FilterSqlScope,
  visit: string,
): SqlFragment {
  const order =
    field.compilerStrategy === "session.boundary.entry" ? "ASC" : "DESC";
  return concat(
    text(`${visit}.session_id IN (
    SELECT session_id FROM (
      SELECT session_id, pathname,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY started_at ${order}, visit_id ${order}) AS boundary_rank
      FROM visits
      WHERE site_pk = `),
    sitePk(scope.siteId),
    text(" AND started_at >= "),
    parameter(scope.startMs),
    text(" AND started_at < "),
    parameter(scope.endExclusiveMs),
    text(` AND session_id != ''
    ) session_edges
    WHERE boundary_rank = 1 AND `),
    comparison(field, "session_edges.pathname", condition),
    text(")"),
  );
}

function payloadValueType(value: FilterValue): number {
  if (value === null) return 0;
  if (typeof value === "string") return 1;
  if (typeof value === "number") return 2;
  return 3;
}

function payloadValueColumn(alias: string, value: FilterValue): string {
  if (typeof value === "string") return `${alias}.string_value`;
  if (typeof value === "number") return `${alias}.number_value`;
  if (typeof value === "boolean") return `${alias}.boolean_value`;
  return `${alias}.value_type`;
}

/** The custom property rows at the condition's path, as FROM and WHERE. */
interface PropertyRows {
  readonly from: string;
  readonly where: SqlFragment;
}

/** A page view's custom properties: strings at top-level paths. */
function pageViewProperties(path: string, visit: string): PropertyRows {
  const key = propertyKeyOf(path);
  return {
    from: `(SELECT visit_id, key, 1 AS value_type, value AS string_value, NULL AS number_value, NULL AS boolean_value FROM visit_properties) property_value`,
    where:
      key === null
        ? text("0")
        : concat(
            text(
              `property_value.visit_id = ${visit}.visit_id AND property_value.key = `,
            ),
            parameter(key),
          ),
  };
}

function eventPayloadValues(path: string, event: string): PropertyRows {
  return {
    from: "custom_event_json_values property_value INNER JOIN custom_event_json_paths property_path ON property_path.id = property_value.path_id",
    where: concat(
      text(
        `property_value.event_pk = ${event}.event_pk AND property_value.site_pk = ${event}.site_pk AND property_path.site_pk = ${event}.site_pk AND property_path.path = `,
      ),
      parameter(path),
    ),
  };
}

function propertyComparison(
  condition: FilterCondition,
  rows: PropertyRows,
): SqlFragment {
  const exists = (extra: SqlFragment = text("")) =>
    concat(
      text(`EXISTS (SELECT 1 FROM ${rows.from} WHERE `),
      rows.where,
      extra,
      text(")"),
    );
  const { operator, value } = condition;
  switch (operator) {
    case FilterOperator.Exists:
      return exists();
    case FilterOperator.NotExists:
      return concat(text("NOT "), exists());
    case FilterOperator.IsNull:
      return exists(text(" AND property_value.value_type = 0"));
    case FilterOperator.NotNull:
      return exists(text(" AND property_value.value_type != 0"));
    case FilterOperator.IsEmpty:
      return exists(
        text(
          " AND property_value.value_type = 1 AND property_value.string_value = ''",
        ),
      );
    case FilterOperator.NotEmpty:
      return exists(
        text(
          " AND property_value.value_type = 1 AND property_value.string_value != ''",
        ),
      );
    default:
      break;
  }
  const values = Array.isArray(value) ? value : [value as FilterValue];
  const types = new Set(values.map(payloadValueType));
  if (types.size !== 1) {
    throw new TypeError("Custom property lists need values of one JSON type.");
  }
  const type = text(` AND property_value.value_type = ${[...types][0]}`);
  const column = payloadValueColumn("property_value", values[0]!);
  const scalar = (item: FilterValue) =>
    parameter(typeof item === "boolean" ? (item ? 1 : 0) : item);
  switch (operator) {
    case FilterOperator.In:
    case FilterOperator.NotIn:
      return exists(
        concat(
          type,
          text(
            ` AND ${column} ${operator === FilterOperator.NotIn ? "NOT IN" : "IN"} (SELECT value FROM json_each(`,
          ),
          parameter(
            JSON.stringify(
              values.map((item) =>
                typeof item === "boolean" ? (item ? 1 : 0) : item,
              ),
            ),
          ),
          text("))"),
        ),
      );
    case FilterOperator.Between:
      return exists(
        concat(
          type,
          text(` AND ${column} BETWEEN `),
          scalar(values[0]!),
          text(" AND "),
          scalar(values[1]!),
        ),
      );
    case FilterOperator.Contains:
    case FilterOperator.NotContains:
    case FilterOperator.StartsWith:
    case FilterOperator.EndsWith:
      return exists(
        concat(
          type,
          text(" AND "),
          stringMatch("property_value.string_value", operator, value as string),
        ),
      );
    default:
      return value === null
        ? exists(
            text(
              ` AND property_value.value_type ${COMPARISON_SQL[operator]!} 0`,
            ),
          )
        : exists(
            concat(
              type,
              text(` AND ${column} ${COMPARISON_SQL[operator]!} `),
              scalar(value as FilterValue),
            ),
          );
  }
}

/**
 * A condition on a page view field: its column, its session's entry or
 * exit page, or, for a custom property, the page view's own property.
 */
function pageViewCondition(
  condition: FilterCondition,
  scope: FilterSqlScope,
  visit: string,
): SqlFragment {
  const field = definitionOf(condition);
  switch (field.source) {
    case FilterFieldSource.Visit:
      return comparison(field, columnExpression(field, visit), condition);
    case FilterFieldSource.SessionBoundary:
      return sessionBoundary(field, condition, scope, visit);
    case FilterFieldSource.Payload:
      return propertyComparison(
        condition,
        pageViewProperties(
          condition.target.kind === "event-payload"
            ? condition.target.path
            : "",
          visit,
        ),
      );
    case FilterFieldSource.EventName:
      throw new TypeError("event.name is not a page view field.");
  }
}

/**
 * A condition on a custom event: its name and payload are its own, and the
 * page view fields are those of the visit it was sent from.
 */
function eventCondition(
  condition: FilterCondition,
  scope: FilterSqlScope,
  event: string,
  eventName: string,
  visit: string,
): SqlFragment {
  const field = definitionOf(condition);
  switch (field.source) {
    case FilterFieldSource.EventName:
      return comparison(field, eventName, condition);
    case FilterFieldSource.Payload:
      return propertyComparison(
        condition,
        eventPayloadValues(
          condition.target.kind === "event-payload"
            ? condition.target.path
            : "",
          event,
        ),
      );
    default:
      return pageViewCondition(condition, scope, visit);
  }
}

function and(parts: readonly SqlFragment[]): SqlFragment | null {
  return parts.length === 0
    ? null
    : join(parts.map(parenthesize), text(" AND "));
}

/** The visit's custom events in the window that match every condition. */
function visitHasEvent(
  conditions: readonly FilterCondition[],
  scope: FilterSqlScope,
  visit: string,
): SqlFragment {
  const predicate = and(
    conditions.map((condition) =>
      eventCondition(
        condition,
        scope,
        "visit_event",
        "visit_event_name.name",
        visit,
      ),
    ),
  );
  return concat(
    text(`EXISTS (
    SELECT 1
    FROM custom_events visit_event
    INNER JOIN custom_event_names visit_event_name
      ON visit_event_name.id = visit_event.event_name_id
    WHERE visit_event.visit_id = ${visit}.visit_id
      AND visit_event.occurred_at >= `),
    parameter(scope.startMs),
    text(" AND visit_event.occurred_at < "),
    parameter(scope.endExclusiveMs),
    ...(predicate ? [text(" AND "), predicate] : []),
    text(")"),
  );
}

function bySource(conditions: readonly FilterCondition[]) {
  const source = (condition: FilterCondition) => definitionOf(condition).source;
  const isEventName = (condition: FilterCondition) =>
    source(condition) === FilterFieldSource.EventName;
  return {
    pageView: conditions.filter(
      (condition) =>
        source(condition) === FilterFieldSource.Visit ||
        source(condition) === FilterFieldSource.SessionBoundary,
    ),
    payload: conditions.filter(
      (condition) => source(condition) === FilterFieldSource.Payload,
    ),
    eventNames: conditions.filter(
      (condition) =>
        isEventName(condition) &&
        !NEGATED_FILTER_OPERATORS.has(condition.operator),
    ),
    excludedEventNames: conditions.filter(
      (condition) =>
        isEventName(condition) &&
        NEGATED_FILTER_OPERATORS.has(condition.operator),
    ),
  };
}

/**
 * The filter as a predicate on a visits row aliased `visit`. Page view
 * fields compare its columns. A custom event name matches the visits with
 * such an event, and a negated one ("is not") the visits without; a custom
 * property matches the page view's own or one of its events'.
 */
export function visitFilterSql(
  filters: FilterDocument,
  scope: FilterSqlScope,
  visit = "v",
): SqlFragment | null {
  const alias = validAlias(visit);
  const { pageView, payload, eventNames, excludedEventNames } = bySource(
    filters.conditions,
  );
  const parts = pageView.map((condition) =>
    pageViewCondition(condition, scope, alias),
  );
  if (eventNames.length > 0) {
    parts.push(visitHasEvent([...eventNames, ...payload], scope, alias));
  } else if (payload.length > 0) {
    parts.push(
      join(
        [
          and(
            payload.map((condition) =>
              pageViewCondition(condition, scope, alias),
            ),
          )!,
          visitHasEvent(payload, scope, alias),
        ].map(parenthesize),
        text(" OR "),
      ),
    );
  }
  for (const condition of excludedEventNames) {
    parts.push(
      concat(
        text("NOT "),
        visitHasEvent(
          [
            {
              ...condition,
              operator: POSITIVE_OPERATOR[condition.operator]!,
            },
          ],
          scope,
          alias,
        ),
      ),
    );
  }
  return and(parts);
}

/**
 * The filter as a predicate on a custom event row aliased `event`, with its
 * name at `eventName` and its visit aliased `visit`.
 */
export function eventFilterSql(
  filters: FilterDocument,
  scope: FilterSqlScope,
  aliases: {
    readonly event: string;
    readonly eventName: string;
    readonly visit: string;
  } = { event: "ce", eventName: "cen.name", visit: "v" },
): SqlFragment | null {
  const event = validAlias(aliases.event);
  const visit = validAlias(aliases.visit);
  return and(
    filters.conditions.map((condition) =>
      eventCondition(condition, scope, event, aliases.eventName, visit),
    ),
  );
}

/**
 * Whether a page view row is a conversion of a goal or funnel step: one
 * that names no custom event and whose every condition the page view
 * matches, a custom property being the page view's own.
 */
export function pageViewMatchSql(
  filters: FilterDocument,
  scope: FilterSqlScope,
  visit = "v",
): SqlFragment {
  if (matchesOnlyCustomEvents(filters)) return text("0");
  const alias = validAlias(visit);
  return (
    and(
      filters.conditions.map((condition) =>
        pageViewCondition(condition, scope, alias),
      ),
    ) ?? text("1")
  );
}

/**
 * Whether a custom event row is a conversion of a goal or funnel step: one
 * that names a custom event, or is custom properties alone, and whose every
 * condition the event matches.
 */
export function eventMatchSql(
  filters: FilterDocument,
  scope: FilterSqlScope,
  aliases?: Parameters<typeof eventFilterSql>[2],
): SqlFragment {
  return matchesOnlyCustomEvents(filters) || matchesOnlyProperties(filters)
    ? eventFilterSql(filters, scope, aliases)!
    : text("0");
}
