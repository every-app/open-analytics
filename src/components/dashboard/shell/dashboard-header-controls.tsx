import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { useApplyDashboardFilters } from "@/components/dashboard/filters/use-dashboard-filters";
import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import {
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import {
  type DashboardComparisonSearchState,
  parseDashboardComparisonSearchParams,
  serializeDashboardSearchParams,
  withDashboardComparisonSearchParams,
} from "@/lib/dashboard/filter-state";
import { parseFilterDocumentFromSearchParams } from "@/lib/dashboard/query-state";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { usePathname } from "@/lib/router";
import { cn } from "@/lib/utils";

import { DateControl } from "./dashboard-header-controls/date-control";

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
}
function FilterTrigger({
  activeFilterCount,
  className,
  compact = false,
  messages,
  onClick,
  style,
}: {
  activeFilterCount: number;
  className: string;
  compact?: boolean;
  messages: AppMessages;
  onClick: () => void;
  style?: CSSProperties;
}) {
  const filterButtonLabel = messages.dashboardHeader.filterButton;

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "default"}
      className={cn(className, compact && "relative gap-0")}
      aria-label={filterButtonLabel}
      onClick={onClick}
      style={style}
    >
      <FunnelIcon
        data-icon="inline-start"
        className={cn(activeFilterCount === 0 && "text-muted-foreground")}
      />
      {compact ? null : (
        <span className="whitespace-nowrap">{filterButtonLabel}</span>
      )}
      <FilterActiveCountBadge
        count={activeFilterCount}
        className={compact ? "absolute -top-1 -right-2 mr-0" : undefined}
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
      className={cn(className, compact && "gap-0")}
      aria-label={messages.dashboardHeader.compareButton}
      onClick={onClick}
    >
      <ChartColumnStackedIcon
        data-icon="inline-start"
        className={cn(!active && "text-muted-foreground")}
      />
      {compact ? null : <span>{messages.dashboardHeader.compareButton}</span>}
    </Button>
  );
}
function comparisonSettingsFromSearchState(
  state: DashboardComparisonSearchState,
  currentFilterDsl: string,
): ComparisonSettings {
  const custom = state.filterDocument.conditions.length > 0;
  return {
    period: state.mode ?? "previous",
    filterMode: custom ? "custom" : "current",
    filterDsl: custom
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
}: DashboardHeaderControlsProps) {
  const searchParams = useLiveSearchParams();
  const livePathname = usePathname() || "/";
  const { window } = useDashboardQueryControls();
  const searchParamsKey = searchParams.toString();
  const queryDocument = useMemo(
    () =>
      parseFilterDocumentFromSearchParams(new URLSearchParams(searchParamsKey)),
    [searchParamsKey],
  );
  const currentFilterDsl = useMemo(
    () => formatFilterDsl(queryDocument),
    [queryDocument],
  );
  const comparisonSearchState = useMemo(
    () =>
      parseDashboardComparisonSearchParams(
        new URLSearchParams(searchParamsKey),
      ),
    [searchParamsKey],
  );
  const activeFilterCount = queryDocument.conditions.length;
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
        currentFilterDsl,
      ),
    );
  useEffect(() => {
    setComparisonSettings(
      comparisonSettingsFromSearchState(
        comparisonSearchState,
        currentFilterDsl,
      ),
    );
  }, [comparisonSearchState, currentFilterDsl]);

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
          currentFilterDsl,
        ),
      );
      setMobileCompareDrawerOpen(false);
      setDesktopCompareSheetOpen(false);
    },
    [currentFilterDsl, livePathname, searchParams],
  );

  const handleComparisonCancel = () => {
    setMobileCompareDrawerOpen(false);
    setDesktopCompareSheetOpen(false);
  };

  const applyFilters = useApplyDashboardFilters();
  const applyFilterDocument = useCallback(
    (
      nextDocument: FilterDocument,
      options?: { readonly closePanel?: boolean },
    ) => {
      applyFilters(nextDocument);
      if (options?.closePanel !== false) {
        setMobileFilterDrawerOpen(false);
        setDesktopFilterSheetOpen(false);
      }
    },
    [applyFilters],
  );

  const comparisonPanel = (
    <ComparisonPanel
      currentFilterDsl={currentFilterDsl}
      initialSettings={comparisonSettings}
      messages={messages}
      onApply={handleComparisonApply}
      onCancel={handleComparisonCancel}
      siteId={siteId}
      timeWindow={window}
    />
  );
  const filterPanel = (open: boolean) => (
    <FilterPanel
      audience={filterAudience}
      document={queryDocument}
      messages={messages}
      open={open}
      siteId={siteId}
      window={window}
      onApply={applyFilterDocument}
    />
  );
  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5 lg:gap-2">
      <div className="flex items-center gap-1.5 lg:hidden">
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

      <div className="hidden items-center gap-2 lg:flex">
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
