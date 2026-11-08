import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { Skeleton } from "@insightflare/ui/skeleton";

import { describeFilter } from "@/lib/dashboard/filter-description";
import type {
  GoalDefinition,
  GoalSummary,
} from "@/lib/dashboard-api/client/edge";
import {
  analyticsFilterRegistry,
  parseFilterDsl,
} from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { GoalActions } from "./goal-actions";
import { GoalVisualizationAdapter } from "./goal-visualization";
const noop = () => undefined;
export function goalFilterSummary(
  goal: GoalDefinition,
  messages: Pick<AppMessages, "conditionDescription" | "filterBuilder">,
): string {
  try {
    return describeFilter(
      parseFilterDsl(goal.filterDsl, analyticsFilterRegistry),
      analyticsFilterRegistry,
      messages,
    );
  } catch {
    return goal.filterDsl;
  }
}
export function GoalCardSkeleton({
  locale,
  labels,
  canManage,
}: {
  readonly locale: Locale;
  readonly labels: AppMessages["goals"];
  readonly canManage: boolean;
}) {
  return (
    <Card className="h-full min-w-0" data-goal-card-skeleton="true">
      <CardHeader className="flex items-center justify-between gap-3 space-y-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="pointer-events-none">
          <GoalActions
            labels={labels}
            canManage={canManage}
            onOpen={noop}
            onEdit={noop}
            onDelete={noop}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-1 text-sm">
          <Skeleton className="h-4 w-full" />
        </div>
        <GoalVisualizationAdapter locale={locale} labels={labels} loading />
      </CardContent>
    </Card>
  );
}
/**
 * A goal on Goals & funnels: its conversions, which the page reads for all
 * of its goals at once.
 */
export function GoalCard({
  goal,
  locale,
  labels,
  messages,
  summary,
  comparisonSummary,
  comparing,
  loadError,
  canManage,
  onOpen,
  onEdit,
  onDelete,
}: {
  readonly goal: GoalDefinition;
  readonly locale: Locale;
  readonly labels: AppMessages["goals"];
  readonly messages: Pick<
    AppMessages,
    "conditionDescription" | "filterBuilder"
  >;
  /** Undefined while loading. */
  readonly summary: GoalSummary | undefined;
  readonly comparisonSummary: GoalSummary | undefined;
  readonly comparing: boolean;
  readonly loadError: boolean;
  readonly canManage: boolean;
  readonly onOpen: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <div className="h-full min-w-0">
      <Card className="relative h-full min-w-0">
        <div
          className="-my-4 flex min-h-0 min-w-0 flex-1 cursor-pointer flex-col space-y-4 py-4 transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
          role="button"
          tabIndex={0}
          aria-label={`${labels.open}: ${goal.name}`}
          onClick={onOpen}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onOpen();
          }}
        >
          <CardHeader className="flex items-center justify-between gap-3 space-y-0 pr-16">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <CardTitle className="min-w-0 truncate text-base">
                {goal.name}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {goalFilterSummary(goal, messages)}
            </p>
            {loadError ? (
              <p className="text-sm text-muted-foreground">
                {labels.detailLoadError}
              </p>
            ) : (
              <GoalVisualizationAdapter
                summary={summary}
                comparisonSummary={comparisonSummary}
                locale={locale}
                labels={labels}
                loading={!summary}
                comparisonLoading={comparing && !comparisonSummary}
              />
            )}
          </CardContent>
        </div>
        <div className="absolute right-4 top-4">
          <GoalActions
            labels={labels}
            canManage={canManage}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </Card>
    </div>
  );
}
