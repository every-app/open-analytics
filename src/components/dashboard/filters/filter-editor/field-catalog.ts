import type { EventField } from "@/lib/dashboard-api/client/edge";
import {
  analyticsFilterRegistry,
  type FilterFieldGroup,
  FilterOperator,
  type RegisteredFilterField,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";

import type { EditorCondition, FilterPanelAudience } from "./model";

export function fieldLabel(
  field: RegisteredFilterField,
  messages: AppMessages,
): string {
  return messages.filterBuilder.fieldLabels[field.id] ?? field.id;
}
/** The audience's fields, in the registry's order. */
export function allowedFields(
  audience: FilterPanelAudience,
): readonly RegisteredFilterField[] {
  return [...analyticsFilterRegistry.values()].filter((field) =>
    field.audiences.has(audience),
  );
}
export interface FilterPickerEntry {
  readonly id: string;
  readonly label: string;
  readonly searchText: string;
}
/** The field picker's groups: the fields of each, in the registry's order. */
export function filterPickerGroups(
  fields: readonly RegisteredFilterField[],
  messages: AppMessages,
): readonly {
  readonly key: FilterFieldGroup;
  readonly label: string;
  readonly fields: readonly FilterPickerEntry[];
}[] {
  const groups = new Map<FilterFieldGroup, FilterPickerEntry[]>();
  for (const field of fields) {
    const label = fieldLabel(field, messages);
    const entries = groups.get(field.group) ?? [];
    entries.push({ id: field.id, label, searchText: `${label} ${field.id}` });
    groups.set(field.group, entries);
  }
  return [...groups].map(([key, entries]) => ({
    key,
    label: messages.filterBuilder.fieldGroups[key] ?? key,
    fields: entries,
  }));
}
/**
 * The custom event the rows filter to, if exactly one: its payload paths
 * are the ones a custom property picker suggests.
 */
export function directEventName(
  conditions: readonly EditorCondition[],
): string | undefined {
  const names = conditions.filter(
    (condition) =>
      condition.field === "event.name" &&
      condition.operator === FilterOperator.Eq &&
      condition.valueText.trim().length > 0,
  );
  return names.length === 1 ? names[0]!.valueText.trim() : undefined;
}
export function isSelectablePayloadFieldType(
  valueType: EventField["valueType"],
): valueType is "string" | "number" | "boolean" {
  return (
    valueType === "string" || valueType === "number" || valueType === "boolean"
  );
}
export function payloadFieldTypeLabel(
  valueType: EventField["valueType"],
  messages: AppMessages,
): string {
  return isSelectablePayloadFieldType(valueType)
    ? messages.filterBuilder.valueKinds[valueType]
    : valueType;
}
