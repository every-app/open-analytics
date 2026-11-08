import { useMemo } from "react";
import { Card } from "@insightflare/ui/card";
import { useQuery } from "@tanstack/react-query";

import {
  TabbedDataTableCard,
  type TabbedDataTableLoader,
} from "@/components/dashboard/common/tabbed-data-table-card";
import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import { useDashboardNavHref } from "@/components/dashboard/shell/dashboard-shell/navigation";
import {
  fetchAllGoals,
  fetchGoalConversions,
} from "@/lib/dashboard/client/data/index";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { useRouter } from "@/lib/router";

import {
  goalConversionColumns,
  type GoalConversionRow,
  goalConversionRows,
  goalHref,
  type GoalSortKey,
} from "./goal-conversions";

const GOALS_TAB = "goals";

interface GoalConversionsCardProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
  /** The site's Goals & funnels page, which a goal's row opens. */
  goalsPath: string;
}

/**
 * Each of the site's goals with its unique conversions, total conversions
 * ("—" for a scroll depth goal) and conversion rate for the range and
 * filters, and, once a goal has a currency, its revenue and average revenue,
 * all read in one request. Shown once a goal exists; a row opens the goal on
 * Goals & funnels.
 */
export function GoalConversionsCard({
  locale,
  messages,
  siteId,
  window,
  filters,
  goalsPath,
}: GoalConversionsCardProps) {
  const router = useRouter();
  const navHref = useDashboardNavHref();
  const labels = messages.dashboard.goals;
  const goals = useQuery({
    queryKey: ["dashboard", "goal-list", siteId],
    queryFn: ({ signal }) => fetchAllGoals(siteId, { signal }),
    enabled: typeof globalThis.window !== "undefined",
  });
  const goalList = goals.data;
  const hasRevenue =
    goalList?.some((goal) => goal.currency !== undefined) ?? false;
  const filtersKey = useMemo(() => filterQueryKey(filters), [filters]);
  const columns = useMemo(
    () => goalConversionColumns(labels, locale, hasRevenue),
    [hasRevenue, labels, locale],
  );
  const loader = useMemo<
    TabbedDataTableLoader<string, GoalConversionRow, GoalSortKey>
  >(
    () =>
      async ({ signal }) => {
        const { data } = await fetchGoalConversions(siteId, window, filters, {
          signal,
        });
        return {
          items: goalConversionRows(data.goals),
          pagination: { hasMore: false, nextCursor: null },
        };
      },
    [filters, siteId, window],
  );

  if (goals.isError) {
    return (
      <Card className="flex min-h-40 items-center justify-center text-sm text-destructive">
        <LoadFailedContent
          messages={messages}
          onRetry={() => void goals.refetch()}
        />
      </Card>
    );
  }
  if (!goalList || goalList.length === 0) return null;

  return (
    <TabbedDataTableCard<string, GoalConversionRow, GoalSortKey>
      messages={messages}
      tabs={[
        { value: GOALS_TAB, label: labels.title, columnLabel: labels.goal },
      ]}
      loader={loader}
      requestKey={[
        siteId,
        window.from,
        window.to,
        window.timeZone,
        filtersKey,
        goalList.map((goal) => goal.semanticFingerprint).join(","),
      ].join("|")}
      columns={columns}
      rowAdapter={{
        renderLabel: (row) => <span className="break-words">{row.name}</span>,
        getSearchText: (row) => row.name,
        getExportLabel: (row) => row.name,
        getInteractive: () => true,
        onClick: (row) =>
          void router.push(goalHref(goalsPath, row.goalId, navHref)),
      }}
      defaultSort={{ key: "uniques", direction: "desc" }}
      sortActionLabel={(label) =>
        formatI18nTemplate(messages.common.sortBy, { label })
      }
      loadingLabel={messages.common.loading}
      emptyLabel={messages.common.noData}
      search={false}
      export={false}
      viewportClassName="max-h-none"
    />
  );
}
