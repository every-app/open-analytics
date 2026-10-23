import { memo } from "react";
import type { TabbedDataTableCardProps } from "@insightflare/product-ui/tabbed-table";
import {
  TabbedDataTableCardDataController,
  type TabbedDataTablePage,
  type TabbedDataTableQueryOptions,
  type TabbedDataTableRowBase,
} from "@insightflare/product-ui/tabbed-table";
import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
} from "@tanstack/react-query";

import { emptyContent } from "@/components/dashboard/common/table-states";
import type { AppMessages } from "@/lib/i18n/messages";

export type * from "@insightflare/product-ui/tabbed-table";

function useDashboardTableQuery<TRow extends TabbedDataTableRowBase>(
  options: TabbedDataTableQueryOptions<TRow>,
) {
  return useInfiniteQuery<
    TabbedDataTablePage<TRow>,
    Error,
    InfiniteData<TabbedDataTablePage<TRow>, string | null>,
    QueryKey,
    string | null
  >({
    queryKey: options.queryKey,
    staleTime: options.staleTime,
    queryFn: ({ pageParam, signal }) => options.queryFn({ pageParam, signal }),
    initialPageParam: options.initialPageParam,
    getNextPageParam: options.getNextPageParam,
    placeholderData: options.placeholderData,
    enabled: options.enabled,
  });
}

/**
 * The package's tabbed table with the dashboard's empty and error states: a
 * filtered table offers to clear the filters, and a failed one to retry.
 */
function TabbedDataTableCardImpl<
  TTab extends string,
  TRow extends TabbedDataTableRowBase,
  TKey extends string = string,
>({
  messages,
  emptyLabel,
  filtered = false,
  ...props
}: Omit<TabbedDataTableCardProps<TTab, TRow, TKey>, "errorLabel"> & {
  messages: AppMessages;
  /** The rows follow the page's filters, and some are set. */
  filtered?: boolean;
}) {
  return (
    <TabbedDataTableCardDataController
      {...props}
      emptyLabel={emptyContent(messages, emptyLabel, filtered)}
      errorLabel={messages.common.loadFailed}
      retryLabel={messages.common.retry}
      useDataQuery={useDashboardTableQuery}
    />
  );
}

export const TabbedDataTableCard = memo(
  TabbedDataTableCardImpl,
) as typeof TabbedDataTableCardImpl;
