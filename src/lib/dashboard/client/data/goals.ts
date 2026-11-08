import {
  fetchPrivateJson,
  fetchPrivateJsonMutate,
} from "@/lib/dashboard/client/request";
import { withFilters, withPagination } from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  GoalConversionsData,
  GoalDefinition,
  GoalDeleteData,
  GoalListData,
  GoalMutationData,
  GoalSummaryData,
  GoalTimeseriesData,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract";
export async function fetchGoals(
  siteId: string,
  options?: {
    limit?: number;
    cursor?: string | null;
    signal?: AbortSignal;
  },
): Promise<GoalListData> {
  const requestParams = withPagination({ siteId }, options, 100);
  return fetchPrivateJson<GoalListData>("/api/private/goals", requestParams, {
    signal: options?.signal,
  });
}
/** Every goal of the site, read page by page. */
export async function fetchAllGoals(
  siteId: string,
  options?: { signal?: AbortSignal },
): Promise<GoalDefinition[]> {
  const goals: GoalDefinition[] = [];
  let cursor: string | null = null;
  do {
    const { data } = await fetchGoals(siteId, {
      cursor,
      signal: options?.signal,
    });
    goals.push(...data.items);
    if (data.pagination.hasMore && !data.pagination.nextCursor) {
      throw new Error("goal_list_cursor_missing");
    }
    cursor = data.pagination.hasMore ? data.pagination.nextCursor : null;
  } while (cursor);
  return goals;
}
export async function fetchGoalDefinition(
  siteId: string,
  goalId: string,
  options?: { signal?: AbortSignal },
): Promise<GoalMutationData> {
  return fetchPrivateJson<GoalMutationData>(
    "/api/private/goals",
    { siteId, id: goalId.trim() },
    { signal: options?.signal, dedupe: false },
  );
}
/** Every goal of the site with its conversions, in one request. */
export async function fetchGoalConversions(
  siteId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: { signal?: AbortSignal },
): Promise<GoalConversionsData> {
  return fetchPrivateJson<GoalConversionsData>(
    "/api/private/goal-conversions",
    withFilters(
      { siteId, from: window.from, to: window.to, timeZone: window.timeZone },
      filters,
    ),
    { dedupe: false, signal: options?.signal },
  );
}
export async function fetchGoalSummary(
  siteId: string,
  goalId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: { signal?: AbortSignal; goalSemanticFingerprint?: string },
): Promise<GoalSummaryData> {
  return fetchPrivateJson<GoalSummaryData>(
    "/api/private/goal-summary",
    withFilters(
      {
        siteId,
        id: goalId.trim(),
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        ...(options?.goalSemanticFingerprint
          ? { goalFingerprint: options.goalSemanticFingerprint }
          : {}),
      },
      filters,
    ),
    { dedupe: false, signal: options?.signal },
  );
}
export async function fetchGoalTimeseries(
  siteId: string,
  goalId: string,
  window: TimeWindow,
  filters?: FilterDocument,
  options?: { signal?: AbortSignal; goalSemanticFingerprint?: string },
): Promise<GoalTimeseriesData> {
  return fetchPrivateJson<GoalTimeseriesData>(
    "/api/private/goal-timeseries",
    withFilters(
      {
        siteId,
        id: goalId.trim(),
        from: window.from,
        to: window.to,
        timeZone: window.timeZone,
        interval: window.interval,
        ...(options?.goalSemanticFingerprint
          ? { goalFingerprint: options.goalSemanticFingerprint }
          : {}),
      },
      filters,
    ),
    { dedupe: false, signal: options?.signal },
  );
}
/** A goal's fields; a null `currency` is a goal without revenue. */
export async function createGoal(
  siteId: string,
  input: { name: string; filterDsl: string; currency: string | null },
): Promise<GoalMutationData> {
  return fetchPrivateJsonMutate<GoalMutationData>(
    "/api/private/goals",
    "POST",
    { siteId },
    {
      name: input.name,
      filterDslVersion: 1,
      filterDsl: input.filterDsl,
      currency: input.currency,
    },
  );
}
/** Changes the given fields; a null `currency` removes the goal's revenue. */
export async function updateGoal(
  siteId: string,
  goalId: string,
  input: { name?: string; filterDsl?: string; currency?: string | null },
): Promise<GoalMutationData> {
  return fetchPrivateJsonMutate<GoalMutationData>(
    "/api/private/goals",
    "PATCH",
    { siteId, id: goalId },
    {
      ...input,
      ...(input.filterDsl === undefined ? {} : { filterDslVersion: 1 }),
    },
  );
}
export async function deleteGoal(
  siteId: string,
  goalId: string,
): Promise<GoalDeleteData> {
  return fetchPrivateJsonMutate<GoalDeleteData>(
    "/api/private/goals",
    "DELETE",
    { siteId, id: goalId },
  );
}
