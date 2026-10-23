import {
  Fragment,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DetailDrawer } from "@insightflare/product-ui/detail-drawer";
import {
  type AnalyticsTableColumnDefinition,
  AnalyticsTableColumnSettings,
  useAnalyticsTableColumns,
} from "@insightflare/product-ui/tables";
import { ClickableTableCell } from "@insightflare/ui/clickable-table-cell";
import { PageHeading } from "@insightflare/ui/page-heading";
import { Skeleton } from "@insightflare/ui/skeleton";
import { TableCell, TableHead, TableRow } from "@insightflare/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import {
  AnalyticsDetailsTooltipTarget,
  AnalyticsTimeTooltipTarget,
} from "@/components/dashboard/analytics-time-tooltip";
import { AnalyticsDataTable } from "@/components/dashboard/common/analytics-data-table";
import {
  emptyContent,
  LoadFailedContent,
} from "@/components/dashboard/common/table-states";
import {
  BrowserMeta,
  CountryRegionMeta,
  DeviceMeta,
  formatRelativeTime,
  formatScreen,
  OsMeta,
  ReferrerMeta,
  VisitorAvatar,
  visitorDisplayName,
} from "@/components/dashboard/journeys/journey-display";
import {
  DETAIL_QUERY_PARAM,
  parsePeopleView,
  PeopleView,
  VIEW_QUERY_PARAM,
} from "@/components/dashboard/site-pages/common/detail-query-param";
import { useDashboardQuery } from "@/components/dashboard/site-pages/common/use-dashboard-query";
import { SessionDetailClientPage } from "@/components/dashboard/site-pages/sessions/session-detail-client-page";
import { VisitorDetailClientPage } from "@/components/dashboard/site-pages/visitors/visitor-detail-client-page";
import { fetchVisitors } from "@/lib/dashboard/client/data/index";
import {
  pushUrlWithoutNavigation,
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import { serializeDashboardSearchParams } from "@/lib/dashboard/filter-state";
import { numberFormat } from "@/lib/dashboard/format";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { VisitorsData } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";

import { PeopleSearchInput } from "./people-search-input";
import { SessionsList } from "./sessions-list";
interface VisitorsClientPageProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  pathname: string;
}
export type VisitorRow = VisitorsData["data"]["items"][number];
export const VISITOR_PAGE_SIZE = 50;
export const VISITOR_SKELETON_ROWS = VISITOR_PAGE_SIZE;
export const VISITOR_TABLE_COLUMNS_STORAGE_KEY =
  "insightflare:analytics-table-columns:visitors";
export type SortDirection = "asc" | "desc";
export type VisitorSortKey =
  "firstSeenAt" | "lastSeenAt" | "sessions" | "views";
export interface VisitorSortState {
  key: VisitorSortKey;
  direction: SortDirection;
}
export type VisitorTableColumnId =
  | "visitor"
  | "sessionId"
  | "firstSeen"
  | "lastSeen"
  | "sessions"
  | "pageViews"
  | "customEvents"
  | "referrer"
  | "location"
  | "os"
  | "browser"
  | "device"
  | "screenSize";
export const DEFAULT_VISITOR_SORT: VisitorSortState = {
  key: "lastSeenAt",
  direction: "desc",
};
export function createVisitorTableColumnDefinitions(
  labels: AppMessages["visitors"],
  visitorIdLabel: string,
): readonly AnalyticsTableColumnDefinition<VisitorTableColumnId>[] {
  return [
    { id: "visitor", label: labels.visitor, required: true },
    { id: "sessionId", label: visitorIdLabel },
    { id: "firstSeen", label: labels.firstSeen },
    { id: "lastSeen", label: labels.lastSeen },
    { id: "sessions", label: labels.sessions },
    { id: "pageViews", label: labels.pageViews },
    { id: "customEvents", label: labels.customEvents },
    { id: "referrer", label: labels.referrer },
    { id: "location", label: labels.location },
    { id: "os", label: labels.os },
    { id: "browser", label: labels.browser },
    { id: "device", label: labels.device },
    { id: "screenSize", label: labels.screenSize },
  ];
}
type NestedJourneyDetail = {
  kind: "session" | "visitor";
  id: string;
  stackKey: string;
};
function VisitorRowSkeletonContent({
  index,
  columns,
}: {
  index: number;
  columns: readonly VisitorTableColumnId[];
}) {
  const widths: Record<VisitorTableColumnId, string> = {
    visitor: "w-24",
    sessionId: "w-24",
    firstSeen: "w-20",
    lastSeen: "w-20",
    sessions: "w-12",
    pageViews: "w-10",
    customEvents: "w-10",
    referrer: "w-24",
    location: "w-28",
    os: "w-24",
    browser: "w-24",
    device: "w-20",
    screenSize: "w-20",
  };

  return (
    <>
      {columns.map((columnId) => (
        <TableCell
          key={`${index}-${columnId}`}
          className={columnId === "visitor" ? "pl-4" : undefined}
        >
          {columnId === "visitor" ? (
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : (
            <Skeleton
              className={cn(
                "h-4",
                widths[columnId],
                columnId === "sessions" && "ml-auto",
                ["pageViews", "customEvents"].includes(columnId) && "ml-auto",
                ["firstSeen", "lastSeen", "screenSize"].includes(columnId) &&
                  "mx-auto",
              )}
            />
          )}
        </TableCell>
      ))}
    </>
  );
}
function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (active) {
    return direction === "desc" ? (
      <ChevronDownIcon className="size-3.5" />
    ) : (
      <ChevronUpIcon className="size-3.5" />
    );
  }

  return (
    <span className="inline-flex flex-col leading-none text-muted-foreground">
      <ChevronUpIcon className="-mb-1 size-3.5" />
      <ChevronDownIcon className="-mt-1 size-3.5" />
    </span>
  );
}
function SortHeader({
  label,
  ariaLabel,
  active,
  direction,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  ariaLabel?: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      className={className}
    >
      <div
        className={cn(
          "flex",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
        )}
      >
        <button
          type="button"
          aria-label={ariaLabel ?? label}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            active ? "text-foreground" : "text-muted-foreground",
          )}
          onClick={onClick}
        >
          {label}
          <SortIndicator active={active} direction={direction} />
        </button>
      </div>
    </TableHead>
  );
}
function appendUniqueVisitors(
  current: VisitorRow[],
  incoming: VisitorRow[],
): VisitorRow[] {
  if (current.length === 0) return incoming;
  const seen = new Set(current.map((row) => row.visitorId));
  const nextRows = incoming.filter((row) => !seen.has(row.visitorId));
  return nextRows.length > 0 ? [...current, ...nextRows] : current;
}
function VisitorIdValue({ value }: { value?: string }) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return <span className="font-mono text-muted-foreground">/</span>;
  }
  return (
    <span className="block truncate font-mono font-medium">{normalized}</span>
  );
}
const VisitorTableRowContent = memo(function VisitorTableRowContent({
  locale,
  messages,
  labels,
  row,
  now,
  onOpenDetail,
  columns,
}: {
  locale: Locale;
  messages: AppMessages;
  labels: AppMessages["visitors"];
  row: VisitorRow;
  now: number;
  onOpenDetail: (visitorId: string) => void;
  columns: readonly VisitorTableColumnId[];
}) {
  const openDetail = () => onOpenDetail(row.visitorId);
  const visitorId = row.visitorId.trim();
  const userId = String(row.userId || "").trim();
  const userName = String(row.userName || "").trim();
  const displayName = visitorDisplayName(userName, userId, labels.anonymous);
  const referrerHost = String(row.referrerHost || "").trim();
  const referrerUrl = String(row.referrerUrl || "").trim();
  const referrerDetails = {
    key: `visitor-referrer:${visitorId}:${referrerHost}:${referrerUrl}`,
    items:
      referrerHost || referrerUrl
        ? [
            ...(referrerHost
              ? [
                  {
                    label: messages.common.referrerHost,
                    value: referrerHost,
                    copyValue: referrerHost,
                  },
                ]
              : []),
            ...(referrerUrl
              ? [
                  {
                    label: messages.sessionDetail.referrerUrl,
                    value: referrerUrl,
                    copyValue: referrerUrl,
                  },
                ]
              : []),
          ]
        : [
            {
              label: messages.common.referrer,
              value: messages.overview.direct,
            },
          ],
  };

  const cells: Record<VisitorTableColumnId, ReactNode> = {
    visitor: (
      <ClickableTableCell
        onClick={openDetail}
        className="w-32"
        buttonClassName="pl-4"
        focusable
        ariaLabel={`${labels.visitor}: ${row.visitorId}`}
      >
        <div className="flex w-28 min-w-0 items-center gap-2">
          <VisitorAvatar seed={row.visitorId} className="size-6" />
          <AnalyticsDetailsTooltipTarget
            className="min-w-0 flex-1 truncate"
            locale={locale}
            request={{
              key: `visitor-id:${visitorId}`,
              items: [
                ...(userName
                  ? [
                      {
                        label: messages.visitorDetail.userName,
                        value: userName,
                        copyValue: userName,
                      },
                    ]
                  : []),
                ...(userId
                  ? [
                      {
                        label: messages.visitorDetail.userId,
                        value: userId,
                        copyValue: userId,
                      },
                    ]
                  : []),
                {
                  label: messages.visitorDetail.visitorId,
                  value: visitorId || messages.common.unknown,
                  copyValue: visitorId || undefined,
                  action: visitorId
                    ? {
                        label: messages.common.search,
                        onClick: openDetail,
                      }
                    : undefined,
                },
              ],
            }}
          >
            <span className="truncate">{displayName}</span>
          </AnalyticsDetailsTooltipTarget>
        </div>
      </ClickableTableCell>
    ),
    sessionId: (
      <ClickableTableCell onClick={openDetail} className="max-w-32">
        <div className="flex min-w-0 items-center gap-1">
          <AnalyticsDetailsTooltipTarget
            className="min-w-0 flex-1 truncate"
            locale={locale}
            request={{
              key: `visitor-id-column:${visitorId}`,
              items: [
                {
                  label: messages.visitorDetail.visitorId,
                  value: visitorId || messages.common.unknown,
                  copyValue: visitorId || undefined,
                  action: visitorId
                    ? {
                        label: messages.common.search,
                        onClick: openDetail,
                      }
                    : undefined,
                },
              ],
            }}
          >
            <VisitorIdValue value={visitorId} />
          </AnalyticsDetailsTooltipTarget>
        </div>
      </ClickableTableCell>
    ),
    firstSeen: (
      <ClickableTableCell
        onClick={openDetail}
        className="text-center font-mono text-muted-foreground"
      >
        <AnalyticsTimeTooltipTarget
          className="block"
          locale={locale}
          timestamp={row.firstSeenAt}
        >
          {formatRelativeTime(locale, row.firstSeenAt, now)}
        </AnalyticsTimeTooltipTarget>
      </ClickableTableCell>
    ),
    lastSeen: (
      <ClickableTableCell
        onClick={openDetail}
        className="text-center font-mono text-muted-foreground"
      >
        <AnalyticsTimeTooltipTarget
          className="block"
          locale={locale}
          timestamp={row.lastSeenAt}
        >
          {formatRelativeTime(locale, row.lastSeenAt, now)}
        </AnalyticsTimeTooltipTarget>
      </ClickableTableCell>
    ),
    sessions: (
      <ClickableTableCell
        onClick={openDetail}
        className="text-right tabular-nums"
      >
        {numberFormat(locale, row.sessions)}
      </ClickableTableCell>
    ),
    pageViews: (
      <ClickableTableCell onClick={openDetail} className="text-right">
        <span className="tabular-nums">{numberFormat(locale, row.views)}</span>
      </ClickableTableCell>
    ),
    customEvents: (
      <ClickableTableCell onClick={openDetail} className="text-right">
        <span className="tabular-nums">
          {numberFormat(locale, row.events ?? 0)}
        </span>
      </ClickableTableCell>
    ),
    referrer: (
      <ClickableTableCell onClick={openDetail} className="max-w-48">
        <AnalyticsDetailsTooltipTarget
          className="block"
          locale={locale}
          request={referrerDetails}
        >
          <ReferrerMeta
            referrerHost={row.referrerHost || ""}
            referrerUrl={row.referrerUrl}
            directLabel={messages.overview.direct}
          />
        </AnalyticsDetailsTooltipTarget>
      </ClickableTableCell>
    ),
    location: (
      <ClickableTableCell onClick={openDetail} className="max-w-52">
        <AnalyticsDetailsTooltipTarget
          className="block"
          locale={locale}
          request={{
            key: `visitor-location:${visitorId}:${row.country}:${row.region}:${row.regionCode}:${row.city}`,
            items: [
              {
                label: messages.common.location,
                value: (
                  <CountryRegionMeta
                    locale={locale}
                    messages={messages}
                    country={row.country || ""}
                    region={row.region}
                    regionCode={row.regionCode}
                    city={row.city}
                    className="max-w-none text-background [&_.text-foreground]:text-background"
                  />
                ),
              },
            ],
          }}
        >
          <CountryRegionMeta
            locale={locale}
            messages={messages}
            country={row.country || ""}
            region={row.region}
            regionCode={row.regionCode}
          />
        </AnalyticsDetailsTooltipTarget>
      </ClickableTableCell>
    ),
    os: (
      <ClickableTableCell onClick={openDetail} className="max-w-40">
        <OsMeta
          os={row.os || ""}
          version={row.osVersion}
          unknownLabel={messages.common.unknown}
        />
      </ClickableTableCell>
    ),
    browser: (
      <ClickableTableCell onClick={openDetail} className="max-w-40">
        <BrowserMeta
          browser={row.browser || ""}
          version={row.browserVersion}
          unknownLabel={messages.common.unknown}
        />
      </ClickableTableCell>
    ),
    device: (
      <ClickableTableCell
        onClick={openDetail}
        className="max-w-36"
        buttonClassName="pr-4"
      >
        <DeviceMeta
          deviceType={row.deviceType || ""}
          deviceLabels={messages.common.deviceLabels}
          unknownLabel={messages.common.unknown}
        />
      </ClickableTableCell>
    ),
    screenSize: (
      <ClickableTableCell
        onClick={openDetail}
        className="pr-4 text-center font-mono"
      >
        {formatScreen(row.screenWidth, row.screenHeight)}
      </ClickableTableCell>
    ),
  };

  return (
    <>
      {columns.map((columnId) => (
        <Fragment key={columnId}>{cells[columnId]}</Fragment>
      ))}
    </>
  );
});
export const VisitorAnalyticsTable = memo(function VisitorAnalyticsTable({
  locale,
  messages,
  labels,
  rows,
  now,
  columns,
  sort,
  onToggleSort,
  onOpenDetail,
  loading,
  loadingMore,
  error,
  errorContent,
  emptyContent,
  appendError,
  appendErrorContent,
  hasMore,
  onLoadMore,
}: {
  locale: Locale;
  messages: AppMessages;
  labels: AppMessages["visitors"];
  rows: readonly VisitorRow[];
  now: number;
  columns: readonly VisitorTableColumnId[];
  sort: VisitorSortState;
  onToggleSort: (key: VisitorSortKey) => void;
  onOpenDetail: (visitorId: string) => void;
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  errorContent: ReactNode;
  emptyContent: ReactNode;
  appendError: boolean;
  appendErrorContent: string;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const headers = useMemo<Record<VisitorTableColumnId, ReactNode>>(
    () => ({
      visitor: <TableHead className="w-32 pl-4">{labels.visitor}</TableHead>,
      sessionId: <TableHead>{messages.visitorDetail.visitorId}</TableHead>,
      firstSeen: (
        <SortHeader
          label={labels.firstSeen}
          ariaLabel={formatI18nTemplate(messages.common.sortBy, {
            label: labels.firstSeen,
          })}
          active={sort.key === "firstSeenAt"}
          direction={sort.direction}
          onClick={() => onToggleSort("firstSeenAt")}
          align="center"
          className="text-center"
        />
      ),
      lastSeen: (
        <SortHeader
          label={labels.lastSeen}
          ariaLabel={formatI18nTemplate(messages.common.sortBy, {
            label: labels.lastSeen,
          })}
          active={sort.key === "lastSeenAt"}
          direction={sort.direction}
          onClick={() => onToggleSort("lastSeenAt")}
          align="center"
          className="text-center"
        />
      ),
      sessions: (
        <SortHeader
          label={labels.sessions}
          ariaLabel={formatI18nTemplate(messages.common.sortBy, {
            label: labels.sessions,
          })}
          active={sort.key === "sessions"}
          direction={sort.direction}
          onClick={() => onToggleSort("sessions")}
          align="right"
          className="text-right"
        />
      ),
      pageViews: (
        <SortHeader
          label={labels.pageViews}
          ariaLabel={formatI18nTemplate(messages.common.sortBy, {
            label: labels.pageViews,
          })}
          active={sort.key === "views"}
          direction={sort.direction}
          onClick={() => onToggleSort("views")}
          align="right"
          className="text-right"
        />
      ),
      customEvents: (
        <TableHead className="text-right">{labels.customEvents}</TableHead>
      ),
      referrer: <TableHead>{labels.referrer}</TableHead>,
      location: <TableHead>{labels.location}</TableHead>,
      os: <TableHead>{labels.os}</TableHead>,
      browser: <TableHead>{labels.browser}</TableHead>,
      device: <TableHead className="pr-4">{labels.device}</TableHead>,
      screenSize: (
        <TableHead className="pr-4 text-center">{labels.screenSize}</TableHead>
      ),
    }),
    [
      labels,
      messages.common.sortBy,
      messages.visitorDetail.visitorId,
      onToggleSort,
      sort,
    ],
  );
  const header = useMemo(
    () => (
      <TableRow>
        {columns.map((columnId) => (
          <Fragment key={columnId}>{headers[columnId]}</Fragment>
        ))}
      </TableRow>
    ),
    [columns, headers],
  );
  const renderRow = useCallback(
    (row: VisitorRow) => ({
      children: (
        <VisitorTableRowContent
          locale={locale}
          messages={messages}
          labels={labels}
          row={row}
          now={now}
          onOpenDetail={onOpenDetail}
          columns={columns}
        />
      ),
      props: { className: "cursor-pointer" },
    }),
    [columns, labels, locale, messages, now, onOpenDetail],
  );
  const renderSkeletonRow = useCallback(
    (index: number) => (
      <VisitorRowSkeletonContent index={index} columns={columns} />
    ),
    [columns],
  );
  const getRowKey = useCallback((row: VisitorRow) => row.visitorId, []);

  return (
    <AnalyticsDataTable
      header={header}
      rows={rows}
      renderRow={renderRow}
      renderSkeletonRow={renderSkeletonRow}
      getRowKey={getRowKey}
      skeletonRows={VISITOR_SKELETON_ROWS}
      columnCount={columns.length}
      loading={loading}
      loadingMore={loadingMore}
      error={error}
      errorContent={errorContent}
      emptyContent={emptyContent}
      appendError={appendError}
      appendErrorContent={appendErrorContent}
      enableTimeTooltips
      messages={messages}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
    />
  );
});
/** The Visitors page's Visitors view: one row per visitor. */
function VisitorsList({
  locale,
  messages,
  siteId,
  viewToggle,
  onOpenDetail,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  viewToggle: ReactNode;
  onOpenDetail: (visitorId: string) => void;
}) {
  const labels = messages.visitors;
  const visitorColumnDefinitions = useMemo(
    () =>
      createVisitorTableColumnDefinitions(
        labels,
        messages.visitorDetail.visitorId,
      ),
    [labels, messages.visitorDetail.visitorId],
  );
  const visitorColumns = useAnalyticsTableColumns({
    storageKey: VISITOR_TABLE_COLUMNS_STORAGE_KEY,
    columns: visitorColumnDefinitions,
  });
  const { filters, window: timeWindow } = useDashboardQuery() as {
    filters: FilterDocument;
    window: TimeWindow;
  };
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<VisitorSortState>(DEFAULT_VISITOR_SORT);
  const [now, setNow] = useState(() => Date.now());
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const {
    data,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetching,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "dashboard",
      "visitors",
      siteId,
      timeWindow.from,
      timeWindow.to,
      timeWindow.timeZone,
      filtersKey,
      debouncedQuery,
      sort.key,
      sort.direction,
    ],
    queryFn: ({ pageParam, signal }) =>
      fetchVisitors(siteId, timeWindow, filters, {
        cursor: pageParam,
        limit: VISITOR_PAGE_SIZE,
        sortBy: sort.key,
        sortDir: sort.direction,
        search: debouncedQuery,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? lastPage.data.pagination.nextCursor
        : undefined,
    enabled: typeof window !== "undefined",
  });
  const rows = useMemo(
    () =>
      data?.pages.reduce<VisitorRow[]>(
        (current, page) => appendUniqueVisitors(current, page.data.items),
        [],
      ) ?? [],
    [data?.pages],
  );
  const loadingMore = isFetchingNextPage;
  const error = Boolean(queryError) && rows.length === 0;
  const emptyLabel = emptyContent(
    messages,
    labels.empty,
    Boolean(filters.root),
  );
  const appendError = isFetchNextPageError;
  const replacingRows = isPending || (isFetching && !isFetchingNextPage);
  const hasMore = hasNextPage ?? false;
  const loadNextPage = useCallback(() => {
    if (isPending || loadingMore || appendError || !hasMore) return;
    void fetchNextPage();
  }, [appendError, fetchNextPage, hasMore, isPending, loadingMore]);

  const toggleSort = useCallback((key: VisitorSortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "desc" ? "asc" : "desc",
          }
        : { key, direction: "desc" },
    );
  }, []);

  return (
    <>
      <PageHeading
        title={messages.navigation.visitors}
        actions={
          <>
            {viewToggle}
            <PeopleSearchInput
              value={query}
              onChange={setQuery}
              placeholder={labels.search}
            />
            <AnalyticsTableColumnSettings
              columns={visitorColumnDefinitions}
              orderedIds={visitorColumns.orderedIds}
              visibleIds={visitorColumns.visibleIds}
              onOrderChange={visitorColumns.setOrder}
              onVisibilityChange={visitorColumns.setVisible}
              onReset={visitorColumns.reset}
              labels={messages.common.tableColumns}
            />
          </>
        }
      />

      <VisitorAnalyticsTable
        locale={locale}
        messages={messages}
        labels={labels}
        rows={rows}
        now={now}
        columns={visitorColumns.visibleIds}
        sort={sort}
        onToggleSort={toggleSort}
        onOpenDetail={onOpenDetail}
        loading={replacingRows}
        loadingMore={loadingMore}
        error={error}
        errorContent={
          <LoadFailedContent
            messages={messages}
            onRetry={() => void refetch()}
          />
        }
        emptyContent={emptyLabel}
        appendError={appendError}
        appendErrorContent={labels.loadError}
        hasMore={hasMore}
        onLoadMore={loadNextPage}
      />
    </>
  );
}
function detailQueryTarget(
  pathname: string,
  searchParams: URLSearchParams,
  detailId: string,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set(DETAIL_QUERY_PARAM, detailId);
  const query = serializeDashboardSearchParams(params);
  return query ? `${pathname}?${query}` : pathname;
}
function viewQueryTarget(
  pathname: string,
  searchParams: URLSearchParams,
  view: PeopleView,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(DETAIL_QUERY_PARAM);
  if (view === PeopleView.Sessions) {
    params.set(VIEW_QUERY_PARAM, PeopleView.Sessions);
  } else {
    params.delete(VIEW_QUERY_PARAM);
  }
  const query = serializeDashboardSearchParams(params);
  return query ? `${pathname}?${query}` : pathname;
}
/**
 * Visitors and their sessions, one table at a time: `?view=sessions` lists
 * sessions. `?detail=` opens the row's journey in a drawer, and journeys open
 * each other in drawers stacked on top.
 */
export function VisitorsClientPage({
  locale,
  messages,
  siteId,
  pathname,
}: VisitorsClientPageProps) {
  const searchParams = useLiveSearchParams();
  const view = parsePeopleView(searchParams);
  const detailId = searchParams.get(DETAIL_QUERY_PARAM)?.trim() || "";
  const [nestedDetails, setNestedDetails] = useState<NestedJourneyDetail[]>([]);
  const nestedDetailKeyRef = useRef(0);
  const openedDetailFromListRef = useRef(false);

  useEffect(() => {
    if (!detailId) {
      openedDetailFromListRef.current = false;
      setNestedDetails([]);
    }
  }, [detailId]);

  const openDetail = useCallback(
    (id: string) => {
      openedDetailFromListRef.current = true;
      pushUrlWithoutNavigation(detailQueryTarget(pathname, searchParams, id));
    },
    [pathname, searchParams],
  );
  const openDetailRef = useRef(openDetail);
  openDetailRef.current = openDetail;
  const stableOpenDetail = useCallback((id: string) => {
    openDetailRef.current(id);
  }, []);

  const closeDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(DETAIL_QUERY_PARAM)) return;

    if (openedDetailFromListRef.current) {
      openedDetailFromListRef.current = false;
      window.history.back();
      return;
    }

    params.delete(DETAIL_QUERY_PARAM);
    const query = serializeDashboardSearchParams(params);
    replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
  }, [pathname]);
  const openNestedDetail = useCallback(
    (kind: NestedJourneyDetail["kind"], id: string) => {
      const normalizedId = id.trim();
      if (!normalizedId) return;

      setNestedDetails((current) => {
        const topDetail = current.at(-1);
        if (topDetail?.kind === kind && topDetail.id === normalizedId) {
          return current;
        }
        nestedDetailKeyRef.current += 1;
        return [
          ...current,
          {
            kind,
            id: normalizedId,
            stackKey: `${kind}:${normalizedId}:${nestedDetailKeyRef.current}`,
          },
        ];
      });
    },
    [],
  );
  const openNestedSession = useCallback(
    (sessionId: string) => openNestedDetail("session", sessionId),
    [openNestedDetail],
  );
  const openNestedVisitor = useCallback(
    (visitorId: string) => openNestedDetail("visitor", visitorId),
    [openNestedDetail],
  );
  const closeNestedDetail = useCallback((stackKey: string) => {
    setNestedDetails((current) => {
      const index = current.findIndex((item) => item.stackKey === stackKey);
      return index < 0 ? current : current.slice(0, index);
    });
  }, []);

  const viewToggle = (
    <Tabs
      value={view}
      onValueChange={(next) =>
        replaceUrlWithoutNavigation(
          viewQueryTarget(pathname, searchParams, next as PeopleView),
        )
      }
    >
      <TabsList>
        <TabsTrigger value={PeopleView.Visitors}>
          {messages.visitors.title}
        </TabsTrigger>
        <TabsTrigger value={PeopleView.Sessions}>
          {messages.sessions.title}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
  const renderJourney = (kind: NestedJourneyDetail["kind"], id: string) =>
    kind === "visitor" ? (
      <VisitorDetailClientPage
        locale={locale}
        messages={messages}
        siteId={siteId}
        pathname={pathname}
        visitorId={id}
        onOpenSession={openNestedSession}
      />
    ) : (
      <SessionDetailClientPage
        locale={locale}
        messages={messages}
        siteId={siteId}
        pathname={pathname}
        sessionId={id}
        onOpenVisitor={openNestedVisitor}
      />
    );
  const journeyLabel = (kind: NestedJourneyDetail["kind"]) =>
    kind === "visitor"
      ? messages.visitors.title
      : messages.sessionDetail.visitDetailsTitle;
  const detailKind: NestedJourneyDetail["kind"] =
    view === PeopleView.Sessions ? "session" : "visitor";

  return (
    <div className="space-y-6">
      {view === PeopleView.Sessions ? (
        <SessionsList
          locale={locale}
          messages={messages}
          siteId={siteId}
          viewToggle={viewToggle}
          onOpenSession={stableOpenDetail}
          onOpenVisitor={openNestedVisitor}
        />
      ) : (
        <VisitorsList
          locale={locale}
          messages={messages}
          siteId={siteId}
          viewToggle={viewToggle}
          onOpenDetail={stableOpenDetail}
        />
      )}

      {detailId ? (
        <DetailDrawer
          ariaLabel={journeyLabel(detailKind)}
          drawerKey={`${detailKind}:${detailId}`}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setNestedDetails([]);
              closeDetail();
            }
          }}
        >
          {renderJourney(detailKind, detailId)}
        </DetailDrawer>
      ) : null}

      {nestedDetails.map((nestedDetail) => (
        <DetailDrawer
          key={nestedDetail.stackKey}
          ariaLabel={journeyLabel(nestedDetail.kind)}
          drawerKey={nestedDetail.stackKey}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closeNestedDetail(nestedDetail.stackKey);
          }}
        >
          {renderJourney(nestedDetail.kind, nestedDetail.id)}
        </DetailDrawer>
      ))}
    </div>
  );
}
