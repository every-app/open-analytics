import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Input } from "@insightflare/ui/input";
import { Label } from "@insightflare/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { UserIcon } from "lucide-react";

import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  SYSTEM_FILTER_PRESETS,
  type SystemFilterPreset,
  systemFilterPresetAvailableForAudience,
  systemFilterPresetFromOptionValue,
  systemFilterPresetOptionValue,
} from "@/lib/dashboard/system-filter-presets";
import {
  type FilterDocument,
  type FilterScope,
  type FilterScopePreference,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type {
  SavedFilter,
  SavedFilterInput,
  SavedFilterVisibility,
} from "@/lib/saved-filters";

import type { FilterPanelAudience } from "./filter-editor/model";
export const NO_SAVED_FILTER_VALUE = "__no_saved_filter__";
export const EMPTY_SAVED_FILTER_FORM = {
  name: "",
  description: "",
  visibility: "private",
  scopePreference: "auto",
} as const satisfies Omit<SavedFilterInput, "filterDsl">;
export type SavedFilterForm = Omit<SavedFilterInput, "filterDsl">;
export type SystemPresetCopy = {
  readonly name: string;
  readonly description: string;
};
export function systemPresetItem(
  messages: AppMessages,
  preset: SystemFilterPreset,
): SystemPresetCopy {
  return messages.filterBuilder.systemPresetItems[preset.id];
}
export function systemPresetScopeLabel(
  messages: AppMessages,
  scope: SystemFilterPreset["scope"],
): string {
  return messages.filterBuilder.systemPresetScopes[scope];
}
export function systemPresetScopeForApply(
  preset: SystemFilterPreset,
  currentScope: FilterScopePreference,
): FilterScopePreference {
  return preset.scope === "preserve" ? currentScope : preset.scope;
}
export function systemPresetMatchesScope(
  preset: SystemFilterPreset,
  currentScope: FilterScopePreference,
): boolean {
  return preset.scope === "preserve" || preset.scope === currentScope;
}
export function SavedFilterSelect({
  audience,
  matchedSavedFilter,
  matchedSystemPreset,
  messages,
  savedFilterTriggerKey,
  savedFilterTriggerLabel,
  savedFilters,
  savedFiltersLoading,
  onApplySavedFilter,
  onApplySystemPreset,
  onClearSavedFilter,
}: {
  readonly audience: FilterPanelAudience;
  readonly matchedSavedFilter?: SavedFilter;
  readonly matchedSystemPreset?: SystemFilterPreset;
  readonly messages: AppMessages;
  readonly savedFilterTriggerKey: string;
  readonly savedFilterTriggerLabel: string;
  readonly savedFilters: readonly SavedFilter[];
  readonly savedFiltersLoading: boolean;
  readonly onApplySavedFilter: (filter: SavedFilter) => void;
  readonly onApplySystemPreset: (preset: SystemFilterPreset) => void;
  readonly onClearSavedFilter: () => void;
}) {
  const visibleSystemPresets = SYSTEM_FILTER_PRESETS.filter((preset) =>
    systemFilterPresetAvailableForAudience(preset, audience),
  );

  return (
    <Select
      value={
        matchedSavedFilter?.id ??
        (matchedSystemPreset
          ? systemFilterPresetOptionValue(matchedSystemPreset.id)
          : NO_SAVED_FILTER_VALUE)
      }
      disabled={savedFiltersLoading}
      onValueChange={(value) => {
        if (value === NO_SAVED_FILTER_VALUE) {
          onClearSavedFilter();
          return;
        }
        const preset = systemFilterPresetFromOptionValue(value);
        if (preset) {
          onApplySystemPreset(preset);
          return;
        }
        const filter = savedFilters.find((item) => item.id === value);
        if (filter) onApplySavedFilter(filter);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          <AutoTransition
            transitionKey={savedFilterTriggerKey}
            type="fade"
            duration={0.18}
            initial={false}
          >
            <span>{savedFilterTriggerLabel}</span>
          </AutoTransition>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NO_SAVED_FILTER_VALUE}>
            {messages.filterBuilder.noSavedFilter}
          </SelectItem>
        </SelectGroup>
        {audience === "private-dashboard" &&
        savedFilters.some((filter) => filter.isOwner) ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>
                {messages.filterBuilder.savedFiltersPersonal}
              </SelectLabel>
              {savedFilters
                .filter((filter) => filter.isOwner)
                .map((filter) => (
                  <SelectItem key={filter.id} value={filter.id}>
                    {filter.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </>
        ) : null}
        {audience === "private-dashboard" &&
        savedFilters.some((filter) => !filter.isOwner) ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>
                {messages.filterBuilder.savedFiltersTeam}
              </SelectLabel>
              {savedFilters
                .filter((filter) => !filter.isOwner)
                .map((filter) => (
                  <SelectItem key={filter.id} value={filter.id}>
                    {filter.name}
                  </SelectItem>
                ))}
            </SelectGroup>
          </>
        ) : null}
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>{messages.filterBuilder.systemPresets}</SelectLabel>
          {visibleSystemPresets.map((preset) => (
            <SelectItem
              key={preset.id}
              value={systemFilterPresetOptionValue(preset.id)}
            >
              {systemPresetItem(messages, preset).name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
export interface FilterPanelProps {
  readonly audience: FilterPanelAudience;
  readonly document: FilterDocument;
  /** Raw DSL associated with the active query document, when available. */
  readonly expressionText?: string;
  readonly messages: AppMessages;
  readonly open: boolean;
  readonly siteId?: string;
  /** Concrete scope resolved by the parent page for the active operation. */
  readonly resolvedScope?: FilterScope;
  readonly scopePreference: FilterScopePreference;
  readonly window?: TimeWindow;
  readonly onApply: (
    document: FilterDocument,
    rawDsl?: string,
    options?: { readonly closePanel?: boolean },
  ) => void;
  readonly onScopeChange: (preference: FilterScopePreference) => void;
}
export function SavedFilterFormFields({
  form,
  messages,
  onChange,
}: {
  form: SavedFilterForm;
  messages: AppMessages;
  onChange: (next: SavedFilterForm) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="saved-filter-name">
          {messages.filterBuilder.savedFilterName}
        </Label>
        <Input
          id="saved-filter-name"
          maxLength={120}
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="saved-filter-description">
          {messages.filterBuilder.savedFilterDescription}
        </Label>
        <textarea
          id="saved-filter-description"
          className="flex min-h-20 w-full resize-y border border-input bg-transparent px-2 py-1.5 text-xs shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          maxLength={2_000}
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>{messages.filterBuilder.scopeLabel}</Label>
        <Select
          value={form.scopePreference ?? "auto"}
          onValueChange={(scopePreference) =>
            onChange({
              ...form,
              scopePreference: scopePreference as FilterScopePreference,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              {messages.filterBuilder.scopeAuto}
            </SelectItem>
            <SelectItem value="event">
              {messages.filterBuilder.scopeEvent}
            </SelectItem>
            <SelectItem value="session">
              {messages.filterBuilder.scopeSession}
            </SelectItem>
            <SelectItem value="visitor">
              {messages.filterBuilder.scopeVisitor}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{messages.filterBuilder.savedFilterVisibility}</Label>
        <Select
          value={form.visibility}
          onValueChange={(visibility) =>
            onChange({
              ...form,
              visibility: visibility as SavedFilterVisibility,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">
              {messages.filterBuilder.savedFilterVisibilityPrivate}
            </SelectItem>
            <SelectItem value="team">
              {messages.filterBuilder.savedFilterVisibilityTeam}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
export function FilterPanelHeader({
  audience,
  matchedSavedFilter,
  matchedSystemPreset,
  messages,
  savedFilterTriggerKey,
  savedFilterTriggerLabel,
  savedFilters,
  savedFiltersLoading,
  onApplySavedFilter,
  onApplySystemPreset,
  onClearSavedFilter,
}: {
  audience: FilterPanelAudience;
  matchedSavedFilter?: SavedFilter;
  matchedSystemPreset?: SystemFilterPreset;
  messages: AppMessages;
  savedFilterTriggerKey: string;
  savedFilterTriggerLabel: string;
  savedFilters: readonly SavedFilter[];
  savedFiltersLoading: boolean;
  onApplySavedFilter: (filter: SavedFilter) => void;
  onApplySystemPreset: (preset: SystemFilterPreset) => void;
  onClearSavedFilter: () => void;
}) {
  return (
    <div className="mb-4 border-b border-border pb-4">
      <SavedFilterSelect
        audience={audience}
        matchedSavedFilter={matchedSavedFilter}
        matchedSystemPreset={matchedSystemPreset}
        messages={messages}
        savedFilterTriggerKey={savedFilterTriggerKey}
        savedFilterTriggerLabel={savedFilterTriggerLabel}
        savedFilters={savedFilters}
        savedFiltersLoading={savedFiltersLoading}
        onApplySavedFilter={onApplySavedFilter}
        onApplySystemPreset={onApplySystemPreset}
        onClearSavedFilter={onClearSavedFilter}
      />

      <AutoResizer initial={false} duration={0.18}>
        <AutoTransition
          transitionKey={
            matchedSavedFilter?.id ??
            (matchedSystemPreset
              ? systemFilterPresetOptionValue(matchedSystemPreset.id)
              : "none")
          }
          type="fade"
          duration={0.18}
          initial={false}
        >
          {matchedSavedFilter ? (
            <div className="space-y-1.5 pt-3 text-xs text-muted-foreground">
              {matchedSavedFilter.description ? (
                <p className="break-words">{matchedSavedFilter.description}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="size-3.5" aria-hidden />
                  {formatI18nTemplate(
                    messages.filterBuilder.savedFiltersAuthor,
                    { name: matchedSavedFilter.authorName },
                  )}
                </span>
                <span>
                  {matchedSavedFilter.visibility === "team"
                    ? messages.filterBuilder.savedFiltersTeamShared
                    : messages.filterBuilder.savedFiltersPrivate}
                </span>
              </div>
            </div>
          ) : matchedSystemPreset ? (
            <div className="space-y-1.5 pt-3 text-xs text-muted-foreground">
              <p>
                {systemPresetItem(messages, matchedSystemPreset).description}
              </p>
              <p>
                {systemPresetScopeLabel(messages, matchedSystemPreset.scope)}
              </p>
            </div>
          ) : null}
        </AutoTransition>
      </AutoResizer>
    </div>
  );
}
/** Which records a filter selects: events, sessions or visitors. */
export function FilterScopeSelect({
  messages,
  scopePreference,
  onScopeChange,
}: {
  messages: AppMessages;
  scopePreference: FilterScopePreference;
  onScopeChange: (preference: FilterScopePreference) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="filter-panel-scope">
        {messages.filterBuilder.scopeLabel}
      </Label>
      <Select
        value={scopePreference}
        onValueChange={(value) => onScopeChange(value as FilterScopePreference)}
      >
        <SelectTrigger id="filter-panel-scope" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">
            {messages.filterBuilder.scopeAuto}
          </SelectItem>
          <SelectItem value="event">
            {messages.filterBuilder.scopeEvent}
          </SelectItem>
          <SelectItem value="session">
            {messages.filterBuilder.scopeSession}
          </SelectItem>
          <SelectItem value="visitor">
            {messages.filterBuilder.scopeVisitor}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
