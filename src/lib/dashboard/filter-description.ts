import {
  type FilterCondition,
  type FilterDocument,
  type FilterFieldRegistry,
  FilterOperator,
  type FilterValue,
} from "@/lib/filter-contract";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

type FilterDescriptionMessages = Pick<
  AppMessages,
  "conditionDescription" | "filterBuilder"
>;
type ConditionMessages = AppMessages["conditionDescription"];

/** The message of each operator that takes no value: "{field} exists". */
const VALUELESS_MESSAGES: Partial<
  Record<FilterOperator, keyof ConditionMessages>
> = {
  [FilterOperator.Exists]: "filterExists",
  [FilterOperator.NotExists]: "filterNotExists",
  [FilterOperator.IsNull]: "filterIsNull",
  [FilterOperator.NotNull]: "filterNotNull",
  [FilterOperator.IsEmpty]: "filterIsEmpty",
  [FilterOperator.NotEmpty]: "filterNotEmpty",
};

/** The message of each operator that takes one value: "{field} equals {value}". */
const VALUE_MESSAGES: Partial<Record<FilterOperator, keyof ConditionMessages>> =
  {
    [FilterOperator.Eq]: "filterEquals",
    [FilterOperator.Neq]: "filterNotEquals",
    [FilterOperator.Contains]: "filterContains",
    [FilterOperator.NotContains]: "filterNotContains",
    [FilterOperator.StartsWith]: "filterStartsWith",
    [FilterOperator.EndsWith]: "filterEndsWith",
    [FilterOperator.Gt]: "filterGreaterThan",
    [FilterOperator.Gte]: "filterGreaterThanOrEqual",
    [FilterOperator.Lt]: "filterLessThan",
    [FilterOperator.Lte]: "filterLessThanOrEqual",
  };

function formatValue(value: FilterValue): string {
  return JSON.stringify(value);
}

function fieldDescription(
  condition: FilterCondition,
  registry: FilterFieldRegistry,
  messages: FilterDescriptionMessages,
): string {
  if (condition.target.kind === "event-payload") {
    const label =
      messages.filterBuilder.fieldLabels["event.payload"] ?? "event.payload";
    return `${label} (${condition.target.path})`;
  }
  const field = registry.get(condition.target.field);
  return (
    messages.filterBuilder.fieldLabels[field?.id ?? condition.target.field] ??
    condition.target.field
  );
}

/** One condition in words, e.g. `Path equals "/pricing"`. */
export function describeFilterCondition(
  condition: FilterCondition,
  registry: FilterFieldRegistry,
  messages: FilterDescriptionMessages,
): string {
  const field = fieldDescription(condition, registry, messages);
  const valueless = VALUELESS_MESSAGES[condition.operator];
  if (valueless) {
    return formatI18nTemplate(messages.conditionDescription[valueless], {
      field,
    });
  }
  const value = condition.value;
  if (Array.isArray(value)) {
    if (condition.operator === FilterOperator.Between) {
      return formatI18nTemplate(messages.conditionDescription.filterBetween, {
        field,
        from: formatValue(value[0]!),
        to: formatValue(value[1]!),
      });
    }
    return formatI18nTemplate(
      condition.operator === FilterOperator.NotIn
        ? messages.conditionDescription.filterNoneOf
        : messages.conditionDescription.filterAnyOf,
      {
        field,
        values: value
          .map(formatValue)
          .join(` ${messages.conditionDescription.or} `),
      },
    );
  }
  return formatI18nTemplate(
    messages.conditionDescription[VALUE_MESSAGES[condition.operator]!],
    { field, value: formatValue(value as FilterValue) },
  );
}

/** Every condition in words, joined by "and". */
export function describeFilter(
  document: FilterDocument,
  registry: FilterFieldRegistry,
  messages: FilterDescriptionMessages,
): string {
  if (document.conditions.length === 0) {
    return messages.conditionDescription.emptyFilter;
  }
  return document.conditions
    .map((condition) => describeFilterCondition(condition, registry, messages))
    .join(` ${messages.conditionDescription.and} `);
}
