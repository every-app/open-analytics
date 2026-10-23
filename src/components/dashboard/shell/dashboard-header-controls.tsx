import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Button } from "@insightflare/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@insightflare/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@insightflare/ui/sheet";
import { ChartColumnStackedIcon, FunnelIcon } from "lucide-react";

import {
  ComparisonPanel,
  ComparisonPanelTitle,
  type ComparisonSettings,
} from "@/components/dashboard/comparison/comparison-panel";
import { FilterActiveCountBadge } from "@/components/dashboard/filters/filter-active-count-badge";
import { FilterPanel } from "@/components/dashboard/filters/filter-panel";
import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import { useRealtimeChannelSelector } from "@/hooks/use-realtime-channel";
import {
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import {
  type DashboardComparisonSearchState,
  parseDashboardComparisonSearchParams,
  serializeDashboardSearchParams,
  withDashboardComparisonSearchParams,
  withDashboardFilterSearchParams,
} from "@/lib/dashboard/filter-state";
import {
  parseFilterDocumentFromSearchParams,
  parseFilterScopeFromSearchParams,
  serializeFilterScopeToSearchParams,
} from "@/lib/dashboard/query-state";
import {
  analyticsFilterRegistry,
  attachFilterScopePreference,
  type FilterDocument,
  type FilterScope,
  type FilterScopePreference,
  filterScopePreferenceFromDocument,
  formatFilterDsl,
  parseFilterDsl,
  serializeFilterParams,
} from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";

import { DateControl } from "./dashboard-header-controls/date-control";
import {
  areRealtimeHeaderStatesEqual,
  RealtimeActiveBadge,
  selectRealtimeHeaderState,
} from "./dashboard-header-controls/realtime-badge";
interface DashboardHeaderControlsProps {
  locale: Locale;
  messages: AppMessages;
  siteId?: string;
  /** The date control. Off on pages with a fixed window, like Real-time. */
  showDateControls: boolean;
  /** Compare; off where a comparison can't be drawn. */
  showComparison: boolean;
  /** Filter; off where the page can't be filtered. */
  showFilter: boolean;
  filterAudience?: "private-dashboard" | "public-share";
  /** Concrete scope selected by the active dashboard page for Auto filters. */
  resolvedScope?: FilterScope;
  /** Real-time's page; given, the header shows the live count linking to it. */
  realtimeHref?: string;
}
function FilterTrigger({
  activeFilterCount,
  className,
  compact = false,
  messages,
  onClick,
  scopePreference,
  style,
}: {
  activeFilterCount: number;
  className: string;
  compact?: boolean;
  messages: AppMessages;
  onClick: () => void;
  scopePreference: FilterScopePreference;
  style?: CSSProperties;
}) {
  const filterButtonLabel =
    scopePreference === "event"
      ? messages.dashboardHeader.filterButtonEvent
      : scopePreference === "session"
        ? messages.dashboardHeader.filterButtonSession
        : scopePreference === "visitor"
          ? messages.dashboardHeader.filterButtonVisitor
          : messages.dashboardHeader.filterButton;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      className={cn(
        className,
        compact &&
          "relative gap-0 p-0 sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5 sm:has-data-[icon=inline-start]:pl-2",
      )}
      aria-label={filterButtonLabel}
      onClick={onClick}
      style={style}
    >
      <FunnelIcon
        data-icon="inline-start"
        className={cn(activeFilterCount === 0 && "text-muted-foreground")}
      />
      <AutoResizer
        initial
        animateWidth
        animateHeight={false}
        className="inline-flex min-w-0 items-center"
      >
        <AutoTransition
          as="span"
          className="hidden whitespace-nowrap sm:inline-block"
          duration={0.2}
          initial={false}
          presenceMode="wait"
          transitionKey={scopePreference}
          type="fade"
        >
          {filterButtonLabel}
        </AutoTransition>
      </AutoResizer>
      <FilterActiveCountBadge
        count={activeFilterCount}
        className={
          compact
            ? "absolute -top-1 -right-2 mr-0 sm:static sm:mr-0"
            : undefined
        }
      />
    </Button>
  );
}
function CompareTrigger({
  active,
  className,
  compact = false,
  messages,
  onClick,
}: {
  active: boolean;
  className: string;
  compact?: boolean;
  messages: AppMessages;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      className={cn(
        className,
        compact &&
          "gap-0 p-0 sm:h-8 sm:w-auto sm:gap-2 sm:px-2.5 sm:has-data-[icon=inline-start]:pl-2",
      )}
      aria-label={messages.dashboardHeader.compareButton}
      onClick={onClick}
    >
      <ChartColumnStackedIcon
        data-icon="inline-start"
        className={cn(!active && "text-muted-foreground")}
      />
      <span className="hidden sm:inline">
        {messages.dashboardHeader.compareButton}
      </span>
    </Button>
  );
}
function comparisonSettingsFromSearchState(
  state: DashboardComparisonSearchState,
  currentFilterDsl: string,
): ComparisonSettings {
  return {
    period: state.mode ?? "previous",
    filterMode: state.filterDocument.root ? "custom" : "current",
    filterDsl: state.filterDocument.root
      ? formatFilterDsl(state.filterDocument)
      : currentFilterDsl,
  };
}
export const DashboardHeaderControls = memo(function DashboardHeaderControls({
  locale,
  messages,
  siteId,
  showDateControls,
  showComparison,
  showFilter,
  filterAudience = "private-dashboard",
  resolvedScope,
  realtimeHref,
}: DashboardHeaderControlsProps) {
  const searchParams = useLiveSearchParams();
  const livePathname = usePathname() || "/";
  const {
    window,
    setUiFilters,
    scopePreference,
    setScopePreference,
    uiFilterDsl,
  } = useDashboardQueryControls();
  const searchParamsKey = searchParams.toString();
  const queryDocument = useMemo(
    () =>
      parseFilterDocumentFromSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const urlScopePreference = useMemo(
    () =>
      parseFilterScopeFromSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const comparisonSearchState = useMemo(
    () =>
      parseDashboardComparisonSearchParams(
        new URLSearchParams(searchParamsKey),
      ),
    [searchParamsKey],
  );
  const activeFilterCount = useMemo(
    () => serializeFilterParams(queryDocument, analyticsFilterRegistry).size,
    [queryDocument],
  );
  const filterSuggestionScope = resolvedScope ?? "event";
  const hasActiveFilters = activeFilterCount > 0;
  const headerTriggerClassName =
    "gap-2 transition-[color,background-color,border-color,opacity]";
  const filterTriggerClassName = cn(
    headerTriggerClassName,
    hasActiveFilters &&
      "!border-primary/60 !bg-primary/10 !text-primary hover:!bg-primary/15 hover:!text-primary aria-expanded:!bg-primary/15 dark:!border-primary/60 dark:!bg-primary/20 dark:hover:!bg-primary/25",
  );
  const hasActiveComparison = comparisonSearchState.mode !== undefined;
  const comparisonTriggerClassName = cn(
    headerTriggerClassName,
    hasActiveComparison &&
      "!border-chart-secondary/60 !bg-chart-secondary/10 !text-chart-secondary hover:!bg-chart-secondary/15 hover:!text-chart-secondary aria-expanded:!bg-chart-secondary/15 dark:!border-chart-secondary/60 dark:!bg-chart-secondary/20 dark:hover:!bg-chart-secondary/25",
  );
  const filterTriggerStyle = hasActiveFilters
    ? {
        borderColor: "hsl(var(--primary) / 0.6)",
        backgroundColor: "hsl(var(--primary) / 0.12)",
        color: "hsl(var(--primary))",
      }
    : undefined;

  const [mobileCompareDrawerOpen, setMobileCompareDrawerOpen] = useState(false);
  const [desktopCompareSheetOpen, setDesktopCompareSheetOpen] = useState(false);
  const [mobileFilterDrawerOpen, setMobileFilterDrawerOpen] = useState(false);
  const [desktopFilterSheetOpen, setDesktopFilterSheetOpen] = useState(false);
  const [comparisonSettings, setComparisonSettings] =
    useState<ComparisonSettings>(() =>
      comparisonSettingsFromSearchState(
        comparisonSearchState,
        uiFilterDsl ?? "",
      ),
    );
  const realtimeSiteId = siteId || undefined;
  const showRealtimeBadge = Boolean(realtimeHref) && Boolean(siteId);
  const realtimeHeaderState = useRealtimeChannelSelector(
    realtimeSiteId,
    selectRealtimeHeaderState,
    areRealtimeHeaderStatesEqual,
    { enabled: showRealtimeBadge },
  );
  const {
    activeNow,
    status: realtimeStatus,
    hasConnected: hasRealtimeConnected,
  } = realtimeHeaderState;

  useEffect(() => {
    if (scopePreference !== urlScopePreference) {
      setScopePreference(urlScopePreference);
    }
  }, [scopePreference, setScopePreference, urlScopePreference]);

  useEffect(() => {
    setComparisonSettings(
      comparisonSettingsFromSearchState(
        comparisonSearchState,
        uiFilterDsl ?? "",
      ),
    );
  }, [comparisonSearchState, uiFilterDsl]);

  const handleScopeChange = useCallback(
    (next: FilterScopePreference) => {
      setScopePreference(next);
      const params = queryDocument.root
        ? serializeFilterScopeToSearchParams(searchParams, next)
        : serializeFilterScopeToSearchParams(searchParams, "auto");
      const updated = serializeDashboardSearchParams(params);
      const current = serializeDashboardSearchParams(searchParams);
      if (updated !== current) {
        const target = updated ? `${livePathname}?${updated}` : livePathname;
        replaceUrlWithoutNavigation(target);
      }
    },
    [livePathname, queryDocument, searchParams, setScopePreference],
  );

  const handleComparisonApply = useCallback(
    (settings: ComparisonSettings) => {
      let comparisonFilter: FilterDocument | undefined;
      if (settings.filterMode === "custom" && settings.filterDsl.trim()) {
        try {
          comparisonFilter = parseFilterDsl(
            settings.filterDsl,
            analyticsFilterRegistry,
          );
        } catch {
          comparisonFilter = undefined;
        }
      }

      const params = withDashboardComparisonSearchParams(
        searchParams,
        settings.period,
        comparisonFilter,
      );
      const updated = serializeDashboardSearchParams(params);
      const current = serializeDashboardSearchParams(searchParams);
      if (updated !== current) {
        const target = updated ? `${livePathname}?${updated}` : livePathname;
        replaceUrlWithoutNavigation(target);
      }
      setComparisonSettings(
        comparisonSettingsFromSearchState(
          parseDashboardComparisonSearchParams(params),
          uiFilterDsl ?? "",
        ),
      );
      setMobileCompareDrawerOpen(false);
      setDesktopCompareSheetOpen(false);
    },
    [livePathname, searchParams, uiFilterDsl],
  );

  const handleComparisonCancel = () => {
    setMobileCompareDrawerOpen(false);
    setDesktopCompareSheetOpen(false);
  };

  const applyFilterDocument = useCallback(
    (
      nextDocument: FilterDocument,
      rawDsl?: string,
      options?: { readonly closePanel?: boolean },
    ) => {
      const nextScope =
        filterScopePreferenceFromDocument(nextDocument) ?? scopePreference;
      const scopedDocument = attachFilterScopePreference(
        nextDocument,
        nextScope,
      );
      setUiFilters(scopedDocument, rawDsl);
      const filterParams = withDashboardFilterSearchParams(
        searchParams,
        scopedDocument,
      );
      const params = scopedDocument.root
        ? serializeFilterScopeToSearchParams(filterParams, nextScope)
        : serializeFilterScopeToSearchParams(filterParams, "auto");
      const updated = serializeDashboardSearchParams(params);
      const current = serializeDashboardSearchParams(searchParams);
      if (updated !== current) {
        const target = updated ? `${livePathname}?${updated}` : livePathname;
        replaceUrlWithoutNavigation(target);
      }
      if (options?.closePanel !== false) {
        setMobileFilterDrawerOpen(false);
        setDesktopFilterSheetOpen(false);
      }
    },
    [livePathname, scopePreference, searchParams, setUiFilters],
  );

  const comparisonPanel = (
    <ComparisonPanel
      currentFilterDsl={uiFilterDsl ?? ""}
      initialSettings={comparisonSettings}
      messages={messages}
      onApply={handleComparisonApply}
      onCancel={handleComparisonCancel}
      resolvedScope={resolvedScope ?? "event"}
      siteId={siteId}
      timeWindow={window}
    />
  );
  const filterPanel = (open: boolean) => (
    <FilterPanel
      audience={filterAudience}
      document={queryDocument}
      expressionText={uiFilterDsl}
      messages={messages}
      open={open}
      resolvedScope={filterSuggestionScope}
      siteId={siteId}
      scopePreference={scopePreference}
      window={window}
      onApply={applyFilterDocument}
      onScopeChange={handleScopeChange}
    />
  );
  const realtimeBadge =
    realtimeHref && showRealtimeBadge ? (
      <RealtimeActiveBadge
        href={realtimeHref}
        activeNow={activeNow}
        status={realtimeStatus}
        showValue={hasRealtimeConnected}
        label={messages.realtime.activeNow}
        messages={messages}
      />
    ) : null;

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
      <div className="flex items-center justify-end gap-2 lg:hidden">
        {realtimeBadge}
        {showComparison ? (
          <Drawer
            open={mobileCompareDrawerOpen}
            onOpenChange={setMobileCompareDrawerOpen}
          >
            <CompareTrigger
              active={hasActiveComparison}
              className={comparisonTriggerClassName}
              compact
              messages={messages}
              onClick={() => setMobileCompareDrawerOpen(true)}
            />
            <DrawerContent
              aria-describedby={undefined}
              className="h-[80dvh] max-h-[80dvh] min-h-0 flex flex-col overflow-hidden"
            >
              <DrawerHeader className="shrink-0">
                <DrawerTitle>
                  <ComparisonPanelTitle messages={messages} />
                </DrawerTitle>
              </DrawerHeader>
              {comparisonPanel}
            </DrawerContent>
          </Drawer>
        ) : null}
        {showFilter ? (
          <Drawer
            open={mobileFilterDrawerOpen}
            onOpenChange={setMobileFilterDrawerOpen}
          >
            <FilterTrigger
              activeFilterCount={activeFilterCount}
              className={filterTriggerClassName}
              compact
              messages={messages}
              onClick={() => setMobileFilterDrawerOpen(true)}
              scopePreference={scopePreference}
              style={filterTriggerStyle}
            />
            <DrawerContent
              aria-describedby={undefined}
              className="h-[80dvh] max-h-[80dvh] flex flex-col overflow-hidden"
            >
              <DrawerHeader>
                <DrawerTitle>
                  {messages.dashboardHeader.filterTitle}
                </DrawerTitle>
              </DrawerHeader>
              <div className="min-h-0 flex-1 px-4">
                {filterPanel(mobileFilterDrawerOpen)}
              </div>
            </DrawerContent>
          </Drawer>
        ) : null}
      </div>

      <div className="hidden min-w-0 max-w-full flex-wrap items-center justify-end gap-2 lg:flex">
        {realtimeBadge}
        {showComparison ? (
          <Sheet
            modal={false}
            open={desktopCompareSheetOpen}
            onOpenChange={setDesktopCompareSheetOpen}
          >
            <CompareTrigger
              active={hasActiveComparison}
              className={comparisonTriggerClassName}
              messages={messages}
              onClick={() => setDesktopCompareSheetOpen(true)}
            />
            <SheetContent
              side="right"
              aria-describedby={undefined}
              className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden data-[side=right]:sm:max-w-md"
            >
              <SheetHeader className="shrink-0">
                <SheetTitle>
                  <ComparisonPanelTitle messages={messages} />
                </SheetTitle>
              </SheetHeader>
              {comparisonPanel}
            </SheetContent>
          </Sheet>
        ) : null}
        {showFilter ? (
          <Sheet
            modal={false}
            open={desktopFilterSheetOpen}
            onOpenChange={setDesktopFilterSheetOpen}
          >
            <FilterTrigger
              activeFilterCount={activeFilterCount}
              className={filterTriggerClassName}
              messages={messages}
              onClick={() => setDesktopFilterSheetOpen(true)}
              scopePreference={scopePreference}
              style={filterTriggerStyle}
            />
            <SheetContent
              side="right"
              aria-describedby={undefined}
              className="flex h-full max-h-screen w-full flex-col data-[side=right]:sm:max-w-md"
            >
              <SheetHeader>
                <SheetTitle>{messages.dashboardHeader.filterTitle}</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1 px-4">
                {filterPanel(desktopFilterSheetOpen)}
              </div>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>

      {showDateControls ? (
        <DateControl locale={locale} messages={messages} siteId={siteId} />
      ) : null}
    </div>
  );
});
