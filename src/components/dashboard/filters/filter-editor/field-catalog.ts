import {
  analyticsFilterRegistry,
  type FilterFieldGroup,
  type RegisteredFilterField,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";

import type { FilterPanelAudience } from "./model";

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
