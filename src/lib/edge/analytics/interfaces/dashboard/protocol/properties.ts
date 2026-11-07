import { createEdgeSiteAnalyticsRuntime } from "@/lib/edge/analytics/composition";
import {
  parseFilterUrlForAudience,
  PropertyValueSortKey,
  queryWindowToTime,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import {
  parseLimit,
  parseListSearch,
  parseWindow,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/parsers";
import {
  badRequest,
  jsonResponseWith,
  queryErrorResponse,
  type ResponseContext,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/responses";
import type { Env } from "@/lib/edge/types";

const SORT_KEYS = new Set<string>(Object.values(PropertyValueSortKey));

/** The custom property keys seen in the period. */
export async function handlePropertyKeysContract(
  env: Env,
  siteId: string,
  url: URL,
  ctx: ResponseContext | undefined,
  queryContext = siteQueryContext(siteId, "private-dashboard"),
): Promise<Response> {
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const result = await createEdgeSiteAnalyticsRuntime({ env, siteId }).execute(
    "property-keys",
    {
      context: queryContext,
      time: queryWindowToTime(window),
      filters: parseFilterUrlForAudience(queryContext.policy.audience, url),
      limit: parseLimit(url, 100, 100),
    },
  );
  if (!result.ok) return queryErrorResponse(result.error);
  return jsonResponseWith(ctx, { ok: true, data: result.data });
}

/** One custom property's values in the period (`key`). */
export async function handlePropertyValuesContract(
  env: Env,
  siteId: string,
  url: URL,
  ctx: ResponseContext | undefined,
  queryContext = siteQueryContext(siteId, "private-dashboard"),
): Promise<Response> {
  const key = url.searchParams.get("key");
  if (!key) return badRequest("key is required");
  const sort = url.searchParams.get("sort") ?? PropertyValueSortKey.Visitors;
  if (!SORT_KEYS.has(sort)) return badRequest("Invalid sort");
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const result = await createEdgeSiteAnalyticsRuntime({ env, siteId }).execute(
    "property-values",
    {
      context: queryContext,
      time: queryWindowToTime(window),
      filters: parseFilterUrlForAudience(queryContext.policy.audience, url),
      key,
      search: parseListSearch(url) ?? "",
      sort: {
        key: sort as PropertyValueSortKey,
        direction: url.searchParams.get("direction") === "asc" ? "asc" : "desc",
      },
      limit: parseLimit(url, 10, 100),
    },
  );
  if (!result.ok) return queryErrorResponse(result.error);
  return jsonResponseWith(ctx, { ok: true, data: result.data });
}
