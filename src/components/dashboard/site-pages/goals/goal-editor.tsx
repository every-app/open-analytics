import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { Input } from "@insightflare/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@insightflare/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { Spinner } from "@insightflare/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";
import { ListFilterIcon, SaveIcon, XIcon } from "lucide-react";

import { CURRENCY_CODES } from "@/lib/currency";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { GoalDefinition } from "@/lib/dashboard-api/client/edge";
import {
  SCROLL_DEPTH_THRESHOLD_MAX,
  SCROLL_DEPTH_THRESHOLD_MIN,
  type ScrollDepthGoal,
  ScrollDepthGoalError,
  scrollDepthGoalFilterDsl,
  scrollDepthGoalFromDsl,
  ScrollDepthGoalValidationError,
} from "@/lib/edge/analytics/contract/scroll-depth-goal";
import {
  analyticsFilterRegistry,
  filterConditionCount,
  type FilterDocument,
  matchesOnlyCustomEvents,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

import { GoalFilterDialog } from "./goal-filter-dialog";

/** The currency select's value for a goal without revenue. */
const NO_CURRENCY = "none";
/** The threshold a new scroll depth goal starts with. */
const DEFAULT_SCROLL_THRESHOLD = 75;

/** What a goal converts on: any filter, or Plausible's scroll depth trigger. */
enum GoalTrigger {
  Filter = "filter",
  ScrollDepth = "scroll-depth",
}

function isGoalTrigger(value: string): value is GoalTrigger {
  return (Object.values(GoalTrigger) as string[]).includes(value);
}

type ScrollDepthDraft =
  | { readonly goal: ScrollDepthGoal; readonly filterDsl: string }
  | { readonly error: ScrollDepthGoalError };

/** The scroll depth trigger's filter DSL, or why its inputs have none. */
function scrollDepthDraft(
  threshold: string,
  pagePath: string,
): ScrollDepthDraft {
  const goal = { threshold: Number(threshold), pagePath: pagePath.trim() };
  try {
    return { goal, filterDsl: scrollDepthGoalFilterDsl(goal) };
  } catch (error) {
    if (error instanceof ScrollDepthGoalValidationError) {
      return { error: error.code };
    }
    throw error;
  }
}

/** Plausible's name for a scroll depth goal, e.g. "Scroll 75% on /blog*". */
function scrollDepthGoalName(
  goal: ScrollDepthGoal,
  labels: AppMessages["goals"],
): string {
  return goal.pagePath
    ? formatI18nTemplate(labels.scrollGoalNameOnPage, {
        threshold: goal.threshold,
        path: goal.pagePath,
      })
    : formatI18nTemplate(labels.scrollGoalName, { threshold: goal.threshold });
}

export function GoalEditor({
  open,
  goal,
  labels,
  messages,
  siteId,
  window,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  readonly open: boolean;
  readonly goal?: GoalDefinition | null;
  readonly labels: AppMessages["goals"];
  readonly messages: AppMessages;
  readonly siteId: string;
  readonly window: TimeWindow;
  readonly submitting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (input: {
    name: string;
    filterDsl: string;
    currency: string | null;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [filterDsl, setFilterDsl] = useState("");
  const [currency, setCurrency] = useState(NO_CURRENCY);
  const [trigger, setTrigger] = useState<GoalTrigger>(GoalTrigger.Filter);
  const [threshold, setThreshold] = useState(String(DEFAULT_SCROLL_THRESHOLD));
  const [pagePath, setPagePath] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterOpenRef = useRef(false);
  const setFilterDialogOpen = (nextOpen: boolean) => {
    filterOpenRef.current = nextOpen;
    setFilterOpen(nextOpen);
  };
  const handleEditorOpenChange = (nextOpen: boolean) => {
    // The filter editor is rendered in a separate portal. Because the shared
    // dialog is non-modal, the parent can receive an outside-interaction close
    // event while the child dialog is being opened or dismissed. Ignore that
    // event and keep the editor form mounted.
    if (!nextOpen && (filterOpen || filterOpenRef.current)) {
      return;
    }
    onOpenChange(nextOpen);
  };
  useEffect(() => {
    if (!open) return;
    const scrollGoal = goal ? scrollDepthGoalFromDsl(goal.filterDsl) : null;
    setName(goal?.name ?? "");
    setFilterDsl(goal?.filterDsl ?? "");
    setCurrency(goal?.currency ?? NO_CURRENCY);
    setTrigger(scrollGoal ? GoalTrigger.ScrollDepth : GoalTrigger.Filter);
    setThreshold(String(scrollGoal?.threshold ?? DEFAULT_SCROLL_THRESHOLD));
    setPagePath(scrollGoal?.pagePath ?? "");
    setFilterDialogOpen(false);
  }, [goal, open]);
  let filter: FilterDocument | null = null;
  try {
    filter = parseFilterDsl(filterDsl, analyticsFilterRegistry);
  } catch {
    // The shared editor owns detailed validation; the compact trigger only
    // needs a stable count and must not rewrite the user's raw DSL.
  }
  const filterCount = filter ? filterConditionCount(filter) : 0;
  const revenueInvalid =
    currency !== NO_CURRENCY &&
    filter !== null &&
    !matchesOnlyCustomEvents(filter);
  const scrollMode = trigger === GoalTrigger.ScrollDepth;
  const scroll = scrollDepthDraft(threshold, pagePath);
  const scrollError = "error" in scroll ? scroll.error : null;
  const suggestedName =
    scrollMode && "goal" in scroll
      ? scrollDepthGoalName(scroll.goal, labels)
      : "";
  const valid = scrollMode
    ? scrollError === null
    : name.trim().length > 0 && filterDsl.trim().length > 0 && !revenueInvalid;
  // Each trigger picks up where the other left off: a valid scroll goal
  // becomes the filter, and a filter of that shape fills the scroll inputs.
  const changeTrigger = (next: GoalTrigger) => {
    if (next === GoalTrigger.Filter && "filterDsl" in scroll) {
      setFilterDsl(scroll.filterDsl);
    }
    if (next === GoalTrigger.ScrollDepth) {
      const fromFilter = scrollDepthGoalFromDsl(filterDsl);
      if (fromFilter) {
        setThreshold(String(fromFilter.threshold));
        setPagePath(fromFilter.pagePath);
      }
    }
    setTrigger(next);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || submitting) return;
    void onSubmit(
      scrollMode && "filterDsl" in scroll
        ? {
            name: name.trim() || suggestedName,
            filterDsl: scroll.filterDsl,
            currency: null,
          }
        : {
            name: name.trim(),
            filterDsl,
            currency: currency === NO_CURRENCY ? null : currency,
          },
    );
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={handleEditorOpenChange}>
        <ResponsiveDialogContent desktopClassName="max-w-xl">
          <form
            onSubmit={submit}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle icon={SaveIcon}>
                {goal ? labels.editTitle : labels.createTitle}
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
              <div className="min-h-max min-w-0 space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="goal-name" className="text-sm font-medium">
                    {labels.nameLabel}
                  </label>
                  <Input
                    id="goal-name"
                    value={name}
                    placeholder={suggestedName || labels.namePlaceholder}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label id="goal-trigger" className="text-sm font-medium">
                    {labels.trigger}
                  </label>
                  <Tabs
                    value={trigger}
                    onValueChange={(value) => {
                      if (isGoalTrigger(value)) changeTrigger(value);
                    }}
                  >
                    <TabsList aria-labelledby="goal-trigger" className="w-full">
                      <TabsTrigger value={GoalTrigger.Filter}>
                        {labels.triggerFilter}
                      </TabsTrigger>
                      <TabsTrigger value={GoalTrigger.ScrollDepth}>
                        {labels.triggerScrollDepth}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                {scrollMode ? (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="goal-scroll-threshold"
                        className="text-sm font-medium"
                      >
                        {labels.scrollThreshold}
                      </label>
                      <Input
                        id="goal-scroll-threshold"
                        type="number"
                        inputMode="numeric"
                        min={SCROLL_DEPTH_THRESHOLD_MIN}
                        max={SCROLL_DEPTH_THRESHOLD_MAX}
                        step={1}
                        value={threshold}
                        onChange={(event) => setThreshold(event.target.value)}
                      />
                      {scrollError === ScrollDepthGoalError.ThresholdInvalid ? (
                        <p className="text-xs text-destructive">
                          {labels.scrollThresholdInvalid}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="goal-page-path"
                        className="text-sm font-medium"
                      >
                        {labels.pagePath}
                      </label>
                      <Input
                        id="goal-page-path"
                        value={pagePath}
                        placeholder={labels.pagePathPlaceholder}
                        onChange={(event) => setPagePath(event.target.value)}
                      />
                      <p
                        className={
                          scrollError ===
                          ScrollDepthGoalError.PathWildcardUnsupported
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {scrollError ===
                        ScrollDepthGoalError.PathWildcardUnsupported
                          ? labels.pagePathWildcardUnsupported
                          : labels.pagePathHint}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        {labels.filter}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full min-w-32 justify-start truncate text-left text-xs"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setFilterDialogOpen(true)}
                      >
                        <ListFilterIcon data-icon="inline-start" />{" "}
                        {labels.filter} ({filterCount})
                      </Button>
                      {!valid &&
                      !revenueInvalid &&
                      (name.length > 0 || filterDsl.length > 0) ? (
                        <p className="text-xs text-destructive">
                          {labels.invalidGoal}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="goal-revenue-currency"
                        className="text-sm font-medium"
                      >
                        {labels.revenueCurrency}
                      </label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger
                          id="goal-revenue-currency"
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CURRENCY}>
                            {labels.noRevenue}
                          </SelectItem>
                          {CURRENCY_CODES.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p
                        className={
                          revenueInvalid
                            ? "text-xs text-destructive"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {revenueInvalid
                          ? labels.revenueCurrencyEventsOnly
                          : labels.revenueCurrencyHint}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <ResponsiveDialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  <XIcon data-icon="inline-start" /> {labels.cancel}
                </Button>
              </ResponsiveDialogClose>
              <Button type="submit" disabled={!valid || submitting}>
                {submitting ? <Spinner /> : <SaveIcon />}
                {submitting
                  ? labels.creating
                  : goal
                    ? labels.saveEdit
                    : labels.save}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <GoalFilterDialog
        open={filterOpen}
        filterDsl={filterDsl}
        labels={labels}
        messages={messages}
        siteId={siteId}
        window={window}
        onOpenChange={setFilterDialogOpen}
        onApply={(next) => {
          setFilterDsl(next);
          setFilterDialogOpen(false);
        }}
      />
    </>
  );
}
