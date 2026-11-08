import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Button } from "@insightflare/ui/button";
import { Input } from "@insightflare/ui/input";
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
import { Spinner } from "@insightflare/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@insightflare/ui/tooltip";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";

import {
  convertCanonicalTextToDisplay,
  convertDisplayTextToCanonical,
  type FilterNumberCanonicalUnit,
  type FilterNumberDisplayUnit,
  getFilterNumberDisplayUnits,
  toDisplayNumberMetadata,
} from "@/components/dashboard/filters/filter-number-units";
import type { DashboardFilterOptionKey } from "@/lib/dashboard/client/data/index";
import {
  fetchFilterValues,
  fetchPropertyKeys,
  fetchPropertyValues,
} from "@/lib/dashboard/client/data/index";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  type FilterValue,
  type FilterValueKind,
  PROPERTY_FIELD,
  type RegisteredFilterField,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";

import type { EditorCondition, ValueSuggestionPage } from "./model";
import {
  filterValueKey,
  filterValueText,
  LIST_OPERATORS,
  stripSuggestionFacet,
} from "./model";
/**
 * The custom property keys seen in the period under the other conditions,
 * the most visitors first; the search keeps those that contain it. A key
 * can be typed too, for one the period hasn't seen.
 */
export function SearchablePropertyKeyInput({
  condition,
  document,
  messages,
  onChange,
  onSelect,
  siteId,
  window,
}: {
  condition: EditorCondition;
  document: FilterDocument;
  messages: AppMessages;
  onChange: (propertyKey: string) => void;
  onSelect: (propertyKey: string) => void;
  siteId: string | undefined;
  window: TimeWindow | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const deferredSearchToken = useDeferredValue(searchToken);
  const suggestionFilters = useMemo(
    () =>
      stripSuggestionFacet(document, condition.field, condition.propertyKey),
    [condition.field, condition.propertyKey, document],
  );
  const keysQuery = useQuery({
    queryKey: [
      "dashboard",
      "property-keys",
      siteId,
      window?.from,
      window?.to,
      window?.timeZone,
      suggestionFilters,
    ],
    queryFn: ({ signal }) =>
      fetchPropertyKeys(siteId!, window!, suggestionFilters, { signal }),
    enabled: open && Boolean(siteId && window),
  });
  const suggestions = useMemo(() => {
    const search = deferredSearchToken.trim().toLocaleLowerCase();
    return (keysQuery.data?.data.items ?? []).filter(
      (item) => !search || item.key.toLocaleLowerCase().includes(search),
    );
  }, [deferredSearchToken, keysQuery.data]);
  const menuState = keysQuery.isError
    ? "error"
    : keysQuery.isFetching
      ? "loading"
      : suggestions.length > 0
        ? "suggestions"
        : "empty";

  useEffect(() => {
    if (open) setSearchToken("");
  }, [condition.field, condition.id, open]);

  return (
    <SearchablePopover open={open} onOpenChange={setOpen}>
      <SearchablePopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full justify-between pr-2 text-xs font-normal"
        >
          <span className="min-w-0 truncate text-left">
            {condition.propertyKey || messages.filterBuilder.valueUnset}
          </span>
          <ChevronDownIcon
            data-icon="inline-end"
            className="shrink-0 text-muted-foreground"
          />
        </Button>
      </SearchablePopoverTrigger>
      <SearchablePopoverContent
        align="start"
        sideOffset={4}
        searchValue={searchToken}
        searchPlaceholder={messages.filterBuilder.propertyKeyPlaceholder}
        searchInputProps={{ autoFocus: true, className: "font-mono" }}
        resultsMaxHeight="14rem"
        syncKey={suggestions.length}
        onSearchValueChange={(next) => {
          setSearchToken(next);
          onChange(next.trim());
        }}
      >
        <AutoResizer className="min-h-0 flex-1" initial duration={0.18}>
          <AutoTransition transitionKey={menuState} duration={0.18}>
            {menuState === "error" ? (
              <div className="flex min-h-10 items-center justify-center gap-2 text-xs text-destructive">
                <span>{messages.common.loadFailed}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void keysQuery.refetch()}
                >
                  {messages.common.retry}
                </Button>
              </div>
            ) : menuState === "loading" ? (
              <div className="flex min-h-10 items-center justify-center text-muted-foreground">
                <Spinner aria-label={messages.filterBuilder.valueLoading} />
              </div>
            ) : menuState === "suggestions" ? (
              <div className="pt-1">
                {suggestions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    data-selected-item={
                      condition.propertyKey === item.key ? "true" : undefined
                    }
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                    onClick={() => {
                      onSelect(item.key);
                      setSearchToken("");
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate font-mono">
                      {item.key}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </AutoTransition>
        </AutoResizer>
      </SearchablePopoverContent>
    </SearchablePopover>
  );
}
function filterNumberUnitLabel(
  unit: FilterNumberDisplayUnit,
  messages: AppMessages,
): string {
  switch (unit) {
    case "hours":
      return messages.filterBuilder.units.hours;
    case "minutes":
      return messages.filterBuilder.units.minutes;
    case "seconds":
      return messages.filterBuilder.units.seconds;
    case "milliseconds":
      return messages.filterBuilder.units.milliseconds;
    case "percent":
    case "%":
      return messages.filterBuilder.units.percent;
    case "per-mille":
      return messages.filterBuilder.units.perMille;
    case "px":
      return messages.filterBuilder.units.pixels;
  }
}
function defaultFilterNumberDisplayUnit(
  canonicalUnit: FilterNumberCanonicalUnit,
): FilterNumberDisplayUnit {
  switch (canonicalUnit) {
    case "ms":
      return "milliseconds";
    case "ratio":
      return "percent";
    case "px":
      return "px";
    case "%":
      return "%";
  }
}
function FilterNumberUnitSelect({
  canonicalUnit,
  disabled = false,
  displayUnit,
  messages,
  onChange,
}: {
  canonicalUnit: FilterNumberCanonicalUnit;
  disabled?: boolean;
  displayUnit: FilterNumberDisplayUnit;
  messages: AppMessages;
  onChange: (unit: FilterNumberDisplayUnit) => void;
}) {
  const units = getFilterNumberDisplayUnits(canonicalUnit);
  return (
    <Select
      value={displayUnit}
      disabled={disabled || units.length <= 1}
      onValueChange={(value) => {
        if (units.includes(value as FilterNumberDisplayUnit)) {
          onChange(value as FilterNumberDisplayUnit);
        }
      }}
    >
      <SelectTrigger
        aria-label={messages.filterBuilder.unitAriaLabel}
        className="w-full"
      >
        <SelectValue>
          {filterNumberUnitLabel(displayUnit, messages)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem key={unit} value={unit}>
            {filterNumberUnitLabel(unit, messages)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function SearchableValueInput({
  condition,
  disabled = false,
  document,
  messages,
  onChange,
  onListChange,
  siteId,
  valueKind,
  window,
}: {
  condition: EditorCondition;
  disabled?: boolean;
  document: FilterDocument;
  messages: AppMessages;
  onChange: (valueText: string) => void;
  onListChange: (values: readonly FilterValue[]) => void;
  siteId: string | undefined;
  valueKind: FilterValueKind;
  window: TimeWindow | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [searchToken, setSearchToken] = useState("");
  const deferredSearchToken = useDeferredValue(searchToken);
  const isProperty = condition.field === PROPERTY_FIELD;
  const definition = analyticsFilterRegistry.get(condition.field) as
    RegisteredFilterField | undefined;
  const suggestionMode = definition?.suggestionMode ?? "none";
  const suggestionFilters = useMemo(
    () =>
      stripSuggestionFacet(document, condition.field, condition.propertyKey),
    [condition.field, condition.propertyKey, document],
  );
  const isList = LIST_OPERATORS.has(condition.operator);
  const selectedValues = isList
    ? (condition.listValues ??
      (Array.isArray(condition.value) ? condition.value : []))
    : [];
  const canSearch = Boolean(
    siteId && window && (!isProperty || condition.propertyKey.trim()),
  );
  const suggestionsQuery = useInfiniteQuery<ValueSuggestionPage>({
    queryKey: [
      "dashboard",
      isProperty ? "property-values" : "filter-values",
      siteId,
      window?.from,
      window?.to,
      window?.timeZone,
      isProperty ? condition.propertyKey : condition.field,
      suggestionMode,
      deferredSearchToken,
      suggestionFilters,
    ],
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) => {
      // A property's values come in one page, the most visitors first.
      if (isProperty) {
        return fetchPropertyValues(
          siteId!,
          window!,
          condition.propertyKey,
          suggestionFilters,
          {
            limit: 12,
            search: deferredSearchToken,
            sort: "visitors",
            direction: "desc",
            signal,
          },
        ).then((result) => ({
          items: result.data.items.map((item) => ({
            value: item.value,
            occurrences: item.visitors,
            label: item.value,
          })),
          pagination: {
            limit: 12,
            returned: result.data.items.length,
            hasMore: false,
            nextCursor: null,
          },
        }));
      }
      return fetchFilterValues(
        siteId!,
        window!,
        condition.field as DashboardFilterOptionKey,
        suggestionFilters,
        {
          limit: 12,
          cursor: pageParam as string | null,
          search: deferredSearchToken,
          signal,
        },
      ).then((result) => ({
        items: result.items,
        pagination: result.pagination,
      }));
    },
    enabled: open && canSearch && !disabled && suggestionMode !== "none",
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination.nextCursor : undefined,
  });
  const suggestions =
    suggestionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  // A further page loads below the values already listed.
  const loadingSuggestions =
    suggestionsQuery.isFetching && !suggestionsQuery.isFetchingNextPage;
  const inputMode = valueKind === "number" ? "decimal" : undefined;
  const inputType = valueKind === "number" ? "number" : "text";
  const numberMetadata = definition?.number;
  const numberUnit = valueKind === "number" ? definition?.unit : undefined;
  const [selectedDisplayUnit, setSelectedDisplayUnit] = useState<
    FilterNumberDisplayUnit | undefined
  >(() =>
    numberUnit ? defaultFilterNumberDisplayUnit(numberUnit) : undefined,
  );
  const displayUnit = numberUnit
    ? (selectedDisplayUnit ?? defaultFilterNumberDisplayUnit(numberUnit))
    : undefined;
  const displayMetadata = toDisplayNumberMetadata(
    numberMetadata,
    numberUnit,
    displayUnit,
  );

  useEffect(() => {
    setSelectedDisplayUnit(
      numberUnit ? defaultFilterNumberDisplayUnit(numberUnit) : undefined,
    );
  }, [condition.field, condition.id, numberUnit]);

  const displayValueText = numberUnit
    ? convertCanonicalTextToDisplay(
        condition.valueText,
        numberUnit,
        displayUnit,
      )
    : condition.valueText;
  const canonicalTextFromDisplay = (valueText: string) =>
    numberUnit
      ? convertDisplayTextToCanonical(valueText, displayUnit, numberUnit)
      : valueText;

  const menuState = loadingSuggestions
    ? "loading"
    : suggestions.length > 0
      ? "suggestions"
      : "empty";

  useEffect(() => {
    if (open) setSearchToken("");
  }, [condition.id, condition.field, condition.operator, open]);

  if (suggestionMode === "none" && !isList) {
    return (
      <div
        className={cn(
          "grid gap-2",
          numberUnit && "sm:grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)]",
        )}
      >
        <Input
          disabled={disabled}
          type={inputType}
          value={displayValueText}
          inputMode={inputMode}
          min={displayMetadata?.min ?? numberMetadata?.min}
          max={displayMetadata?.max ?? numberMetadata?.max}
          step={displayMetadata?.step ?? numberMetadata?.step}
          onChange={(event) =>
            onChange(canonicalTextFromDisplay(event.target.value))
          }
        />
        {numberUnit && displayUnit ? (
          <FilterNumberUnitSelect
            canonicalUnit={numberUnit}
            displayUnit={displayUnit}
            messages={messages}
            onChange={setSelectedDisplayUnit}
          />
        ) : null}
      </div>
    );
  }

  const addListValue = (value: FilterValue, valueIsCanonical = false) => {
    if (typeof value === "string" && !value.trim()) return;
    const canonicalValue =
      !valueIsCanonical &&
      numberUnit &&
      displayUnit &&
      typeof value === "string"
        ? Number(convertDisplayTextToCanonical(value, displayUnit, numberUnit))
        : value;
    if (
      numberUnit &&
      typeof canonicalValue === "number" &&
      !Number.isFinite(canonicalValue)
    ) {
      return;
    }
    const nextValues = selectedValues.some(
      (selected) => filterValueKey(selected) === filterValueKey(canonicalValue),
    )
      ? selectedValues
      : [...selectedValues, canonicalValue];
    onListChange(nextValues);
    setSearchToken("");
  };

  return (
    <div
      className={cn(
        "grid gap-2",
        numberUnit && "sm:grid-cols-[minmax(0,2fr)_minmax(6rem,1fr)]",
      )}
    >
      <SearchablePopover open={open} onOpenChange={setOpen}>
        <SearchablePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-8 w-full justify-between pr-2 text-xs font-normal"
          >
            <span className="min-w-0 truncate text-left">
              {isList
                ? selectedValues
                    .map((value) =>
                      numberUnit && displayUnit
                        ? convertCanonicalTextToDisplay(
                            filterValueText(value),
                            numberUnit,
                            displayUnit,
                          )
                        : filterValueText(value),
                    )
                    .join(", ") || messages.filterBuilder.valueUnset
                : displayValueText || messages.filterBuilder.valueUnset}
            </span>
            <ChevronDownIcon className="shrink-0 text-muted-foreground" />
          </Button>
        </SearchablePopoverTrigger>
        <SearchablePopoverContent
          align="start"
          sideOffset={4}
          searchValue={searchToken}
          searchPlaceholder={
            isList
              ? messages.filterBuilder.valueListPlaceholder
              : messages.filterBuilder.valueSearchPlaceholder
          }
          searchInputProps={{
            autoFocus: true,
            disabled,
            type: inputType,
            inputMode,
            min: displayMetadata?.min ?? numberMetadata?.min,
            max: displayMetadata?.max ?? numberMetadata?.max,
            step: displayMetadata?.step ?? numberMetadata?.step,
            onKeyDown: (event) => {
              if (isList && event.key === "Enter") {
                event.preventDefault();
                addListValue(searchToken);
              }
            },
          }}
          resultsMaxHeight="14rem"
          syncKey={suggestions.length}
          onSearchValueChange={(next) => {
            setSearchToken(next);
            if (!isList) onChange(canonicalTextFromDisplay(next));
          }}
          header={
            isList && selectedValues.length > 0 ? (
              <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
                {selectedValues.map((value) => {
                  const displayText =
                    numberUnit && displayUnit
                      ? convertCanonicalTextToDisplay(
                          filterValueText(value),
                          numberUnit,
                          displayUnit,
                        )
                      : filterValueText(value);
                  const removeValueLabel = formatI18nTemplate(
                    messages.filterBuilder.removeValue,
                    { value: displayText },
                  );

                  return (
                    <Tooltip key={filterValueKey(value)}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="max-w-full truncate bg-muted px-1.5 py-0.5 text-xs hover:bg-accent"
                          aria-label={removeValueLabel}
                          onClick={() =>
                            onListChange(
                              selectedValues.filter(
                                (selected) =>
                                  filterValueKey(selected) !==
                                  filterValueKey(value),
                              ),
                            )
                          }
                        >
                          {displayText}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{removeValueLabel}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ) : null
          }
        >
          <AutoResizer className="min-h-0 flex-1" initial duration={0.18}>
            <AutoTransition transitionKey={menuState} duration={0.18}>
              {loadingSuggestions ? (
                <div className="flex min-h-10 items-center justify-center text-muted-foreground">
                  <Spinner aria-label={messages.filterBuilder.valueLoading} />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="pt-1">
                  {suggestions.map((item) => {
                    const value = item.value;
                    const label = "label" in item ? item.label : value;
                    return (
                      <button
                        key={`${typeof value}:${filterValueKey(value)}`}
                        type="button"
                        data-selected-item={
                          (
                            isList
                              ? selectedValues.some(
                                  (selected) =>
                                    filterValueKey(selected) ===
                                    filterValueKey(value),
                                )
                              : filterValueText(value) === condition.valueText
                          )
                            ? "true"
                            : undefined
                        }
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                        onClick={() => {
                          if (isList) {
                            addListValue(value, true);
                          } else {
                            const valueText = filterValueText(value);
                            const displayText =
                              numberUnit && displayUnit
                                ? convertCanonicalTextToDisplay(
                                    valueText,
                                    numberUnit,
                                    displayUnit,
                                  )
                                : valueText;
                            onChange(valueText);
                            setSearchToken(displayText);
                            setOpen(false);
                          }
                        }}
                      >
                        <span className="min-w-0 truncate">
                          {label ?? filterValueText(value)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.occurrences ?? 0}
                        </span>
                      </button>
                    );
                  })}
                  {suggestionsQuery.hasNextPage ? (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      disabled={suggestionsQuery.isFetchingNextPage}
                      onClick={() => void suggestionsQuery.fetchNextPage()}
                    >
                      {suggestionsQuery.isFetchingNextPage ? (
                        <Spinner
                          aria-label={messages.filterBuilder.valueLoading}
                        />
                      ) : (
                        messages.filterBuilder.valueShowMore
                      )}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </AutoTransition>
          </AutoResizer>
        </SearchablePopoverContent>
      </SearchablePopover>
      {numberUnit && displayUnit ? (
        <FilterNumberUnitSelect
          canonicalUnit={numberUnit}
          displayUnit={displayUnit}
          messages={messages}
          onChange={setSelectedDisplayUnit}
        />
      ) : null}
    </div>
  );
}
export function RangeValueInput({
  condition,
  disabled = false,
  inputMode,
  messages,
  numberMetadata,
  numberUnit,
  onChange,
}: {
  condition: EditorCondition;
  disabled?: boolean;
  inputMode?: "decimal";
  messages: AppMessages;
  numberMetadata?: RegisteredFilterField["number"];
  numberUnit?: FilterNumberCanonicalUnit;
  onChange: (valueText: string) => void;
}) {
  const [lower = "", upper = ""] = condition.valueText.split(",", 2);
  const [selectedDisplayUnit, setSelectedDisplayUnit] = useState<
    FilterNumberDisplayUnit | undefined
  >(() =>
    numberUnit ? defaultFilterNumberDisplayUnit(numberUnit) : undefined,
  );
  const displayUnit = numberUnit
    ? (selectedDisplayUnit ?? defaultFilterNumberDisplayUnit(numberUnit))
    : undefined;
  const displayMetadata = toDisplayNumberMetadata(
    numberMetadata,
    numberUnit,
    displayUnit,
  );
  useEffect(() => {
    setSelectedDisplayUnit(
      numberUnit ? defaultFilterNumberDisplayUnit(numberUnit) : undefined,
    );
  }, [condition.field, condition.id, numberUnit]);
  const displayLower =
    numberUnit && displayUnit
      ? convertCanonicalTextToDisplay(lower, numberUnit, displayUnit)
      : lower.trim();
  const displayUpper =
    numberUnit && displayUnit
      ? convertCanonicalTextToDisplay(upper, numberUnit, displayUnit)
      : upper.trim();
  const updateEndpoint = (index: 0 | 1, value: string) => {
    const canonicalValue =
      numberUnit && displayUnit
        ? convertDisplayTextToCanonical(value, displayUnit, numberUnit)
        : value;
    onChange(
      index === 0
        ? `${canonicalValue}, ${upper.trim()}`
        : `${lower.trim()}, ${canonicalValue}`,
    );
  };
  return (
    <div
      className={cn(
        "grid gap-2",
        numberUnit ? "sm:grid-cols-3" : "sm:grid-cols-2",
      )}
    >
      <Input
        disabled={disabled}
        type={numberMetadata ? "number" : undefined}
        value={displayLower}
        inputMode={inputMode}
        min={displayMetadata?.min ?? numberMetadata?.min}
        max={displayMetadata?.max ?? numberMetadata?.max}
        step={displayMetadata?.step ?? numberMetadata?.step}
        placeholder={messages.filterBuilder.rangeStartPlaceholder}
        onChange={(event) => updateEndpoint(0, event.target.value)}
      />
      <Input
        disabled={disabled}
        type={numberMetadata ? "number" : undefined}
        value={displayUpper}
        inputMode={inputMode}
        min={displayMetadata?.min ?? numberMetadata?.min}
        max={displayMetadata?.max ?? numberMetadata?.max}
        step={displayMetadata?.step ?? numberMetadata?.step}
        placeholder={messages.filterBuilder.rangeEndPlaceholder}
        onChange={(event) => updateEndpoint(1, event.target.value)}
      />
      {numberUnit && displayUnit ? (
        <FilterNumberUnitSelect
          canonicalUnit={numberUnit}
          displayUnit={displayUnit}
          messages={messages}
          onChange={setSelectedDisplayUnit}
        />
      ) : null}
    </div>
  );
}
