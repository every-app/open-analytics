import {
  analyticsFilterRegistry,
  type CanonicalJsonPath,
  EVENT_PAYLOAD_FIELD,
  type FilterAudience,
  type FilterCondition,
  type FilterDocument,
  type FilterFieldDefinition,
  type FilterFieldId,
  FilterOperator,
  type FilterValue,
  type FilterValueKind,
  formatFilterDsl,
  LIST_FILTER_OPERATORS,
  normalizeFilterDocument,
  parseFilterDsl,
  VALUELESS_FILTER_OPERATORS,
} from "@/lib/filter-contract/index";

export type FilterPanelAudience = FilterAudience;
export type ScalarKind = "string" | "number" | "boolean";
type ValueSuggestion = {
  readonly value: string | number | boolean | null;
  readonly occurrences?: number;
  readonly label?: string;
};
export type ValueSuggestionPage = {
  readonly items: readonly ValueSuggestion[];
  readonly pagination: {
    readonly limit: number;
    readonly returned: number;
    readonly hasMore: boolean;
    readonly nextCursor: string | null;
  };
};
/** One row of the filter editor, as typed: its value may be incomplete. */
export interface EditorCondition {
  readonly id: string;
  readonly field: string;
  readonly payloadPath: string;
  readonly operator: FilterOperator;
  readonly value: FilterValue | readonly FilterValue[] | undefined;
  readonly listValues: readonly FilterValue[] | undefined;
  readonly valueText: string;
  readonly scalarKind: ScalarKind;
  /** Whether `valueText` holds the value rather than `value`. */
  readonly valueDirty: boolean;
}

export enum EditorError {
  MissingValue = "missing_value",
  UnknownField = "unknown_field",
}

export { LIST_FILTER_OPERATORS as LIST_OPERATORS };
export { VALUELESS_FILTER_OPERATORS as VALUELESS_OPERATORS };

export function conditionIdFactory() {
  let sequence = 0;
  return () => `filter-node-${++sequence}`;
}
/**
 * The filter without the condition a value picker is choosing for, so its
 * suggestions aren't narrowed to the value already picked.
 */
export function stripSuggestionFacet(
  document: FilterDocument,
  field: string,
  payloadPath: string,
): FilterDocument {
  return {
    conditions: document.conditions.filter((condition) =>
      field === EVENT_PAYLOAD_FIELD
        ? !(
            condition.target.kind === "event-payload" &&
            Boolean(payloadPath) &&
            condition.target.path === payloadPath
          )
        : !(
            condition.target.kind === "field" &&
            condition.target.field === field
          ),
    ),
  };
}
export function firstOperator(
  definition: FilterFieldDefinition,
): FilterOperator {
  if (definition.operators.has(FilterOperator.Eq)) return FilterOperator.Eq;
  return [...definition.operators][0]!;
}
function scalarKindFor(
  value: FilterValue | readonly FilterValue[] | undefined,
): ScalarKind {
  const item = Array.isArray(value) ? value[0] : value;
  if (typeof item === "number") return "number";
  if (typeof item === "boolean") return "boolean";
  return "string";
}
function valueTextFor(
  value: FilterValue | readonly FilterValue[] | undefined,
): string {
  if (value === undefined) return "";
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => String(item ?? "")).join(", ");
}
export function filterValueText(value: FilterValue): string {
  return value === null ? "null" : String(value);
}
export function filterValueKey(value: FilterValue): string {
  return JSON.stringify(value);
}
export function defaultCondition(
  createId: () => string,
  field = "page.path",
): EditorCondition {
  return {
    id: createId(),
    field,
    payloadPath: "",
    operator: FilterOperator.Eq,
    value: undefined,
    listValues: undefined,
    valueText: "",
    scalarKind: "string",
    valueDirty: true,
  };
}
function editorCondition(
  condition: FilterCondition,
  createId: () => string,
): EditorCondition {
  return {
    id: createId(),
    field:
      condition.target.kind === "field"
        ? condition.target.field
        : EVENT_PAYLOAD_FIELD,
    payloadPath:
      condition.target.kind === "event-payload" ? condition.target.path : "",
    operator: condition.operator,
    value: condition.value,
    listValues: Array.isArray(condition.value) ? condition.value : undefined,
    valueText: valueTextFor(condition.value),
    scalarKind: scalarKindFor(condition.value),
    valueDirty: false,
  };
}
export function editorConditionsFromDocument(
  document: FilterDocument,
  createId: () => string,
): EditorCondition[] {
  return document.conditions.map((condition) =>
    editorCondition(condition, createId),
  );
}
/** The rows of a filter's DSL; none for a filter that doesn't parse. */
export function editorConditionsFromDsl(
  filterDsl: string,
  createId: () => string,
): EditorCondition[] {
  try {
    return editorConditionsFromDocument(
      parseFilterDsl(filterDsl, analyticsFilterRegistry),
      createId,
    );
  } catch {
    return [];
  }
}
function valueForKind(
  raw: string,
  valueKind: FilterValueKind,
  scalarKind: ScalarKind,
): FilterValue {
  const kind = valueKind === "json-scalar" ? scalarKind : valueKind;
  if (kind === "number") return Number(raw);
  if (kind === "boolean") return raw === "true";
  return raw;
}
function conditionFromEditor(node: EditorCondition): FilterCondition {
  const definition = analyticsFilterRegistry.get(node.field);
  if (!definition) throw new Error(EditorError.UnknownField);
  const target =
    node.field === EVENT_PAYLOAD_FIELD
      ? {
          kind: "event-payload" as const,
          path: node.payloadPath as CanonicalJsonPath,
        }
      : { kind: "field" as const, field: definition.id as FilterFieldId };
  if (VALUELESS_FILTER_OPERATORS.has(node.operator)) {
    return { target, operator: node.operator };
  }
  if (!node.valueDirty && node.value !== undefined) {
    return { target, operator: node.operator, value: node.value };
  }
  if (!node.valueText.trim() && !node.listValues?.length) {
    throw new Error(EditorError.MissingValue);
  }
  const parse = (item: FilterValue) =>
    item === null
      ? null
      : valueForKind(String(item), definition.valueKind, node.scalarKind);
  const value =
    LIST_FILTER_OPERATORS.has(node.operator) ||
    node.operator === FilterOperator.Between
      ? (LIST_FILTER_OPERATORS.has(node.operator) && node.listValues
          ? node.listValues
          : node.valueText.split(",").map((item) => item.trim())
        ).map(parse)
      : parse(node.valueText.trim());
  return { target, operator: node.operator, value };
}
/** The rows as a filter. Throws when one is incomplete or invalid. */
export function documentFromEditor(
  conditions: readonly EditorCondition[],
): FilterDocument {
  return normalizeFilterDocument(
    { conditions: conditions.map(conditionFromEditor) },
    analyticsFilterRegistry,
  );
}
/** The rows as filter DSL. Throws when one is incomplete or invalid. */
export function filterDslFromEditor(
  conditions: readonly EditorCondition[],
): string {
  return formatFilterDsl(documentFromEditor(conditions));
}
