import { createEdgeSiteAnalyticsRuntime } from "@/lib/edge/analytics/composition";
import { parseFilterUrlForAudience } from "@/lib/edge/analytics/contract";
import {
  comparisonReferenceWindow,
  EMPTY_FILTER_DOCUMENT,
  isComparisonMode,
  type PagesDashboardComparisonQuery,
  type PagesDashboardQuery,
  type PagesQuery,
  type QueryContext,
  type ReferrersQuery,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import { queryWindowToTime } from "@/lib/edge/analytics/contract";
import {
  parseBooleanFlag,
  parseInterval,
  parseLimit,
  parseListSearch,
  parseQueryLimit,
  parseWindow,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/parsers";
import {
  badRequest,
  jsonResponseWith,
  queryErrorResponse,
  type ResponseContext,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/responses";
import {
  mapPages,
  mapReferrers,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/serializers";
import type { Env } from "@/lib/edge/types";
export async function handlePagesContract(
  env: Env,
  siteId: string,
  url: URL,
  ctx: ResponseContext | undefined,
  queryContext: QueryContext,
): Promise<Response> {
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const limit = parseLimit(url, 20, 200);
  const cursor = url.searchParams.get("cursor");
  const result = await createEdgeSiteAnalyticsRuntime({
    env,
    siteId,
  }).execute("pages", {
    context: queryContext,
    time: queryWindowToTime(window),
    filters: parseFilterUrlForAudience(queryContext.policy.audience, url),
    page: { limit, cursor },
  } satisfies PagesQuery);
  if (!result.ok) return queryErrorResponse(result.error);
  return jsonResponseWith(ctx, {
    ok: true,
    data: {
      items: mapPages([...result.data.items]),
      pagination: result.data.pagination,
    },
  });
}
export async function handleReferrersContract(
  env: Env,
  siteId: string,
  url: URL,
  fallbackLimit = 20,
  allowFullUrlParam = true,
  ctx?: ResponseContext,
  queryContext = siteQueryContext(
    siteId,
    allowFullUrlParam ? "private-dashboard" : "public-share",
  ),
): Promise<Response> {
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const time = queryWindowToTime(window);
  const filters = parseFilterUrlForAudience(queryContext.policy.audience, url);
  const limit = parseLimit(url, fallbackLimit, 200);
  const cursor = url.searchParams.get("cursor");
  const search = parseListSearch(url) ?? undefined;
  const sort =
    url.searchParams.get("sort") === "visitors" ? "visitors" : "views";
  const direction =
    url.searchParams.get("direction") === "asc" ? "asc" : "desc";
  const includeFullUrl = allowFullUrlParam && parseBooleanFlag(url, "fullUrl");
  const query = {
    context: queryContext,
    time,
    filters,
    limit,
    includeFullUrl,
    search,
    sort,
    direction,
    page: { limit, ...(cursor ? { cursor } : {}) },
  } satisfies ReferrersQuery;
  const result = await createEdgeSiteAnalyticsRuntime({
    env,
    siteId,
  }).execute("referrers", query);
  if (!result.ok) return queryErrorResponse(result.error);
  if (!("items" in result.data)) {
    throw new Error("referrers_result_shape_mismatch");
  }
  return jsonResponseWith(ctx!, {
    ok: true,
    data: {
      items: mapReferrers([...result.data.items]),
      pagination: result.data.pagination,
    },
  });
}
export async function handlePagesDashboardContract(
  env: Env,
  siteId: string,
  url: URL,
  ctx?: ResponseContext,
  queryContext = siteQueryContext(siteId, "private-dashboard"),
): Promise<Response> {
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const limit = parseQueryLimit(url, "limit", 12, 1, 25);
  const cursor = url.searchParams.get("cursor");
  const filters = parseFilterUrlForAudience(queryContext.policy.audience, url);
  const search = parseListSearch(url);
  const rawSort = url.searchParams.get("sort");
  const pageMetrics = [
    "views",
    "visitors",
    "sessions",
    "bounceRate",
    "pagesPerSession",
    "avgDurationMs",
  ] as const;
  const sortKeys = [...pageMetrics, "scrollDepth"] as const;
  if (
    rawSort !== null &&
    !sortKeys.includes(rawSort as (typeof sortKeys)[number])
  ) {
    return badRequest("Invalid sort", "invalid-input");
  }
  const rawDirection = url.searchParams.get("direction");
  if (
    rawDirection !== null &&
    rawDirection !== "asc" &&
    rawDirection !== "desc"
  ) {
    return badRequest("Invalid direction", "invalid-input");
  }
  const sort = (rawSort ?? "views") as (typeof sortKeys)[number];
  const direction = rawDirection ?? "desc";
  const compare = url.searchParams.get("compare");
  if (compare !== null && !isComparisonMode(compare)) {
    return badRequest("Invalid comparison", "invalid-input");
  }
  const compareFilterParams = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.startsWith("compareFilter[")) {
      compareFilterParams.append(
        `filter${key.slice("compareFilter".length)}`,
        value,
      );
    }
  }
  const comparisonMetric = pageMetrics.includes(
    url.searchParams.get("metric") as (typeof pageMetrics)[number],
  )
    ? (url.searchParams.get("metric") as (typeof pageMetrics)[number])
    : "views";
  const comparisonSortBy =
    url.searchParams.get("sortBy") === "reference"
      ? "reference"
      : url.searchParams.get("sortBy") === "change"
        ? "change"
        : "current";
  let comparison: PagesDashboardComparisonQuery | undefined;
  if (compare !== null) {
    const referenceFilters = compareFilterParams.size
      ? parseFilterUrlForAudience(
          queryContext.policy.audience,
          compareFilterParams,
        )
      : compare !== "same"
        ? filters
        : EMPTY_FILTER_DOCUMENT;
    if (compare !== "same" || referenceFilters.conditions.length > 0) {
      const referenceWindow = comparisonReferenceWindow(compare, window);
      comparison = {
        current: { time: queryWindowToTime(window), filters },
        reference: {
          time: queryWindowToTime(referenceWindow),
          filters: referenceFilters,
        },
        metric: comparisonMetric,
        sortBy: comparisonSortBy,
        direction,
      };
    }
  }
  const result = await createEdgeSiteAnalyticsRuntime({
    env,
    siteId,
  }).execute("pages-dashboard", {
    context: queryContext,
    time: queryWindowToTime(window),
    filters,
    interval: parseInterval(url),
    search,
    sort: { key: sort, direction },
    ...(comparison ? { comparison } : {}),
    page: { limit, cursor },
    audience: queryContext.policy.audience,
  } satisfies PagesDashboardQuery);
  if (!result.ok) return queryErrorResponse(result.error);
  return jsonResponseWith(ctx!, {
    ok: true,
    data: {
      items: result.data.items,
      pagination: result.data.pagination,
    },
    interval: result.data.interval,
  });
}
