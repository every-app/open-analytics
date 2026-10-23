import { useCallback, useMemo, useState } from "react";
import { PageHeading } from "@insightflare/ui/page-heading";
import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/common/empty-state";
import {
  CampaignBreakdownCard,
  NoTaggedVisits,
} from "@/components/dashboard/campaigns/campaign-breakdown-card";
import { CampaignShareTrendCard } from "@/components/dashboard/campaigns/campaign-share-trend-card";
import {
  buildCampaignRows,
  type CampaignSortKey,
  type CampaignTab,
  withCampaignTag,
} from "@/components/dashboard/campaigns/campaign-utils";
import type { TabbedDataTableLoader } from "@/components/dashboard/common/tabbed-data-table-card";
import type { ComparisonTableMetric } from "@/components/dashboard/comparison/comparison-table";
import {
  dashboardComparisonLabel,
  useDashboardComparisonQuery,
} from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { useDashboardQuery } from "@/components/dashboard/site-pages/common/use-dashboard-query";
import { fetchUtmDimension } from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
interface CampaignsClientPageProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  pathname: string;
}
export function CampaignsClientPage({
  locale,
  messages,
  siteId,
}: CampaignsClientPageProps) {
  const { filters, window } = useDashboardQuery() as {
    filters: FilterDocument;
    window: TimeWindow;
  };
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonQuery = useDashboardComparisonQuery(window, filters);
  const comparisonFiltersKey = useMemo(
    () => (comparisonQuery ? filterQueryKey(comparisonQuery.filters) : "none"),
    [comparisonQuery],
  );
  const [comparisonMetric, setComparisonMetric] =
    useState<ComparisonTableMetric>("views");
  const requestFilters = filters;
  const requestWindow = useMemo(
    () => ({
      preset: window.preset,
      from: window.from,
      to: window.to,
      interval: window.interval,
      timeZone: window.timeZone,
    }),
    [window.from, window.interval, window.preset, window.timeZone, window.to],
  );

  const loader = useCallback<
    TabbedDataTableLoader<
      CampaignTab,
      ReturnType<typeof buildCampaignRows>[number],
      CampaignSortKey
    >
  >(
    async ({ tab, cursor, limit, search, signal, sort }) => {
      const payload = await fetchUtmDimension(
        siteId,
        requestWindow,
        tab,
        withCampaignTag(requestFilters, tab),
        {
          cursor,
          direction: sort.direction,
          limit,
          search,
          signal,
          sort:
            sort.key === "current" ||
            sort.key === "reference" ||
            sort.key === "change"
              ? comparisonMetric
              : sort.key,
          comparison: comparisonQuery,
          comparisonMetric,
          comparisonSortBy:
            sort.key === "current" ||
            sort.key === "reference" ||
            sort.key === "change"
              ? sort.key
              : undefined,
        },
      );
      const items = buildCampaignRows(
        payload.items,
        tab,
        messages.campaigns.notSet,
      );
      return {
        items,
        pagination: {
          limit,
          returned: items.length,
          hasMore: payload.pagination.hasMore,
          nextCursor: payload.pagination.nextCursor,
        },
      };
    },
    [
      comparisonMetric,
      comparisonQuery,
      messages.campaigns.notSet,
      requestFilters,
      requestWindow,
      siteId,
    ],
  );
  const comparisonKey = comparisonQuery
    ? `${comparisonQuery.mode}:${comparisonQuery.window.from}:${comparisonQuery.window.to}:${comparisonFiltersKey}`
    : "none";
  const requestKey = `${siteId}:${window.from}:${window.to}:${window.interval}:${window.timeZone}:${filtersKey}:${comparisonKey}:${locale}`;

  // Unfiltered, with no visit in this period carrying a UTM source: one empty state that
  // shows what a tagged link looks like, instead of empty charts and tables.
  const taggedSources = useQuery({
    queryKey: [
      "dashboard",
      "campaign-tagged-sources",
      siteId,
      window.from,
      window.to,
      window.timeZone,
      filtersKey,
    ],
    queryFn: ({ signal }) =>
      fetchUtmDimension(
        siteId,
        requestWindow,
        "source",
        withCampaignTag(requestFilters, "source"),
        { limit: 1, signal },
      ),
    enabled: typeof globalThis.window !== "undefined" && !filters.root,
  });
  const noTaggedVisits =
    !filters.root &&
    taggedSources.data !== undefined &&
    taggedSources.data.items.length === 0;

  return (
    <div className="space-y-6">
      <PageHeading title={messages.navigation.campaigns} />

      {noTaggedVisits ? (
        <EmptyState
          title={<NoTaggedVisits messages={messages} />}
          variant="card"
          className="min-h-64"
        />
      ) : (
        <>
          <CampaignShareTrendCard
            locale={locale}
            messages={messages}
            siteId={siteId}
            window={requestWindow}
            filters={requestFilters}
          />

          <CampaignBreakdownCard
            locale={locale}
            messages={messages}
            loader={loader}
            comparisonQuery={comparisonQuery}
            comparisonLabel={dashboardComparisonLabel(
              messages,
              comparisonQuery,
            )}
            comparisonMetric={comparisonMetric}
            onComparisonMetricChange={setComparisonMetric}
            requestKey={requestKey}
            filtered={Boolean(filters.root)}
          />
        </>
      )}
    </div>
  );
}
