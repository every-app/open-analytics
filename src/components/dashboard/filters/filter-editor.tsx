import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { VerticalScrollMask } from "@insightflare/ui/vertical-scroll-mask";
import { CheckIcon, FunnelXIcon, XIcon } from "lucide-react";

import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

import { ConditionListEditor } from "./filter-editor/editors";
import { directEventName } from "./filter-editor/field-catalog";
import type {
  EditorCondition,
  FilterPanelAudience,
} from "./filter-editor/model";
import {
  conditionIdFactory,
  documentFromEditor,
  editorConditionsFromDsl,
  EditorError,
  filterDslFromEditor,
} from "./filter-editor/model";

export interface FilterEditorProps {
  readonly audience: FilterPanelAudience;
  readonly conditions: readonly EditorCondition[];
  readonly createId: () => string;
  readonly messages: AppMessages;
  readonly className?: string;
  readonly siteId?: string;
  readonly window?: TimeWindow;
  readonly validationError?: string | null;
  readonly headerContent?: ReactNode;
  /** The buttons beside Clear: Cancel and Apply, or the panel's own. */
  readonly footerActions: ReactNode;
  readonly onChange: (conditions: readonly EditorCondition[]) => void;
}

/**
 * The visual filter editor shared by the filter panel, comparison filters,
 * goals and funnel steps: conditions that must all match.
 */
export function FilterEditor({
  audience,
  conditions,
  createId,
  messages,
  className,
  siteId,
  window,
  validationError,
  headerContent,
  footerActions,
  onChange,
}: FilterEditorProps) {
  // Value suggestions are narrowed by the conditions already complete.
  const document = useMemo(() => {
    try {
      return documentFromEditor(conditions);
    } catch {
      return EMPTY_FILTER_DOCUMENT;
    }
  }, [conditions]);
  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col", className)}>
      <VerticalScrollMask
        className="min-h-0 min-w-0 flex-1"
        contentClassName="min-h-0 min-w-0 pb-4"
      >
        {headerContent}
        <ConditionListEditor
          audience={audience}
          conditions={conditions}
          createId={createId}
          document={document}
          eventName={directEventName(conditions)}
          messages={messages}
          siteId={siteId}
          window={window}
          onChange={onChange}
        />
        {validationError ? (
          <p className="mt-4 border-l-2 border-destructive px-2 text-xs text-destructive">
            {validationError}
          </p>
        ) : null}
      </VerticalScrollMask>
      <div className="sticky bottom-0 z-10 -mx-4 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t bg-background px-4 py-3">
        <Button type="button" variant="ghost" onClick={() => onChange([])}>
          <FunnelXIcon data-icon="inline-start" />
          {messages.filters.clear}
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {footerActions}
        </div>
      </div>
    </div>
  );
}

/** The message for a filter that can't be applied yet. */
export function filterEditorError(error: unknown, messages: AppMessages) {
  return error instanceof Error && error.message !== EditorError.MissingValue
    ? error.message
    : messages.filterBuilder.invalid;
}

/**
 * The editor for a goal, a funnel step or a comparison: it starts from a
 * filter's DSL and applies the DSL of its conditions.
 */
export function FilterDslEditor({
  initialFilterDsl,
  applyLabel,
  cancelLabel,
  onApply,
  onCancel,
  ...props
}: Omit<
  FilterEditorProps,
  "conditions" | "createId" | "footerActions" | "onChange"
> & {
  readonly initialFilterDsl: string;
  readonly applyLabel: string;
  readonly cancelLabel: string;
  readonly onApply: (filterDsl: string, document: FilterDocument) => void;
  readonly onCancel: () => void;
}) {
  const nextIdRef = useRef(conditionIdFactory());
  const createId = useCallback(() => nextIdRef.current(), []);
  const [conditions, setConditions] = useState<readonly EditorCondition[]>(() =>
    editorConditionsFromDsl(initialFilterDsl, createId),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const apply = () => {
    try {
      onApply(filterDslFromEditor(conditions), documentFromEditor(conditions));
    } catch (error) {
      setValidationError(filterEditorError(error, props.messages));
    }
  };
  return (
    <FilterEditor
      {...props}
      conditions={conditions}
      createId={createId}
      validationError={validationError}
      onChange={(next) => {
        setConditions(next);
        setValidationError(null);
      }}
      footerActions={
        <>
          <Button type="button" variant="outline" onClick={onCancel}>
            <XIcon data-icon="inline-start" />
            {cancelLabel}
          </Button>
          <Button type="button" onClick={apply}>
            <CheckIcon data-icon="inline-start" />
            {applyLabel}
          </Button>
        </>
      }
    />
  );
}
