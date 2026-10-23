import { useMemo } from "react";
import { useInfiniteTableSentinel } from "@insightflare/product-ui/tables";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Button } from "@insightflare/ui/button";
import { Card, CardContent } from "@insightflare/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import { PageHeading } from "@insightflare/ui/page-heading";
import { ChevronDownIcon, PlusIcon, RotateCwIcon } from "lucide-react";

import { useDashboardComparisonQuery } from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { useDashboardQuery } from "@/components/dashboard/site-pages/common/use-dashboard-query";
import { useGoalConversions } from "@/components/dashboard/site-pages/goals/use-goal-conversions";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { ConversionsEmptyIllustration } from "./conversions-empty-illustration";
import { useFunnelConversions } from "./use-funnel-conversions";

const SKELETON_CARDS = 4;

function NewConversionMenu({
  messages,
  onNewGoal,
  onNewFunnel,
}: {
  readonly messages: AppMessages;
  readonly onNewGoal: () => void;
  readonly onNewFunnel: () => void;
}) {
  const labels = messages.conversions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" className="shrink-0">
          <PlusIcon data-icon="inline-start" />
          {labels.new}
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={onNewGoal}>
          <div className="grid gap-0.5">
            <span className="font-medium">{labels.newGoal}</span>
            <span className="text-xs text-muted-foreground">
              {labels.newGoalDescription}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewFunnel}>
          <div className="grid gap-0.5">
            <span className="font-medium">{labels.newFunnel}</span>
            <span className="text-xs text-muted-foreground">
              {labels.newFunnelDescription}
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Goals and funnels in one list. A goal is a one-step conversion; a funnel
 * counts several steps in order.
 */
export function ConversionsClientPage({
  locale,
  messages,
  siteId,
  pathname,
  canManage = false,
}: {
  readonly locale: Locale;
  readonly messages: AppMessages;
  readonly siteId: string;
  readonly pathname: string;
  readonly canManage?: boolean;
}) {
  const labels = messages.conversions;
  const { filters, window } = useDashboardQuery() as {
    filters: FilterDocument;
    window: TimeWindow;
  };
  const filterKey = useMemo(() => filterQueryKey(filters), [filters]);
  const comparisonQuery = useDashboardComparisonQuery(window, filters);
  const listInput = {
    locale,
    messages,
    siteId,
    pathname,
    window,
    filters,
    filterKey,
    comparisonQuery,
    canManage,
  };
  const goals = useGoalConversions(listInput);
  const funnels = useFunnelConversions(listInput);
  const isPending = goals.isPending || funnels.isPending;
  // A list that failed says so and offers a retry; the other still shows.
  const failedLists = [goals, funnels].filter((list) => list.isError);
  const cards = [...goals.cards, ...funnels.cards];
  // Goals load to the end first, then funnels.
  const next = goals.hasNextPage ? goals : funnels;
  const sentinelRef = useInfiniteTableSentinel({
    enabled: next.hasNextPage,
    onReachEnd: next.loadMore,
  });
  const isEmpty = !isPending && cards.length === 0 && failedLists.length === 0;
  const newMenu = canManage ? (
    <NewConversionMenu
      messages={messages}
      onNewGoal={goals.openCreate}
      onNewFunnel={funnels.openCreate}
    />
  ) : null;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <PageHeading title={messages.navigation.funnels} />
        {/* The empty state carries the one New button. */}
        {isEmpty ? null : newMenu}
      </div>

      <AutoTransition
        initial={false}
        transitionKey={isPending ? "loading" : isEmpty ? "empty" : "ready"}
        duration={0.18}
        type="fade"
        presenceMode="wait"
        className="min-w-0"
      >
        {isPending ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {Array.from({ length: SKELETON_CARDS }, (_, index) =>
              index % 2 === 0 ? goals.skeleton(index) : funnels.skeleton(index),
            )}
          </div>
        ) : isEmpty ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <ConversionsEmptyIllustration />
              <p className="mt-2 font-medium">{labels.empty}</p>
              {canManage ? null : (
                <p className="text-sm text-muted-foreground">
                  {labels.emptyMemberHint}
                </p>
              )}
              {newMenu}
            </CardContent>
          </Card>
        ) : (
          <div className="min-w-0 space-y-4">
            {failedLists.length > 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-6 text-center text-muted-foreground">
                  <p>{messages.common.loadFailed}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      for (const list of failedLists) list.retry();
                    }}
                  >
                    <RotateCwIcon data-icon="inline-start" />
                    {messages.common.retry}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
            {cards.length > 0 ? (
              <div className="grid min-w-0 items-stretch gap-4 md:grid-cols-2">
                {cards}
              </div>
            ) : null}
          </div>
        )}
      </AutoTransition>

      {cards.length > 0 ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      ) : null}

      {goals.overlays}
      {funnels.overlays}
    </div>
  );
}
