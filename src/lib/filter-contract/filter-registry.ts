import {
  EVENT_PAYLOAD_FIELD,
  type FilterDocument,
  type FilterFieldDefinition,
  FilterOperator,
  type FilterValueKind,
  targetFieldId,
} from "./filters";
import type { FilterAudience } from "./types";

/**
 * Where a field's value lives, which is all the SQL compiler needs to know
 * to filter visits and custom events by it.
 */
export enum FilterFieldSource {
  /** A column of the page view. A custom event takes it from its visit. */
  Visit = "visit",
  /** The first or last page of the visit's session. */
  SessionBoundary = "session-boundary",
  /** The custom event's name: a visit matches through one of its events. */
  EventName = "event-name",
  /** A page view's custom property or a custom event's payload value. */
  Payload = "payload",
}

/** How a text field compares: as stored, or lowercased. */
export enum FilterTextComparison {
  CaseSensitive = "case-sensitive",
  CaseInsensitive = "case-insensitive",
}

type FilterSuggestionMode = "discrete" | "search" | "boolean" | "none";
export type FilterFieldGroup =
  "page" | "session" | "acquisition" | "device" | "geo" | "event";

/**
 * Strategy keys are intentionally not SQL expressions. The compiler owns the
 * strategy implementation and the registry only selects one of these keys.
 */
export type FilterColumnStrategy =
  | "column.pathname"
  | "column.title"
  | "column.hostname"
  | "column.query_string"
  | "column.hash_fragment"
  | "column.referrer_host"
  | "column.referrer_url"
  | "column.utm_source"
  | "column.utm_medium"
  | "column.utm_campaign"
  | "column.utm_term"
  | "column.utm_content"
  | "column.channel"
  | "column.browser"
  | "column.browser_version"
  | "column.os"
  | "column.device_type"
  | "column.language"
  | "column.country"
  | "column.region"
  | "column.city"
  | "column.continent"
  | "column.timezone"
  | "column.duration_ms"
  | "column.scroll_depth"
  | "column.screen_width"
  | "column.screen_height"
  | "column.is_eu";

export type FilterCompilerStrategy =
  | FilterColumnStrategy
  | "derived.browserEngine"
  | "derived.osVersion"
  | "derived.screenSize"
  | "session.boundary.entry"
  | "session.boundary.exit"
  | "event.name"
  | "event.payload";

export interface RegisteredFilterField extends FilterFieldDefinition {
  readonly source: FilterFieldSource;
  readonly comparison: FilterTextComparison;
  /** A referrer field, whose empty value is the "Direct" traffic. */
  readonly directReferrer: boolean;
  readonly group: FilterFieldGroup;
  readonly suggestionMode: FilterSuggestionMode;
  readonly compilerStrategy: FilterCompilerStrategy;
}

const PUBLIC_AUDIENCES: ReadonlySet<FilterAudience> = new Set([
  "private-dashboard",
  "public-share",
]);
const PRIVATE_AUDIENCES: ReadonlySet<FilterAudience> = new Set([
  "private-dashboard",
]);

const OPERATORS_BY_VALUE_KIND: Readonly<
  Record<FilterValueKind, readonly FilterOperator[]>
> = {
  string: [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.In,
    FilterOperator.NotIn,
    FilterOperator.Contains,
    FilterOperator.NotContains,
    FilterOperator.StartsWith,
    FilterOperator.EndsWith,
    FilterOperator.Exists,
    FilterOperator.NotExists,
    FilterOperator.IsNull,
    FilterOperator.NotNull,
    FilterOperator.IsEmpty,
    FilterOperator.NotEmpty,
  ],
  enum: [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.In,
    FilterOperator.NotIn,
    FilterOperator.Exists,
    FilterOperator.NotExists,
    FilterOperator.IsNull,
    FilterOperator.NotNull,
    FilterOperator.IsEmpty,
    FilterOperator.NotEmpty,
  ],
  number: [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.In,
    FilterOperator.NotIn,
    FilterOperator.Gt,
    FilterOperator.Gte,
    FilterOperator.Lt,
    FilterOperator.Lte,
    FilterOperator.Between,
    FilterOperator.Exists,
    FilterOperator.NotExists,
    FilterOperator.IsNull,
    FilterOperator.NotNull,
  ],
  boolean: [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.Exists,
    FilterOperator.NotExists,
    FilterOperator.IsNull,
    FilterOperator.NotNull,
  ],
  "json-scalar": [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.In,
    FilterOperator.NotIn,
    FilterOperator.Contains,
    FilterOperator.NotContains,
    FilterOperator.StartsWith,
    FilterOperator.EndsWith,
    FilterOperator.Gt,
    FilterOperator.Gte,
    FilterOperator.Lt,
    FilterOperator.Lte,
    FilterOperator.Between,
    FilterOperator.Exists,
    FilterOperator.NotExists,
    FilterOperator.IsNull,
    FilterOperator.NotNull,
    FilterOperator.IsEmpty,
    FilterOperator.NotEmpty,
  ],
};

function groupFor(id: string): FilterFieldGroup {
  if (id.startsWith("session.")) return "session";
  if (
    id.startsWith("utm.") ||
    id.startsWith("referrer.") ||
    id === "traffic.channel"
  )
    return "acquisition";
  if (id.startsWith("client.")) return "device";
  if (id.startsWith("geo.")) return "geo";
  if (id.startsWith("event.")) return "event";
  return "page";
}

interface FieldOptions {
  readonly audiences?: ReadonlySet<FilterAudience>;
  readonly source?: FilterFieldSource;
  readonly comparison?: FilterTextComparison;
  readonly directReferrer?: boolean;
  readonly suggestionMode?: FilterSuggestionMode;
  readonly operators?: readonly FilterOperator[];
  readonly number?: FilterFieldDefinition["number"];
  readonly unit?: FilterFieldDefinition["unit"];
}

function field<const Id extends string>(
  id: Id,
  valueKind: FilterValueKind,
  compilerStrategy: FilterCompilerStrategy,
  options: FieldOptions = {},
): RegisteredFilterField & { readonly id: Id } {
  const comparison =
    options.comparison ??
    (valueKind === "enum"
      ? FilterTextComparison.CaseInsensitive
      : FilterTextComparison.CaseSensitive);
  const isText = valueKind === "string" || valueKind === "enum";
  return {
    id,
    valueKind,
    operators: new Set(options.operators ?? OPERATORS_BY_VALUE_KIND[valueKind]),
    audiences: options.audiences ?? PUBLIC_AUDIENCES,
    source: options.source ?? FilterFieldSource.Visit,
    comparison,
    directReferrer: options.directReferrer ?? false,
    group: groupFor(id),
    suggestionMode:
      options.suggestionMode ??
      (valueKind === "boolean" ? "boolean" : isText ? "search" : "none"),
    compilerStrategy,
    ...(options.number ? { number: options.number } : {}),
    ...(options.unit ? { unit: options.unit } : {}),
    ...(isText
      ? {
          canonicalize: (value) =>
            comparison === FilterTextComparison.CaseInsensitive
              ? String(value).trim().toLowerCase()
              : String(value).trim(),
        }
      : {}),
  };
}

const CASE_INSENSITIVE = { comparison: FilterTextComparison.CaseInsensitive };
const DISCRETE = { suggestionMode: "discrete" } as const;
const PRIVATE = { audiences: PRIVATE_AUDIENCES };
const SESSION_BOUNDARY = {
  source: FilterFieldSource.SessionBoundary,
  operators: [
    FilterOperator.Eq,
    FilterOperator.Neq,
    FilterOperator.In,
    FilterOperator.NotIn,
  ],
};

/**
 * The only hand-maintained field list, in the order field pickers show it.
 * All public IDs and registry entries derive from it.
 */
const FIELDS = [
  field("page.path", "string", "column.pathname"),
  field("page.title", "string", "column.title"),
  field("page.hostname", "string", "column.hostname", CASE_INSENSITIVE),
  field("page.durationMs", "number", "column.duration_ms", {
    unit: "ms",
    number: { min: 0 },
  }),
  field("page.scrollDepth", "number", "column.scroll_depth", {
    unit: "%",
    number: { min: 0, max: 100, step: 1 },
  }),
  field("page.query", "string", "column.query_string", PRIVATE),
  field("page.hash", "string", "column.hash_fragment", PRIVATE),
  field("event.name", "string", "event.name", {
    ...PRIVATE,
    source: FilterFieldSource.EventName,
  }),
  field(EVENT_PAYLOAD_FIELD, "json-scalar", "event.payload", {
    ...PRIVATE,
    source: FilterFieldSource.Payload,
  }),
  field(
    "session.entryPath",
    "string",
    "session.boundary.entry",
    SESSION_BOUNDARY,
  ),
  field(
    "session.exitPath",
    "string",
    "session.boundary.exit",
    SESSION_BOUNDARY,
  ),
  field("referrer.domain", "string", "column.referrer_host", {
    ...CASE_INSENSITIVE,
    directReferrer: true,
  }),
  field("referrer.url", "string", "column.referrer_url", {
    ...PRIVATE,
    ...CASE_INSENSITIVE,
    directReferrer: true,
  }),
  field("traffic.channel", "enum", "column.channel", DISCRETE),
  field("utm.source", "string", "column.utm_source", DISCRETE),
  field("utm.medium", "string", "column.utm_medium", DISCRETE),
  field("utm.campaign", "string", "column.utm_campaign", DISCRETE),
  field("utm.term", "string", "column.utm_term", DISCRETE),
  field("utm.content", "string", "column.utm_content", DISCRETE),
  field("client.deviceType", "enum", "column.device_type", DISCRETE),
  field("client.browser", "string", "column.browser", DISCRETE),
  field("client.browserVersion", "string", "column.browser_version"),
  field("client.browserEngine", "string", "derived.browserEngine", DISCRETE),
  field("client.os", "string", "column.os", DISCRETE),
  field("client.osVersion", "string", "derived.osVersion"),
  field("client.language", "string", "column.language", DISCRETE),
  field("client.screenSize", "string", "derived.screenSize", DISCRETE),
  field("client.screenWidth", "number", "column.screen_width", {
    unit: "px",
    number: { min: 0, step: 1 },
  }),
  field("client.screenHeight", "number", "column.screen_height", {
    unit: "px",
    number: { min: 0, step: 1 },
  }),
  field("geo.country", "enum", "column.country", DISCRETE),
  field("geo.region", "string", "column.region", {
    ...PRIVATE,
    ...CASE_INSENSITIVE,
  }),
  field("geo.city", "string", "column.city", {
    ...PRIVATE,
    ...CASE_INSENSITIVE,
  }),
  field("geo.continent", "enum", "column.continent", DISCRETE),
  field("geo.timeZone", "string", "column.timezone", DISCRETE),
  field("geo.isEU", "boolean", "column.is_eu"),
] as const;

export type AnalyticsFilterFieldId = (typeof FIELDS)[number]["id"];

/** Bump when canonical IDs, value kinds, or operator semantics change. */
export const ANALYTICS_FILTER_REGISTRY_REVISION = "analytics-filter-v8";

export const analyticsFilterRegistry: ReadonlyMap<
  string,
  RegisteredFilterField
> = new Map(FIELDS.map((definition) => [definition.id, definition]));

export function filterIdsForAudience(
  audience: FilterAudience,
): ReadonlySet<string> {
  return new Set(
    FIELDS.filter((definition) => definition.audiences.has(audience)).map(
      (definition) => definition.id,
    ),
  );
}

export function analyticsFilterDefinition(
  fieldId: string,
): RegisteredFilterField | undefined {
  return analyticsFilterRegistry.get(fieldId);
}

/**
 * Whether the filter names custom events, so only custom events match it:
 * e.g. `event.name eq "Purchase"`, alone or with page view conditions.
 */
export function matchesOnlyCustomEvents(document: FilterDocument): boolean {
  return document.conditions.some(
    (condition) =>
      analyticsFilterDefinition(targetFieldId(condition.target))?.source ===
      FilterFieldSource.EventName,
  );
}

/**
 * Whether the filter is custom properties alone, e.g.
 * `event.payload("/plan") eq "pro"`: page views and custom events both
 * carry properties, so both match it.
 */
export function matchesOnlyProperties(document: FilterDocument): boolean {
  return (
    document.conditions.length > 0 &&
    document.conditions.every(
      (condition) =>
        analyticsFilterDefinition(targetFieldId(condition.target))?.source ===
        FilterFieldSource.Payload,
    )
  );
}
