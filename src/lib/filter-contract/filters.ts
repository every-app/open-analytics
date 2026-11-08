import type { FilterAudience } from "./types";

export type FilterValue = string | number | boolean | null;
export type FilterValueKind =
  "string" | "enum" | "number" | "boolean" | "json-scalar";

export enum FilterOperator {
  Eq = "eq",
  Neq = "neq",
  In = "in",
  NotIn = "notIn",
  Contains = "contains",
  NotContains = "notContains",
  StartsWith = "startsWith",
  EndsWith = "endsWith",
  Gt = "gt",
  Gte = "gte",
  Lt = "lt",
  Lte = "lte",
  Between = "between",
  Exists = "exists",
  NotExists = "notExists",
  IsNull = "isNull",
  NotNull = "notNull",
  IsEmpty = "isEmpty",
  NotEmpty = "notEmpty",
}

export const FILTER_OPERATORS: readonly FilterOperator[] =
  Object.values(FilterOperator);

/** Operators that take no value. */
export const VALUELESS_FILTER_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  FilterOperator.Exists,
  FilterOperator.NotExists,
  FilterOperator.IsNull,
  FilterOperator.NotNull,
  FilterOperator.IsEmpty,
  FilterOperator.NotEmpty,
]);

/** Operators whose value is a list of one or more values. */
export const LIST_FILTER_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  FilterOperator.In,
  FilterOperator.NotIn,
]);

/**
 * Operators a row matches when it doesn't have what the value names. On a
 * custom event field they mean "the visit has no such event".
 */
export const NEGATED_FILTER_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  FilterOperator.Neq,
  FilterOperator.NotIn,
  FilterOperator.NotContains,
  FilterOperator.NotExists,
]);

export type FilterFieldId = string & { readonly __brand: "FilterFieldId" };
export type CanonicalJsonPath = string & {
  readonly __brand: "CanonicalJsonPath";
};

export interface FieldFilterTarget {
  readonly kind: "field";
  readonly field: FilterFieldId;
}

/**
 * A custom property: a page view's property or, at any depth, a custom
 * event's payload value, named by a JSON pointer.
 */
export interface EventPayloadFilterTarget {
  readonly kind: "event-payload";
  readonly path: CanonicalJsonPath;
}

export type FilterTarget = FieldFilterTarget | EventPayloadFilterTarget;

/** The registry field of a target: a payload path is `event.payload`. */
export const EVENT_PAYLOAD_FIELD = "event.payload";

export interface FilterCondition {
  readonly target: FilterTarget;
  readonly operator: FilterOperator;
  readonly value?: FilterValue | readonly FilterValue[];
}

/** Every condition must match: Plausible's filter, a list joined by AND. */
export interface FilterDocument {
  readonly conditions: readonly FilterCondition[];
}

export const EMPTY_FILTER_DOCUMENT: FilterDocument = Object.freeze({
  conditions: Object.freeze([]) as readonly FilterCondition[],
});

/** The most a filter may hold, so a request can't make an unbounded statement. */
const FILTER_LIMITS = {
  maxConditions: 64,
  maxSetValues: 128,
  maxValueLength: 4_096,
} as const;

export interface FilterFieldDefinition {
  readonly id: string;
  readonly valueKind: FilterValueKind;
  readonly operators: ReadonlySet<FilterOperator>;
  readonly audiences: ReadonlySet<FilterAudience>;
  readonly number?: {
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
  };
  readonly unit?: "ms" | "px" | "ratio" | "%";
  readonly canonicalize?: (value: FilterValue) => FilterValue;
}

export type FilterFieldRegistry = ReadonlyMap<string, FilterFieldDefinition>;

export class FilterValidationError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "FilterValidationError";
    this.code = code;
    this.path = path;
  }
}

function fail(code: string, path: string, message: string): never {
  throw new FilterValidationError(code, path, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFilterValue(value: unknown): value is FilterValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return FILTER_OPERATORS.includes(value as FilterOperator);
}

export function targetFieldId(target: FilterTarget): string {
  return target.kind === "field" ? target.field : EVENT_PAYLOAD_FIELD;
}

function canonicalJsonPath(value: unknown, path: string): CanonicalJsonPath {
  if (typeof value !== "string" || value.length === 0 || value.length > 240) {
    fail(
      "invalid_json_path",
      path,
      "Expected a bounded canonical JSON pointer path.",
    );
  }
  if (!value.startsWith("/") || value === "/" || value.includes("//")) {
    fail(
      "invalid_json_path",
      path,
      "JSON path must be a non-empty JSON pointer.",
    );
  }
  const segments = value.slice(1).split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || /~(?![01])/.test(segment),
    )
  ) {
    fail(
      "invalid_json_path",
      path,
      "JSON path contains an invalid pointer segment.",
    );
  }
  return value as CanonicalJsonPath;
}

function canonicalTarget(
  input: unknown,
  registry: FilterFieldRegistry,
  path: string,
): { target: FilterTarget; definition: FilterFieldDefinition } {
  if (!isRecord(input)) {
    fail("invalid_target", path, "Filter condition requires a typed target.");
  }
  if (input.kind === "event-payload") {
    const definition = registry.get(EVENT_PAYLOAD_FIELD);
    if (!definition) {
      fail("unknown_field", path, "The event payload field is not registered.");
    }
    return {
      target: {
        kind: "event-payload",
        path: canonicalJsonPath(input.path, `${path}.path`),
      },
      definition,
    };
  }
  if (input.kind !== "field") {
    fail("invalid_target", `${path}.kind`, "Unknown filter target kind.");
  }
  const field = input.field;
  if (typeof field !== "string" || !registry.has(field)) {
    fail("unknown_field", `${path}.field`, `Unknown filter field: ${field}`);
  }
  if (field === EVENT_PAYLOAD_FIELD) {
    fail(
      "invalid_target",
      `${path}.field`,
      "event.payload requires an event-payload target with a JSON pointer path.",
    );
  }
  return {
    target: { kind: "field", field: field as FilterFieldId },
    definition: registry.get(field)!,
  };
}

function canonicalValue(
  raw: unknown,
  definition: FilterFieldDefinition,
  path: string,
): FilterValue {
  if (!isFilterValue(raw)) {
    fail("invalid_value", path, "Filter values must be JSON scalar values.");
  }
  if (typeof raw === "string" && raw.length > FILTER_LIMITS.maxValueLength) {
    fail(
      "value_too_long",
      path,
      "Filter value exceeds the configured length limit.",
    );
  }
  if (definition.valueKind === "number") {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      fail("invalid_number", path, "Expected a finite numeric filter value.");
    }
    const value = Object.is(raw, -0) ? 0 : raw;
    const bounds = definition.number;
    if (bounds?.min !== undefined && value < bounds.min) {
      fail(
        "number_below_minimum",
        path,
        "Numeric filter value is below the field minimum.",
      );
    }
    if (bounds?.max !== undefined && value > bounds.max) {
      fail(
        "number_above_maximum",
        path,
        "Numeric filter value is above the field maximum.",
      );
    }
    if (bounds?.step !== undefined) {
      const quotient = (value - (bounds.min ?? 0)) / bounds.step;
      const tolerance = Number.EPSILON * Math.max(1, Math.abs(quotient)) * 8;
      if (Math.abs(quotient - Math.round(quotient)) > tolerance) {
        fail(
          "number_not_on_step",
          path,
          "Numeric filter value does not match the field step.",
        );
      }
    }
    return value;
  }
  if (definition.valueKind === "boolean") {
    if (typeof raw !== "boolean") {
      fail("invalid_boolean", path, "Expected a boolean filter value.");
    }
    return raw;
  }
  if (definition.valueKind === "json-scalar") {
    if (typeof raw === "number" && !Number.isFinite(raw)) {
      fail("invalid_number", path, "Expected a finite number.");
    }
    return raw;
  }
  if (typeof raw !== "string") {
    fail("invalid_string", path, "Expected a string filter value.");
  }
  return definition.canonicalize ? definition.canonicalize(raw) : raw;
}

function assertAscendingRange(
  values: readonly FilterValue[],
  path: string,
): void {
  const [lower, upper] = values;
  if (
    lower === null ||
    upper === null ||
    typeof lower === "boolean" ||
    typeof upper === "boolean" ||
    typeof lower !== typeof upper
  ) {
    fail(
      "invalid_range",
      path,
      "between requires two ordered values of the same type.",
    );
  }
  if (lower! > upper!) {
    fail(
      "reversed_range",
      path,
      "Between endpoints must be ordered from lower to upper.",
    );
  }
}

function canonicalCondition(
  input: unknown,
  registry: FilterFieldRegistry,
  path: string,
): FilterCondition {
  if (!isRecord(input)) {
    fail("invalid_condition", path, "Expected a filter condition.");
  }
  const { target, definition } = canonicalTarget(
    input.target,
    registry,
    `${path}.target`,
  );
  const operator = input.operator;
  if (!isFilterOperator(operator)) {
    fail("invalid_operator", `${path}.operator`, "Unknown filter operator.");
  }
  if (!definition.operators.has(operator)) {
    fail(
      "operator_not_allowed",
      `${path}.operator`,
      "Operator is not allowed for this field.",
    );
  }
  const hasValue = Object.prototype.hasOwnProperty.call(input, "value");
  if (VALUELESS_FILTER_OPERATORS.has(operator)) {
    if (hasValue && input.value !== undefined) {
      fail(
        "unexpected_value",
        `${path}.value`,
        "Unary filter operators do not accept a value.",
      );
    }
    return { target, operator };
  }
  if (!hasValue || input.value === undefined) {
    fail(
      "missing_value",
      `${path}.value`,
      "This filter operator requires a value.",
    );
  }
  const raw = input.value;
  if (LIST_FILTER_OPERATORS.has(operator)) {
    if (!Array.isArray(raw) || raw.length === 0) {
      fail(
        "invalid_set",
        `${path}.value`,
        "Set operators require a non-empty value array.",
      );
    }
    if (raw.length > FILTER_LIMITS.maxSetValues) {
      fail(
        "too_many_set_values",
        `${path}.value`,
        "Filter set-value limit exceeded.",
      );
    }
    const values = raw.map((value, index) =>
      canonicalValue(value, definition, `${path}.value[${index}]`),
    );
    const unique = [
      ...new Map(values.map((value) => [JSON.stringify(value), value])),
    ]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value);
    return { target, operator, value: unique };
  }
  if (operator === FilterOperator.Between) {
    if (!Array.isArray(raw) || raw.length !== 2) {
      fail(
        "invalid_range",
        `${path}.value`,
        "between requires exactly two values.",
      );
    }
    const values = raw.map((value, index) =>
      canonicalValue(value, definition, `${path}.value[${index}]`),
    );
    assertAscendingRange(values, `${path}.value`);
    return { target, operator, value: values };
  }
  if (Array.isArray(raw)) {
    fail("invalid_value", `${path}.value`, "This operator takes one value.");
  }
  const value = canonicalValue(raw, definition, `${path}.value`);
  if (
    value === null ||
    ([
      FilterOperator.Contains,
      FilterOperator.NotContains,
      FilterOperator.StartsWith,
      FilterOperator.EndsWith,
    ].includes(operator) &&
      typeof value !== "string")
  ) {
    fail(
      "invalid_value",
      `${path}.value`,
      "This operator requires a non-null value of the field's type.",
    );
  }
  return { target, operator, value };
}

function conditionFingerprint(condition: FilterCondition): string {
  return JSON.stringify([
    condition.target.kind,
    condition.target.kind === "field"
      ? condition.target.field
      : condition.target.path,
    condition.operator,
    condition.value ?? null,
  ]);
}

/**
 * Validates an untrusted document and returns its canonical form: values
 * canonicalized, duplicates dropped and conditions in a stable order.
 */
export function normalizeFilterDocument(
  input: unknown,
  registry: FilterFieldRegistry,
): FilterDocument {
  if (!isRecord(input) || !Array.isArray(input.conditions)) {
    fail(
      "invalid_document",
      "conditions",
      "Filter document must be a list of conditions.",
    );
  }
  if (input.conditions.length > FILTER_LIMITS.maxConditions) {
    fail(
      "too_many_conditions",
      "conditions",
      "Filter condition limit exceeded.",
    );
  }
  const conditions = new Map(
    input.conditions
      .map((condition, index) =>
        canonicalCondition(condition, registry, `conditions[${index}]`),
      )
      .map((condition) => [conditionFingerprint(condition), condition]),
  );
  return {
    conditions: [...conditions]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, condition]) => condition),
  };
}

export function filterFingerprint(
  document: FilterDocument,
  registry: FilterFieldRegistry,
): string {
  const normalized = normalizeFilterDocument(document, registry);
  return `filter-v2:${JSON.stringify(normalized.conditions.map(conditionFingerprint))}`;
}

/**
 * Whether the document filters by page path, with any operator: Plausible's
 * page filter, which adds the scroll depth to the top stats.
 */
export function hasPagePathFilter(document: FilterDocument): boolean {
  return document.conditions.some(
    (condition) =>
      condition.target.kind === "field" &&
      condition.target.field === "page.path",
  );
}

export function filterConditionCount(document: FilterDocument): number {
  return document.conditions.length;
}

/** The document without the conditions on any of `fields`. */
export function withoutFilterFields(
  document: FilterDocument,
  fields: ReadonlySet<string>,
): FilterDocument {
  return {
    conditions: document.conditions.filter(
      (condition) => !fields.has(targetFieldId(condition.target)),
    ),
  };
}

export function assertFilterAudience(
  document: FilterDocument,
  registry: FilterFieldRegistry,
  audience: FilterAudience,
): void {
  for (const condition of normalizeFilterDocument(document, registry)
    .conditions) {
    const definition = registry.get(targetFieldId(condition.target));
    if (!definition || !definition.audiences.has(audience)) {
      fail(
        "field_not_allowed",
        "filters",
        "Filter field is not allowed for this audience.",
      );
    }
  }
}
