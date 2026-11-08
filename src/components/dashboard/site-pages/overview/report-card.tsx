import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { Input } from "@insightflare/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@insightflare/ui/responsive-dialog";
import { Maximize2Icon, SearchIcon } from "lucide-react";

import {
  TabbedDataTableCard,
  type TabbedDataTableColumn,
  type TabbedDataTableLoader,
  type TabbedDataTableRowAdapter,
  type TabbedDataTableTab,
} from "@/components/dashboard/common/tabbed-data-table-card";
import { TabbedScrollMaskCard } from "@/components/dashboard/common/tabbed-scroll-mask-card";
import { useApplyDashboardFilters } from "@/components/dashboard/filters/use-dashboard-filters";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { DASHBOARD_CARD_ROW_LIMIT } from "@/lib/edge/analytics/contract/dashboard";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";

import type { ReportRow, ReportSortKey } from "./types";

export type ReportColumn = TabbedDataTableColumn<
  ReportRow,
  ReportSortKey,
  string
>;

export interface ReportRowsRequest {
  cursor: string | null;
  limit: number;
  search: string;
  sort: { key: ReportSortKey; direction: "asc" | "desc" };
  signal: AbortSignal;
  comparison: DashboardComparisonQuery | null;
}

export interface ReportRowsPage {
  items: readonly ReportRow[];
  pagination: { hasMore: boolean; nextCursor: string | null };
}

/** One tab of a report card: what it lists and what a row click filters. */
export interface ReportTab<TTab extends string = string> {
  value: TTab;
  label: string;
  /** The heading of the label column. */
  columnLabel: string;
  load: (request: ReportRowsRequest) => Promise<ReportRowsPage>;
  /** The Details view's rows, when they come from a fuller report. */
  loadDetails?: (request: ReportRowsRequest) => Promise<ReportRowsPage>;
  renderLabel: (row: ReportRow, source: "card" | "search") => ReactNode;
  /** Whether the row is what the page is filtered to. */
  isSelected: (row: ReportRow) => boolean;
  /** The page's filters with the row added, or taken away when selected. */
  toggleFilter: (row: ReportRow) => FilterDocument;
  /** The Details view's columns, the visitors first. */
  detailColumns: readonly ReportColumn[];
}

interface ReportCardProps<TTab extends string> {
  messages: AppMessages;
  /** Names the card in its Details view. */
  title: string;
  tabs: readonly [ReportTab<TTab>, ...ReportTab<TTab>[]];
  /** The card's metric columns: visitors, or the comparison's. */
  columns: readonly ReportColumn[];
  comparison: DashboardComparisonQuery | null;
  /** Changes whenever the rows would: the range, filters and comparison. */
  requestKey: string;
  filtered: boolean;
  /** Offers the Details view; off for a card of fixed rows. */
  details?: boolean;
  /** Tabs that aren't lists, like the map, by their content. */
  extraTabs?: readonly { value: TTab; label: string; content: ReactNode }[];
  /** Controls for the open tab, shown before Details. */
  tabControls?: (tab: TTab) => ReactNode;
  /** The open tab, when the page keeps it rather than the card. */
  activeTab?: TTab;
  onActiveTabChange?: (tab: TTab) => void;
}

const DETAILS_ROW_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 300;

function tableTabs<TTab extends string>(
  tabs: readonly ReportTab<TTab>[],
): [TabbedDataTableTab<TTab>, ...TabbedDataTableTab<TTab>[]] {
  return tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    columnLabel: tab.columnLabel,
  })) as [TabbedDataTableTab<TTab>, ...TabbedDataTableTab<TTab>[]];
}

function useRowAdapter<TTab extends string>(
  tabs: readonly ReportTab<TTab>[],
): TabbedDataTableRowAdapter<ReportRow, TTab, ReportSortKey> {
  const applyFilters = useApplyDashboardFilters();
  return useMemo(() => {
    const byValue = new Map(tabs.map((tab) => [tab.value, tab]));
    const tabFor = (value: TTab) => {
      const tab = byValue.get(value);
      if (!tab) throw new Error(`report_tab_missing:${value}`);
      return tab;
    };
    return {
      renderLabel: (row, { tab, source }) =>
        tabFor(tab).renderLabel(row, source),
      getSearchText: (row) => row.label,
      getExportLabel: (row) => row.label,
      getActive: (row, tab) => tabFor(tab).isSelected(row),
      getInteractive: () => true,
      onClick: (row, { tab }) => applyFilters(tabFor(tab).toggleFilter(row)),
    };
  }, [applyFilters, tabs]);
}

/**
 * A dashboard card of tabbed lists, top rows first. A row click filters the
 * page by it; Details opens the whole list with search, sorting and CSV.
 */
export function ReportCard<TTab extends string>({
  messages,
  title,
  tabs,
  columns,
  comparison,
  requestKey,
  filtered,
  details = true,
  extraTabs = [],
  tabControls,
  activeTab: pageTab,
  onActiveTabChange,
}: ReportCardProps<TTab>) {
  const [cardTab, setCardTab] = useState<TTab>(
    extraTabs[0]?.value ?? tabs[0].value,
  );
  const activeTab = pageTab ?? cardTab;
  const setActiveTab = (tab: TTab) => {
    setCardTab(tab);
    onActiveTabChange?.(tab);
  };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rowAdapter = useRowAdapter(tabs);
  const loader = useMemo<TabbedDataTableLoader<TTab, ReportRow, ReportSortKey>>(
    () =>
      async ({ tab, cursor, search, sort, signal }) => {
        const reportTab = tabs.find((item) => item.value === tab);
        if (!reportTab) throw new Error(`report_tab_missing:${tab}`);
        const page = await reportTab.load({
          cursor,
          limit: DASHBOARD_CARD_ROW_LIMIT,
          search,
          sort,
          signal,
          comparison,
        });
        // The card shows the top rows only; the rest are in Details.
        return {
          items: page.items,
          pagination: { hasMore: false, nextCursor: null },
        };
      },
    [comparison, tabs],
  );
  const activeReportTab = tabs.find((tab) => tab.value === activeTab);
  const allTabs = [
    ...extraTabs.map((tab) => ({ value: tab.value, label: tab.label })),
    ...tableTabs(tabs),
  ] as [TabbedDataTableTab<TTab>, ...TabbedDataTableTab<TTab>[]];
  const detailsButton =
    details && activeReportTab ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setDetailsOpen(true)}
      >
        <Maximize2Icon data-icon="inline-start" className="size-3.5" />
        {messages.dashboard.details}
      </Button>
    ) : null;
  const extraTab = extraTabs.find((tab) => tab.value === activeTab);
  const controls = tabControls?.(activeTab) ?? null;
  const header =
    controls || detailsButton ? (
      <div className="inline-flex items-center gap-1">
        {controls}
        {detailsButton}
      </div>
    ) : undefined;

  return (
    <>
      {extraTab ? (
        <TabbedScrollMaskCard
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={allTabs}
          className="h-full"
          viewportClassName="max-h-none"
        >
          {extraTab.content}
        </TabbedScrollMaskCard>
      ) : (
        <TabbedDataTableCard<TTab, ReportRow, ReportSortKey>
          messages={messages}
          filtered={filtered}
          tabs={allTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          loader={loader}
          limit={DASHBOARD_CARD_ROW_LIMIT}
          requestKey={`${requestKey}:card`}
          columns={columns}
          rowAdapter={rowAdapter}
          defaultSort={{
            key: comparison ? "current" : "visitors",
            direction: "desc",
          }}
          sortActionLabel={(label) =>
            formatI18nTemplate(messages.common.sortBy, { label })
          }
          loadingLabel={messages.common.loading}
          emptyLabel={messages.common.noData}
          search={false}
          export={false}
          headerRight={header}
          className="h-full"
          viewportClassName="max-h-none"
        />
      )}
      {details && activeReportTab ? (
        <ReportDetailsDialog
          messages={messages}
          title={title}
          tab={activeReportTab}
          requestKey={requestKey}
          filtered={filtered}
          rowAdapter={rowAdapter}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      ) : null}
    </>
  );
}

function ReportDetailsDialog<TTab extends string>({
  messages,
  title,
  tab,
  requestKey,
  filtered,
  rowAdapter,
  open,
  onOpenChange,
}: {
  messages: AppMessages;
  title: string;
  tab: ReportTab<TTab>;
  requestKey: string;
  filtered: boolean;
  rowAdapter: TabbedDataTableRowAdapter<ReportRow, TTab, ReportSortKey>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timeout = globalThis.setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => globalThis.clearTimeout(timeout);
  }, [search]);
  useEffect(() => {
    if (open) return;
    setSearch("");
    setDebouncedSearch("");
  }, [open]);
  const loader = useMemo<TabbedDataTableLoader<TTab, ReportRow, ReportSortKey>>(
    () =>
      ({ cursor, limit, sort, signal }) =>
        (tab.loadDetails ?? tab.load)({
          cursor,
          limit,
          search: debouncedSearch,
          sort,
          signal,
          comparison: null,
        }),
    [debouncedSearch, tab],
  );
  const heading =
    tab.label === title
      ? title
      : formatI18nTemplate(messages.dashboard.detailsTitle, {
          card: title,
          tab: tab.label,
        });

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent desktopClassName="max-w-4xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle icon={Maximize2Icon}>
            {heading}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody scrollable={false} className="space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={formatI18nTemplate(messages.overview.searchInTab, {
                tab: tab.label,
              })}
              aria-label={messages.common.search}
              className="pl-8"
            />
          </div>
          {open ? (
            <TabbedDataTableCard<TTab, ReportRow, ReportSortKey>
              messages={messages}
              filtered={filtered}
              tabs={tableTabs([tab])}
              loader={loader}
              limit={DETAILS_ROW_LIMIT}
              requestKey={`${requestKey}:details:${tab.value}:${debouncedSearch}`}
              columns={tab.detailColumns}
              rowAdapter={{
                ...rowAdapter,
                // A click filters the page, so the dialog gets out of the way.
                onClick: (row, context) => {
                  rowAdapter.onClick?.(row, context);
                  onOpenChange(false);
                },
              }}
              defaultSort={{ key: "visitors", direction: "desc" }}
              sortActionLabel={(label) =>
                formatI18nTemplate(messages.common.sortBy, { label })
              }
              loadingLabel={messages.common.loading}
              emptyLabel={messages.common.noData}
              search={false}
              export={{
                labels: messages.common.tableExport,
                filename: `${title}-${tab.label}`,
              }}
              className={cn("max-h-[65dvh]")}
              viewportClassName="max-h-[calc(65dvh-3rem)]"
            />
          ) : null}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
