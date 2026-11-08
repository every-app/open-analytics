import {
  analyticsDiagnosticHeaders,
  createAnalyticsReadDiagnostics,
  createEdgeSiteAnalyticsRuntime,
} from "@/lib/edge/analytics/composition";
import {
  DashboardCard,
  type DashboardCardTabs,
  type DashboardQuery,
  DevicesCardTab,
  LocationsCardTab,
  PagesCardTab,
  parseFilterUrlForAudience,
  queryWindowToTime,
  siteQueryContext,
  SourcesCardTab,
} from "@/lib/edge/analytics/contract";
import {
  aggregateMetrics,
  trendRows,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import {
  parseInterval,
  parseWindow,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/parsers";
import {
  badRequest,
  jsonResponseWith,
  queryErrorResponse,
  type ResponseContext,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/responses";
import type { Env } from "@/lib/edge/types";

const CARD_TABS: Readonly<Record<DashboardCard, readonly string[]>> = {
  [DashboardCard.Sources]: Object.values(SourcesCardTab),
  [DashboardCard.Pages]: Object.values(PagesCardTab),
  [DashboardCard.Locations]: Object.values(LocationsCardTab),
  [DashboardCard.Devices]: Object.values(DevicesCardTab),
};

/**
 * The tab each card shows, one parameter per card, or none for a load
 * without the cards. Null when they are partial or name an unknown tab.
 */
function parseCardTabs(url: URL): DashboardCardTabs | undefined | null {
  const cards = Object.values(DashboardCard);
  const tabs = cards.map((card) => url.searchParams.get(card));
  if (tabs.every((tab) => tab === null)) return undefined;
  if (tabs.some((tab, index) => !CARD_TABS[cards[index]!].includes(tab!))) {
    return null;
  }
  return Object.fromEntries(
    cards.map((card, index) => [card, tabs[index]]),
  ) as unknown as DashboardCardTabs;
}

/**
 * A dashboard load: the totals, the graph's points and each card's top
 * rows, in one request.
 */
export async function handleDashboardContract(
  env: Env,
  siteId: string,
  url: URL,
  ctx?: ResponseContext,
  queryContext = siteQueryContext(siteId, "private-dashboard"),
): Promise<Response> {
  const window = parseWindow(url);
  if (!window) return badRequest("Invalid time window");
  const cards = parseCardTabs(url);
  if (cards === null) return badRequest("Invalid card tabs", "invalid-input");
  const diagnostics = createAnalyticsReadDiagnostics();
  const query = {
    context: queryContext,
    time: queryWindowToTime(window),
    filters: parseFilterUrlForAudience(queryContext.policy.audience, url),
    interval: parseInterval(url),
    ...(cards ? { cards } : {}),
  } satisfies DashboardQuery;
  const result = await createEdgeSiteAnalyticsRuntime({
    env,
    siteId,
    diagnostics,
  }).execute("dashboard", query);
  if (!result.ok) return queryErrorResponse(result.error);
  return jsonResponseWith(
    ctx!,
    {
      ok: true,
      overview: aggregateMetrics(result.data.overview),
      trend: {
        interval: result.data.trend.interval,
        data: trendRows(result.data.trend.points),
      },
      ...(result.data.cards ? { cards: result.data.cards } : {}),
    },
    200,
    analyticsDiagnosticHeaders(result.meta.source, diagnostics),
  );
}
