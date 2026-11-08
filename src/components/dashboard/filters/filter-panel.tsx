import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@insightflare/ui/alert-dialog";
import { Button } from "@insightflare/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@insightflare/ui/responsive-dialog";
import { Spinner } from "@insightflare/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";

import {
  createSavedFilter,
  deleteSavedFilter,
  fetchSavedFilters,
  updateSavedFilter,
} from "@/lib/dashboard/client/data/index";
import {
  SYSTEM_FILTER_PRESETS,
  type SystemFilterPreset,
  systemFilterPresetAvailableForAudience,
  systemFilterPresetOptionValue,
} from "@/lib/dashboard/system-filter-presets";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  filterFingerprint,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { SavedFilter } from "@/lib/saved-filters";

import type { EditorCondition } from "./filter-editor/model";
import {
  conditionIdFactory,
  documentFromEditor,
  editorConditionsFromDocument,
  filterDslFromEditor,
} from "./filter-editor/model";
import { FilterEditor, filterEditorError } from "./filter-editor";
import type {
  FilterPanelProps,
  SavedFilterForm,
} from "./saved-filter-controls";
import {
  EMPTY_SAVED_FILTER_FORM,
  FilterPanelHeader,
  SavedFilterFormFields,
  systemPresetItem,
} from "./saved-filter-controls";
export { SavedFilterSelect } from "./saved-filter-controls";

/** The fingerprint of a filter's DSL; undefined for one that doesn't parse. */
function dslFingerprint(filterDsl: string): string | undefined {
  try {
    return filterFingerprint(
      parseFilterDsl(filterDsl, analyticsFilterRegistry),
      analyticsFilterRegistry,
    );
  } catch {
    return undefined;
  }
}

export function FilterPanel({
  audience,
  document,
  messages,
  open,
  siteId,
  window,
  onApply,
}: FilterPanelProps) {
  const nextIdRef = useRef(conditionIdFactory());
  const createId = useCallback(() => nextIdRef.current(), []);
  const queryClient = useQueryClient();
  const [conditions, setConditions] = useState<readonly EditorCondition[]>(() =>
    editorConditionsFromDocument(document, createId),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createSavedFilterOpen, setCreateSavedFilterOpen] = useState(false);
  const [manageSavedFilterOpen, setManageSavedFilterOpen] = useState(false);
  const [confirmSavedFilterDeleteOpen, setConfirmSavedFilterDeleteOpen] =
    useState(false);
  const [managedSavedFilterId, setManagedSavedFilterId] = useState<
    string | undefined
  >();
  const [editingSavedFilterId, setEditingSavedFilterId] = useState<
    string | undefined
  >();
  const [savedFilterForm, setSavedFilterForm] = useState<SavedFilterForm>(
    EMPTY_SAVED_FILTER_FORM,
  );
  const [savedFilterOperationError, setSavedFilterOperationError] = useState<
    string | null
  >(null);
  const savedFiltersEnabled =
    audience === "private-dashboard" && open && Boolean(siteId);
  const savedFiltersQuery = useQuery({
    queryKey: ["saved-filters", siteId],
    queryFn: ({ signal }) => fetchSavedFilters(siteId!, { signal }),
    enabled: savedFiltersEnabled,
    staleTime: 60_000,
  });
  const savedFilters = savedFiltersQuery.data?.items ?? [];
  // The draft's DSL, or undefined while a condition is incomplete.
  const draftDsl = useMemo(() => {
    try {
      return filterDslFromEditor(conditions);
    } catch {
      return undefined;
    }
  }, [conditions]);
  const draftFingerprint = draftDsl ? dslFingerprint(draftDsl) : undefined;
  const invalidateSavedFilters = useCallback(() => {
    if (!siteId) return Promise.resolve();
    return queryClient.invalidateQueries({
      queryKey: ["saved-filters", siteId],
    });
  }, [queryClient, siteId]);
  const createSavedFilterMutation = useMutation({
    mutationFn: async (form: SavedFilterForm) => {
      if (!siteId || !draftDsl) throw new Error("missing site id or filter");
      return createSavedFilter(siteId, { ...form, filterDsl: draftDsl });
    },
    onSuccess: () => {
      setCreateSavedFilterOpen(false);
      setSavedFilterOperationError(null);
      void invalidateSavedFilters();
    },
    onError: () => {
      setSavedFilterOperationError(
        messages.filterBuilder.savedFilterOperationFailed,
      );
    },
  });
  const updateSavedFilterMutation = useMutation({
    mutationFn: async ({
      filterId,
      form,
      filterDsl,
    }: {
      filterId: string;
      form: SavedFilterForm;
      filterDsl: string;
      finishEditing?: boolean;
    }) => {
      if (!siteId) throw new Error("missing site id");
      return updateSavedFilter(siteId, filterId, { ...form, filterDsl });
    },
    onSuccess: (_result, variables) => {
      setManageSavedFilterOpen(false);
      if (variables.finishEditing) setEditingSavedFilterId(undefined);
      setSavedFilterOperationError(null);
      void invalidateSavedFilters();
    },
    onError: () => {
      setSavedFilterOperationError(
        messages.filterBuilder.savedFilterOperationFailed,
      );
    },
  });
  const deleteSavedFilterMutation = useMutation({
    mutationFn: async (filterId: string) => {
      if (!siteId) throw new Error("missing site id");
      return deleteSavedFilter(siteId, filterId);
    },
    onSuccess: () => {
      setConfirmSavedFilterDeleteOpen(false);
      setManageSavedFilterOpen(false);
      setManagedSavedFilterId(undefined);
      setEditingSavedFilterId(undefined);
      setSavedFilterOperationError(null);
      void invalidateSavedFilters();
    },
    onError: () => {
      setSavedFilterOperationError(
        messages.filterBuilder.savedFilterOperationFailed,
      );
    },
  });
  const matchedSavedFilter = useMemo(() => {
    if (!draftFingerprint) return undefined;
    const matches = savedFilters.filter(
      (filter) => dslFingerprint(filter.filterDsl) === draftFingerprint,
    );
    return matches.find((filter) => filter.isOwner) ?? matches[0];
  }, [draftFingerprint, savedFilters]);
  const matchedSystemPreset = useMemo(() => {
    if (matchedSavedFilter || !draftFingerprint) return undefined;
    return SYSTEM_FILTER_PRESETS.find(
      (preset) =>
        systemFilterPresetAvailableForAudience(preset, audience) &&
        dslFingerprint(preset.filterDsl) === draftFingerprint,
    );
  }, [audience, draftFingerprint, matchedSavedFilter]);
  const managedSavedFilter = savedFilters.find(
    (filter) => filter.id === managedSavedFilterId && filter.isOwner,
  );
  const editingSavedFilter = savedFilters.find(
    (filter) => filter.id === editingSavedFilterId && filter.isOwner,
  );
  const hasEffectiveFilter = conditions.length > 0 && draftDsl !== undefined;
  const savedFilterPrimaryAction =
    !savedFiltersEnabled || savedFiltersQuery.isFetching || !hasEffectiveFilter
      ? undefined
      : editingSavedFilter
        ? "finish"
        : matchedSavedFilter?.isOwner
          ? "manage"
          : matchedSavedFilter
            ? "save-as"
            : "save";
  const savedFilterTriggerLabel = savedFiltersQuery.isFetching
    ? messages.filterBuilder.savedFiltersLoading
    : matchedSavedFilter
      ? matchedSavedFilter.name
      : matchedSystemPreset
        ? systemPresetItem(messages, matchedSystemPreset).name
        : messages.filterBuilder.noSavedFilter;
  const savedFilterTriggerKey = savedFiltersQuery.isFetching
    ? "loading"
    : matchedSavedFilter
      ? `saved:${matchedSavedFilter.id}`
      : matchedSystemPreset
        ? systemFilterPresetOptionValue(matchedSystemPreset.id)
        : "none";

  // Opening the panel starts from the dashboard's current filter.
  const documentKey = JSON.stringify(document);
  useEffect(() => {
    if (!open) return;
    setConditions(editorConditionsFromDocument(document, createId));
    setValidationError(null);
    // The document's identity changes on every render; its content doesn't.
  }, [createId, documentKey, open]);

  const changeConditions = useCallback((next: readonly EditorCondition[]) => {
    setConditions(next);
    setValidationError(null);
  }, []);
  const apply = useCallback(() => {
    try {
      onApply(documentFromEditor(conditions));
    } catch (error) {
      setValidationError(filterEditorError(error, messages));
    }
  }, [conditions, messages, onApply]);
  /**
   * Applies a saved filter or preset and keeps the panel open on it. A saved
   * filter whose DSL no longer parses is refused with the parse error.
   */
  const applyFilterDsl = useCallback(
    (filterDsl: string) => {
      let document: FilterDocument;
      try {
        document = parseFilterDsl(filterDsl, analyticsFilterRegistry);
      } catch (error) {
        setValidationError(filterEditorError(error, messages));
        return;
      }
      changeConditions(editorConditionsFromDocument(document, createId));
      onApply(document, { closePanel: false });
    },
    [changeConditions, createId, messages, onApply],
  );
  const applySavedFilter = useCallback(
    (filter: SavedFilter) => applyFilterDsl(filter.filterDsl),
    [applyFilterDsl],
  );
  const applySystemPreset = useCallback(
    (preset: SystemFilterPreset) => applyFilterDsl(preset.filterDsl),
    [applyFilterDsl],
  );

  const openSavedFilterCreate = useCallback((source?: SavedFilter) => {
    setSavedFilterForm({
      name: source?.name ?? "",
      description: source?.description ?? "",
      visibility: "private",
    });
    setSavedFilterOperationError(null);
    setCreateSavedFilterOpen(true);
  }, []);

  const clearSavedFilter = useCallback(() => {
    changeConditions([]);
    onApply({ conditions: [] } satisfies FilterDocument, { closePanel: false });
  }, [changeConditions, onApply]);

  const openSavedFilterManagement = useCallback((filter: SavedFilter) => {
    setManagedSavedFilterId(filter.id);
    setSavedFilterForm({
      name: filter.name,
      description: filter.description,
      visibility: filter.visibility,
    });
    setSavedFilterOperationError(null);
    setManageSavedFilterOpen(true);
  }, []);

  const finishSavedFilterEditing = useCallback(() => {
    if (!editingSavedFilter || !draftDsl) return;
    setSavedFilterOperationError(null);
    updateSavedFilterMutation.mutate({
      filterId: editingSavedFilter.id,
      form: {
        name: editingSavedFilter.name,
        description: editingSavedFilter.description,
        visibility: editingSavedFilter.visibility,
      },
      filterDsl: draftDsl,
      finishEditing: true,
    });
  }, [draftDsl, editingSavedFilter, updateSavedFilterMutation]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <FilterEditor
        audience={audience}
        conditions={conditions}
        createId={createId}
        messages={messages}
        siteId={siteId}
        window={window}
        validationError={validationError}
        onChange={changeConditions}
        headerContent={
          <FilterPanelHeader
            audience={audience}
            matchedSavedFilter={matchedSavedFilter}
            matchedSystemPreset={matchedSystemPreset}
            messages={messages}
            savedFilterTriggerKey={savedFilterTriggerKey}
            savedFilterTriggerLabel={savedFilterTriggerLabel}
            savedFilters={savedFilters}
            savedFiltersLoading={savedFiltersQuery.isFetching}
            onApplySavedFilter={applySavedFilter}
            onApplySystemPreset={applySystemPreset}
            onClearSavedFilter={clearSavedFilter}
          />
        }
        footerActions={
          <>
            {savedFilterPrimaryAction === "save" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => openSavedFilterCreate()}
              >
                <SaveIcon data-icon="inline-start" />
                <span>{messages.filterBuilder.saveThisFilter}</span>
              </Button>
            ) : null}
            {savedFilterPrimaryAction === "save-as" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => openSavedFilterCreate(matchedSavedFilter)}
              >
                <CopyIcon data-icon="inline-start" />
                <span>{messages.filterBuilder.saveAsThisFilter}</span>
              </Button>
            ) : null}
            {savedFilterPrimaryAction === "manage" && matchedSavedFilter ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => openSavedFilterManagement(matchedSavedFilter)}
              >
                <PencilIcon data-icon="inline-start" />
                <span>{messages.filterBuilder.manageThisFilter}</span>
              </Button>
            ) : null}
            {savedFilterPrimaryAction === "finish" ? (
              <Button
                type="button"
                variant="outline"
                disabled={updateSavedFilterMutation.isPending}
                onClick={finishSavedFilterEditing}
              >
                {updateSavedFilterMutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                <span>{messages.filterBuilder.finishEditingFilter}</span>
              </Button>
            ) : null}
            <Button type="button" onClick={apply}>
              <CheckIcon data-icon="inline-start" />
              <span>{messages.filterBuilder.apply}</span>
            </Button>
          </>
        }
      />

      <ResponsiveDialog
        open={createSavedFilterOpen}
        onOpenChange={(nextOpen) => {
          setCreateSavedFilterOpen(nextOpen);
          if (!nextOpen) setSavedFilterOperationError(null);
        }}
      >
        <ResponsiveDialogContent desktopClassName="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle icon={SaveIcon}>
              {messages.filterBuilder.createSavedFilter}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {messages.filterBuilder.savedFilterCreateDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <SavedFilterFormFields
              form={savedFilterForm}
              messages={messages}
              onChange={setSavedFilterForm}
            />
            {savedFilterOperationError ? (
              <p className="text-xs text-destructive">
                {savedFilterOperationError}
              </p>
            ) : null}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createSavedFilterMutation.isPending}
              onClick={() => setCreateSavedFilterOpen(false)}
            >
              {messages.filterBuilder.savedFilterCancel}
            </Button>
            <Button
              type="button"
              disabled={
                createSavedFilterMutation.isPending ||
                savedFilterForm.name.trim().length === 0
              }
              onClick={() => {
                setSavedFilterOperationError(null);
                createSavedFilterMutation.mutate(savedFilterForm);
              }}
            >
              {createSavedFilterMutation.isPending ? <Spinner /> : <SaveIcon />}
              <span>
                {createSavedFilterMutation.isPending
                  ? messages.filterBuilder.savedFilterSaving
                  : messages.filterBuilder.savedFilterSave}
              </span>
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <ResponsiveDialog
        open={manageSavedFilterOpen}
        onOpenChange={(nextOpen) => {
          setManageSavedFilterOpen(nextOpen);
          if (!nextOpen) setSavedFilterOperationError(null);
        }}
      >
        <ResponsiveDialogContent desktopClassName="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle icon={PencilIcon}>
              {messages.filterBuilder.manageSavedFilter}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {messages.filterBuilder.savedFilterManageDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody>
            <SavedFilterFormFields
              form={savedFilterForm}
              messages={messages}
              onChange={setSavedFilterForm}
            />
            {savedFilterOperationError ? (
              <p className="text-xs text-destructive">
                {savedFilterOperationError}
              </p>
            ) : null}
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              disabled={
                !managedSavedFilter || updateSavedFilterMutation.isPending
              }
              onClick={() => {
                setSavedFilterOperationError(null);
                setConfirmSavedFilterDeleteOpen(true);
              }}
            >
              <Trash2Icon data-icon="inline-start" />
              <span>{messages.filterBuilder.deleteSavedFilter}</span>
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateSavedFilterMutation.isPending}
                onClick={() => setManageSavedFilterOpen(false)}
              >
                {messages.filterBuilder.savedFilterCancel}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  !managedSavedFilter || updateSavedFilterMutation.isPending
                }
                onClick={() => {
                  if (!managedSavedFilter) return;
                  setEditingSavedFilterId(managedSavedFilter.id);
                  setManageSavedFilterOpen(false);
                  setSavedFilterOperationError(null);
                }}
              >
                <PencilIcon data-icon="inline-start" />
                <span>{messages.filterBuilder.editSavedFilter}</span>
              </Button>
              <Button
                type="button"
                disabled={
                  !managedSavedFilter ||
                  updateSavedFilterMutation.isPending ||
                  savedFilterForm.name.trim().length === 0
                }
                onClick={() => {
                  if (!managedSavedFilter) return;
                  setSavedFilterOperationError(null);
                  updateSavedFilterMutation.mutate({
                    filterId: managedSavedFilter.id,
                    form: savedFilterForm,
                    filterDsl: managedSavedFilter.filterDsl,
                    finishEditing: false,
                  });
                }}
              >
                {updateSavedFilterMutation.isPending ? (
                  <Spinner />
                ) : (
                  <SaveIcon />
                )}
                <span>
                  {updateSavedFilterMutation.isPending
                    ? messages.filterBuilder.savedFilterSaving
                    : messages.filterBuilder.savedFilterSave}
                </span>
              </Button>
            </div>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <AlertDialog
        open={confirmSavedFilterDeleteOpen}
        onOpenChange={setConfirmSavedFilterDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              icon={Trash2Icon}
              iconClassName="text-destructive"
            >
              {messages.filterBuilder.deleteSavedFilterTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {messages.filterBuilder.deleteSavedFilterDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSavedFilterMutation.isPending}>
              {messages.filterBuilder.savedFilterCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={
                !managedSavedFilter || deleteSavedFilterMutation.isPending
              }
              onClick={(event) => {
                event.preventDefault();
                if (!managedSavedFilter) return;
                setSavedFilterOperationError(null);
                deleteSavedFilterMutation.mutate(managedSavedFilter.id);
              }}
            >
              {deleteSavedFilterMutation.isPending ? (
                <Spinner />
              ) : (
                <Trash2Icon />
              )}
              <span>
                {deleteSavedFilterMutation.isPending
                  ? messages.filterBuilder.savedFilterDeleting
                  : messages.filterBuilder.savedFilterDelete}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
