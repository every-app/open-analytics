import { useMemo, useState } from "react";
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { Button } from "@insightflare/ui/button";
import {
  SearchablePopover,
  SearchablePopoverContent,
  SearchablePopoverTrigger,
} from "@insightflare/ui/searchable-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { CheckIcon, ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  analyticsFilterRegistry,
  EVENT_PAYLOAD_FIELD,
  type FilterDocument,
  FilterOperator,
  type FilterValue,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

import {
  allowedFields,
  filterPickerGroups,
  isSelectablePayloadFieldType,
} from "./field-catalog";
import type { EditorCondition, FilterPanelAudience } from "./model";
import { defaultCondition, firstOperator, VALUELESS_OPERATORS } from "./model";
import {
  RangeValueInput,
  SearchablePayloadPathInput,
  SearchableValueInput,
} from "./value-inputs";

interface ConditionContext {
  readonly audience: FilterPanelAudience;
  /** The filter the rows make, for value suggestions. */
  readonly document: FilterDocument;
  readonly eventName: string | undefined;
  readonly messages: AppMessages;
  readonly siteId: string | undefined;
  readonly window: TimeWindow | undefined;
}

function FieldPicker({
  audience,
  field,
  messages,
  onSelect,
}: {
  readonly audience: FilterPanelAudience;
  readonly field: string;
  readonly messages: AppMessages;
  readonly onSelect: (field: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const groups = useMemo(
    () => filterPickerGroups(allowedFields(audience), messages),
    [audience, messages],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredGroups = groups.flatMap((group) => {
    const fields =
      normalizedSearch.length === 0 ||
      group.label.toLocaleLowerCase().includes(normalizedSearch)
        ? group.fields
        : group.fields.filter((entry) =>
            entry.searchText.toLocaleLowerCase().includes(normalizedSearch),
          );
    return fields.length > 0 ? [{ ...group, fields }] : [];
  });
  const selectedLabel =
    groups.flatMap((group) => group.fields).find((entry) => entry.id === field)
      ?.label ?? field;
  return (
    <SearchablePopover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSearch("");
      }}
    >
      <SearchablePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full justify-between border-input bg-transparent py-2 pr-2 pl-2.5 text-xs font-normal whitespace-nowrap dark:bg-input/30"
        >
          <span className="min-w-0 truncate text-left">{selectedLabel}</span>
          <ChevronDownIcon
            data-icon="inline-end"
            className="shrink-0 text-muted-foreground"
          />
        </Button>
      </SearchablePopoverTrigger>
      <SearchablePopoverContent
        align="start"
        sideOffset={4}
        searchValue={search}
        searchPlaceholder={messages.common.search}
        searchInputProps={{ autoFocus: true }}
        resultsMaxHeight="18rem"
        onSearchValueChange={setSearch}
      >
        <div>
          {filteredGroups.map((group, index) => (
            <div key={group.key}>
              {index > 0 ? (
                <div
                  role="separator"
                  className="pointer-events-none -mx-1 h-px bg-border"
                />
              ) : null}
              <div className="px-2 py-2 text-xs text-muted-foreground">
                {group.label}
              </div>
              {group.fields.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={field === entry.id}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-md py-2 pr-8 pl-2 text-left text-xs outline-hidden transition-colors select-none hover:bg-accent hover:text-accent-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground"
                  onClick={() => {
                    onSelect(entry.id);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    {field === entry.id ? (
                      <CheckIcon className="pointer-events-none" />
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate">{entry.label}</span>
                </button>
              ))}
            </div>
          ))}
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {messages.common.noData}
            </div>
          ) : null}
        </div>
      </SearchablePopoverContent>
    </SearchablePopover>
  );
}

function ConditionEditor({
  condition,
  context,
  index,
  onChange,
  onRemove,
}: {
  readonly condition: EditorCondition;
  readonly context: ConditionContext;
  readonly index: number;
  readonly onChange: (
    update: (condition: EditorCondition) => EditorCondition,
  ) => void;
  readonly onRemove: () => void;
}) {
  const { messages } = context;
  const definition = analyticsFilterRegistry.get(condition.field);
  const operators = [...(definition?.operators ?? [])];
  const needsValue = !VALUELESS_OPERATORS.has(condition.operator);
  const isPayload = condition.field === EVENT_PAYLOAD_FIELD;
  const valueDisabled = isPayload && !condition.payloadPath.trim();
  const valueKind = isPayload
    ? condition.scalarKind
    : (definition?.valueKind ?? "string");
  const setField = (field: string) => {
    const next = analyticsFilterRegistry.get(field);
    if (!next) return;
    onChange((current) => ({
      ...current,
      field,
      payloadPath: "",
      operator: firstOperator(next),
      value: undefined,
      listValues: undefined,
      valueText: "",
      scalarKind: "string",
      valueDirty: true,
    }));
  };
  const setOperator = (value: string) => {
    const operator = value as FilterOperator;
    if (!operators.includes(operator)) return;
    onChange((current) => ({
      ...current,
      operator,
      value: VALUELESS_OPERATORS.has(operator) ? undefined : current.value,
      valueDirty: !VALUELESS_OPERATORS.has(operator),
    }));
  };
  const setValueText = (valueText: string) =>
    onChange((current) => ({ ...current, valueText, valueDirty: true }));
  const setListValues = (values: readonly FilterValue[]) =>
    onChange((current) => ({
      ...current,
      value: values,
      listValues: values,
      valueText: values.map((value) => String(value ?? "")).join(", "),
      valueDirty: true,
    }));
  const setScalarKind = (scalarKind: string) => {
    if (
      scalarKind !== "string" &&
      scalarKind !== "number" &&
      scalarKind !== "boolean"
    )
      return;
    onChange((current) => ({
      ...current,
      scalarKind,
      value: undefined,
      listValues: undefined,
      valueText: "",
      valueDirty: true,
    }));
  };

  return (
    <div className="grid gap-2 border-l border-border pl-3 pb-3 sm:grid-cols-2">
      <div className="text-xs font-medium text-muted-foreground sm:col-span-2">
        {formatI18nTemplate(messages.filterBuilder.condition, {
          index: index + 1,
        })}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
        <FieldPicker
          audience={context.audience}
          field={condition.field}
          messages={messages}
          onSelect={setField}
        />
        <Select value={condition.operator} onValueChange={setOperator}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {messages.filterBuilder.operatorLabels[operator] ?? operator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPayload ? (
        <div className="space-y-2 sm:col-span-2">
          <SearchablePayloadPathInput
            condition={condition}
            document={context.document}
            eventName={context.eventName}
            messages={messages}
            needsValue={needsValue}
            siteId={context.siteId}
            window={context.window}
            onChange={(payloadPath) =>
              onChange((current) => ({ ...current, payloadPath }))
            }
            onSelect={(field) =>
              onChange((current) => ({
                ...current,
                payloadPath: field.path,
                ...(isSelectablePayloadFieldType(field.valueType)
                  ? {
                      scalarKind: field.valueType,
                      value: undefined,
                      listValues: undefined,
                      valueText: "",
                      valueDirty: true,
                    }
                  : {}),
              }))
            }
          />
        </div>
      ) : null}

      {isPayload && needsValue ? (
        <Select value={condition.scalarKind} onValueChange={setScalarKind}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string">
              {messages.filterBuilder.valueKinds.string}
            </SelectItem>
            <SelectItem value="number">
              {messages.filterBuilder.valueKinds.number}
            </SelectItem>
            <SelectItem value="boolean">
              {messages.filterBuilder.valueKinds.boolean}
            </SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {needsValue ? (
        <div className="space-y-2 sm:col-span-2">
          {valueKind === "boolean" ? (
            <Select
              disabled={valueDisabled}
              value={condition.valueText || undefined}
              onValueChange={setValueText}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={messages.filterBuilder.valueUnset} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  {messages.filterBuilder.booleanTrue}
                </SelectItem>
                <SelectItem value="false">
                  {messages.filterBuilder.booleanFalse}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : condition.operator === FilterOperator.Between ? (
            <RangeValueInput
              condition={condition}
              disabled={valueDisabled}
              inputMode={valueKind === "number" ? "decimal" : undefined}
              messages={messages}
              numberMetadata={definition?.number}
              numberUnit={valueKind === "number" ? definition?.unit : undefined}
              onChange={setValueText}
            />
          ) : (
            <SearchableValueInput
              condition={condition}
              disabled={valueDisabled}
              document={context.document}
              eventName={context.eventName}
              messages={messages}
              siteId={context.siteId}
              valueKind={valueKind}
              window={context.window}
              onChange={setValueText}
              onListChange={setListValues}
            />
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          aria-label={messages.teamManagement.notifications.removeCondition}
          onClick={onRemove}
        >
          <Trash2Icon />
          <span className="sr-only">
            {messages.teamManagement.notifications.removeCondition}
          </span>
        </Button>
      </div>
    </div>
  );
}

/** The filter's conditions, every one of which must match. */
export function ConditionListEditor({
  conditions,
  createId,
  onChange,
  ...context
}: ConditionContext & {
  readonly conditions: readonly EditorCondition[];
  readonly createId: () => string;
  readonly onChange: (conditions: readonly EditorCondition[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {context.messages.filterBuilder.allConditions}
      </p>
      <AutoResizer initial={false} duration={0.18}>
        <div className="space-y-2">
          <AnimatePresence initial={false} mode="popLayout">
            {conditions.map((condition, index) => (
              <motion.div
                key={condition.id}
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <ConditionEditor
                  condition={condition}
                  context={context}
                  index={index}
                  onChange={(update) =>
                    onChange(
                      conditions.map((current) =>
                        current.id === condition.id ? update(current) : current,
                      ),
                    )
                  }
                  onRemove={() =>
                    onChange(
                      conditions.filter(
                        (current) => current.id !== condition.id,
                      ),
                    )
                  }
                />
              </motion.div>
            ))}
            <motion.div
              key="filter-actions"
              layout="position"
              transition={{ duration: 0.18 }}
              className="flex flex-wrap gap-2"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChange([...conditions, defaultCondition(createId)])
                }
              >
                <PlusIcon data-icon="inline-start" />
                <span>
                  {context.messages.teamManagement.notifications.addCondition}
                </span>
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </AutoResizer>
    </div>
  );
}
