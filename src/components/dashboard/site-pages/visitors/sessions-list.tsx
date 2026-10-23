import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AnalyticsTableColumnSettings,
  useAnalyticsTableColumns,
} from "@insightflare/product-ui/tables";
import { PageHeading } from "@insightflare/ui/page-heading";
import { useInfiniteQuery } from "@tanstack/react-query";

import { emptyContent } from "@/components/dashboard/common/table-states";
import {
  createSessionTableColumnDefinitions,
  SESSION_TABLE_COLUMNS_STORAGE_KEY,
  type SessionSortKey,
  type SessionSortState,
  SessionsTableCard,
} from "@/components/dashboard/sessions/sessions-table-card";
import { useDashboardQuery } from "@/components/dashboard/site-pages/common/use-dashboard-query";
import { fetchSessions } from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { JourneySession } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { PeopleSearchInput } from "./people-search-input";

const SESSION_PAGE_SIZE = 50;
const DEFAULT_SESSION_SORT: SessionSortState = {
  key: "startedAt",
  direction: "desc",
};

function appendUniqueSessions(
  current: JourneySession[],
  incoming: JourneySession[],
): JourneySession[] {
  if (current.length === 0) return incoming;
  const seen = new Set(current.map((row) => row.sessionId));
  const nextRows = incoming.filter((row) => !seen.has(row.sessionId));
  return nextRows.length > 0 ? [...current, ...nextRows] : current;
}

/** The Visitors page's Sessions view: one row per session. */
export function SessionsList({
  locale,
  messages,
  siteId,
  viewToggle,
  onOpenSession,
  onOpenVisitor,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  viewToggle: ReactNode;
  onOpenSession: (sessionId: string) => void;
  onOpenVisitor: (visitorId: string) => void;
}) {
  const labels = messages.sessions;
  const sessionColumnDefinitions = useMemo(
    () => createSessionTableColumnDefinitions(labels),
    [labels],
  );
  const sessionColumns = useAnalyticsTableColumns({
    storageKey: SESSION_TABLE_COLUMNS_STORAGE_KEY,
    columns: sessionColumnDefinitions,
  });
  const { filters, window: timeWindow } = useDashboardQuery() as {
    filters: FilterDocument;
    window: TimeWindow;
  };
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SessionSortState>(DEFAULT_SESSION_SORT);
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);

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
      "sessions",
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
      fetchSessions(siteId, timeWindow, filters, {
        cursor: pageParam,
        limit: SESSION_PAGE_SIZE,
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
      data?.pages.reduce<JourneySession[]>(
        (current, page) => appendUniqueSessions(current, page.data.items),
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

  const toggleSort = useCallback((key: SessionSortKey) => {
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
              columns={sessionColumnDefinitions}
              orderedIds={sessionColumns.orderedIds}
              visibleIds={sessionColumns.visibleIds}
              onOrderChange={sessionColumns.setOrder}
              onVisibilityChange={sessionColumns.setVisible}
              onReset={sessionColumns.reset}
              labels={messages.common.tableColumns}
            />
          </>
        }
      />

      <SessionsTableCard
        locale={locale}
        messages={messages}
        labels={labels}
        rows={rows}
        onOpenSession={onOpenSession}
        onOpenVisitor={onOpenVisitor}
        sort={sort}
        onSort={toggleSort}
        loadingRows={replacingRows}
        loadingMore={loadingMore}
        error={error}
        onRetry={() => void refetch()}
        emptyContent={emptyLabel}
        appendError={appendError}
        hasMore={hasMore}
        skeletonRows={SESSION_PAGE_SIZE}
        onLoadMore={loadNextPage}
        visibleColumnIds={sessionColumns.visibleIds}
      />
    </>
  );
}
