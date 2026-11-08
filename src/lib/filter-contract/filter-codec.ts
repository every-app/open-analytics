import {
  type CanonicalJsonPath,
  EVENT_PAYLOAD_FIELD,
  type FilterCondition,
  type FilterDocument,
  type FilterFieldId,
  type FilterFieldRegistry,
  FilterOperator,
  type FilterTarget,
  type FilterValue,
  LIST_FILTER_OPERATORS,
  normalizeFilterDocument,
  VALUELESS_FILTER_OPERATORS,
} from "./filters";

export class FilterCodecError extends Error {
  readonly code: string;
  readonly path: string;

  constructor(code: string, path: string, message: string) {
    super(message);
    this.name = "FilterCodecError";
    this.code = code;
    this.path = path;
  }
}

/**
 * The URL spelling of each operator. A value without a prefix means `eq`,
 * and a valueless operator is its alias alone.
 */
const OPERATOR_ALIASES: Readonly<Record<FilterOperator, string>> = {
  [FilterOperator.Eq]: "eq",
  [FilterOperator.Neq]: "ne",
  [FilterOperator.In]: "in",
  [FilterOperator.NotIn]: "nin",
  [FilterOperator.Contains]: "c",
  [FilterOperator.NotContains]: "nc",
  [FilterOperator.StartsWith]: "sw",
  [FilterOperator.EndsWith]: "ew",
  [FilterOperator.Gt]: "gt",
  [FilterOperator.Gte]: "gte",
  [FilterOperator.Lt]: "lt",
  [FilterOperator.Lte]: "lte",
  [FilterOperator.Between]: "bt",
  [FilterOperator.Exists]: "ex",
  [FilterOperator.NotExists]: "nex",
  [FilterOperator.IsNull]: "null",
  [FilterOperator.NotNull]: "nnull",
  [FilterOperator.IsEmpty]: "empty",
  [FilterOperator.NotEmpty]: "nempty",
};

const OPERATORS_BY_ALIAS = new Map<string, FilterOperator>(
  Object.entries(OPERATOR_ALIASES).flatMap(([operator, alias]) => [
    [alias, operator as FilterOperator],
    [operator, operator as FilterOperator],
  ]),
);

/** Marks a custom property value that isn't a string. */
const JSON_VALUE_PREFIX = "json:";

function fail(code: string, path: string, message: string): never {
  throw new FilterCodecError(code, path, message);
}

function parseInput(input: string | URL | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return input;
  if (input instanceof URL) return input.searchParams;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(input))
    return new URL(input).searchParams;
  return new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
}

function splitEscapedList(raw: string): string[] {
  const values: string[] = [];
  let value = "";
  let escaped = false;
  for (const character of raw) {
    if (escaped) {
      value +=
        character === "," || character === "\\" ? character : `\\${character}`;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === ",") {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  if (escaped) value += "\\";
  values.push(value);
  return values;
}

function escapeListValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

/** `filter[<field>]` or `filter[event.payload][<json pointer>]`. */
function parseKey(key: string): FilterTarget | null {
  const match = /^filter\[([^\]]+)\](?:\[([^\]]+)\])?$/.exec(key);
  if (!match) {
    if (key.startsWith("filter["))
      fail("invalid_filter_key", key, "Malformed filter key.");
    return null;
  }
  const [, field, path] = match;
  if (field === EVENT_PAYLOAD_FIELD) {
    if (!path)
      fail("invalid_filter_key", key, "A custom property needs its path.");
    return { kind: "event-payload", path: path as CanonicalJsonPath };
  }
  if (path) fail("invalid_filter_key", key, "Malformed filter key.");
  return { kind: "field", field: field as FilterFieldId };
}

function parseValue(
  raw: string,
  target: FilterTarget,
  registry: FilterFieldRegistry,
  path: string,
): FilterValue {
  if (target.kind === "event-payload") {
    if (!raw.startsWith(JSON_VALUE_PREFIX)) return raw;
    try {
      return JSON.parse(raw.slice(JSON_VALUE_PREFIX.length)) as FilterValue;
    } catch {
      return fail(
        "invalid_json_scalar",
        path,
        "Custom property values must be JSON scalars.",
      );
    }
  }
  const definition = registry.get(target.field);
  if (definition?.valueKind === "number") {
    const value = raw.trim() === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(value))
      fail("invalid_number", path, "Expected a finite number.");
    return value;
  }
  if (definition?.valueKind === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    fail("invalid_boolean", path, "Expected true or false.");
  }
  return raw;
}

function parseCondition(
  target: FilterTarget,
  raw: string,
  registry: FilterFieldRegistry,
  key: string,
): FilterCondition {
  const unary = OPERATORS_BY_ALIAS.get(raw);
  if (unary && VALUELESS_FILTER_OPERATORS.has(unary))
    return { target, operator: unary };
  const colon = raw.indexOf(":");
  const prefixed =
    colon > 0 ? OPERATORS_BY_ALIAS.get(raw.slice(0, colon)) : undefined;
  const operator = prefixed ?? FilterOperator.Eq;
  const operand = prefixed ? raw.slice(colon + 1) : raw;
  if (
    LIST_FILTER_OPERATORS.has(operator) ||
    operator === FilterOperator.Between
  ) {
    return {
      target,
      operator,
      value: splitEscapedList(operand).map((value, index) =>
        parseValue(value, target, registry, `${key}[${index}]`),
      ),
    };
  }
  return {
    target,
    operator,
    value: parseValue(operand, target, registry, key),
  };
}

/** Reads the `filter[...]` parameters of a URL: every one must match. */
export function parseFilterParams(
  input: string | URL | URLSearchParams,
  registry: FilterFieldRegistry,
): FilterDocument {
  const conditions: FilterCondition[] = [];
  for (const [key, value] of parseInput(input)) {
    const target = parseKey(key);
    if (target) conditions.push(parseCondition(target, value, registry, key));
  }
  return normalizeFilterDocument({ conditions }, registry);
}

function encodeValue(
  value: FilterValue,
  target: FilterTarget,
  inList: boolean,
): string {
  const wire =
    target.kind === "event-payload"
      ? typeof value === "string" && !value.startsWith(JSON_VALUE_PREFIX)
        ? value
        : `${JSON_VALUE_PREFIX}${JSON.stringify(value)}`
      : String(value);
  return inList ? escapeListValue(wire) : wire;
}

function serializeCondition(condition: FilterCondition): [string, string] {
  const key =
    condition.target.kind === "field"
      ? `filter[${condition.target.field}]`
      : `filter[${EVENT_PAYLOAD_FIELD}][${condition.target.path}]`;
  const alias = OPERATOR_ALIASES[condition.operator];
  if (VALUELESS_FILTER_OPERATORS.has(condition.operator)) return [key, alias];
  if (Array.isArray(condition.value)) {
    return [
      key,
      `${alias}:${condition.value
        .map((value) => encodeValue(value, condition.target, true))
        .join(",")}`,
    ];
  }
  const encoded = encodeValue(
    condition.value as FilterValue,
    condition.target,
    false,
  );
  if (condition.operator !== FilterOperator.Eq)
    return [key, `${alias}:${encoded}`];
  const colon = encoded.indexOf(":");
  const looksPrefixed =
    OPERATORS_BY_ALIAS.has(encoded) ||
    (colon > 0 && OPERATORS_BY_ALIAS.has(encoded.slice(0, colon)));
  return [key, looksPrefixed ? `${alias}:${encoded}` : encoded];
}

export function serializeFilterParams(
  document: FilterDocument,
  registry: FilterFieldRegistry,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of normalizeFilterDocument(document, registry)
    .conditions.map(serializeCondition)
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv)))
    params.append(key, value);
  return params;
}
