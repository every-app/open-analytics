import { goalTimeseriesHasTooManyBuckets } from "@/lib/edge/analytics/application/goal-buckets";
import { createEdgeSiteAnalyticsRuntime } from "@/lib/edge/analytics/composition";
import {
  analyticsDiagnosticHeaders,
  createAnalyticsReadDiagnostics,
} from "@/lib/edge/analytics/composition";
import { createTeamDashboardQueryRuntime } from "@/lib/edge/analytics/composition/ssr-query-runtime";
import {
  buildCalendarBucketPlan,
  createQueryTime,
  createTimeRange,
  normalizeReportingTimeZone,
  parseFilterUrlForAudience,
  siteQueryContext,
  teamQueryContext,
} from "@/lib/edge/analytics/contract";
import type { SimpleDimensionKey } from "@/lib/edge/analytics/interfaces/dashboard/protocol/dimensions";
import type { OverviewTab } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-tabs";
import {
  parseInterval,
  parseWindow,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/parsers";
import {
  badRequest,
  getRequestId,
  jsonResponseWith,
  PRIVATE_CACHE_HEADERS,
  queryErrorResponse,
  type ResponseContext,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/responses";
import { notFound } from "@/lib/edge/analytics/interfaces/dashboard/protocol/responses";
import { operationForQueryRoute } from "@/lib/edge/analytics/interfaces/dashboard/protocol/router";
import type { Env } from "@/lib/edge/types";
export interface PrivateQueryAdapterInput {
  readonly env: Env;
  readonly siteId: string;
  readonly pathname: string;
  readonly url: URL;
  readonly request?: Request;
  readonly dashboardMode?: boolean;
  readonly deferJsonSerialization?: boolean;
}
export interface PrivateTeamDashboardAdapterInput {
  readonly env: Env;
  readonly teamId: string;
  readonly allowedSiteIds?: readonly string[];
  readonly url: URL;
  readonly request?: Request;
  readonly deferJsonSerialization?: boolean;
}
const SIMPLE_DIMENSIONS: Readonly<Record<string, SimpleDimensionKey>> = {
  countries: "country",
  "page-hash": "page.hash",
  "utm-source": "utm.source",
  "utm-medium": "utm.medium",
  "utm-campaign": "utm.campaign",
  "utm-term": "utm.term",
  "utm-content": "utm.content",
};
const OVERVIEW_TABS: Readonly<Record<string, OverviewTab>> = {
  "page-query": "page.query",
  "overview-page-path": "page.path",
  "overview-page-title": "page.title",
  "overview-page-hostname": "page.hostname",
  "overview-page-entry": "page.entry",
  "overview-page-exit": "page.exit",
  "overview-source-domain": "source.domain",
  "overview-source-link": "source.link",
  "overview-source-channel": "source.channel",
  "overview-client-browser": "client.browser",
  "overview-client-os-version": "client.osVersion",
  "overview-client-device-type": "client.deviceType",
  "overview-client-language": "client.language",
  "overview-client-screen-size": "client.screenSize",
  "overview-geo-country": "geo.country",
  "overview-geo-region": "geo.region",
  "overview-geo-city": "geo.city",
  "overview-geo-continent": "geo.continent",
  "overview-geo-timezone": "geo.timezone",
};
function responseContext(
  input: PrivateQueryAdapterInput,
): ResponseContext | undefined {
  return input.request
    ? {
        requestId: getRequestId(input.request),
        deferJsonSerialization: input.deferJsonSerialization,
      }
    : undefined;
}
/** Private dashboard protocol adapter. Authentication and cache ownership stay
 * at the Hono boundary; this module owns only private query protocol options. */
export function executePrivateQuery(
  input: PrivateQueryAdapterInput,
): Promise<Response> {
  const ctx = responseContext(input);
  const queryContext = siteQueryContext(input.siteId, "private-dashboard");
  if (input.pathname === "overview") {
    return import("./protocol/overview").then(({ handleOverviewContract }) =>
      handleOverviewContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "trend") {
    return import("./protocol/overview").then(({ handleTrendContract }) =>
      handleTrendContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "dashboard") {
    return import("./protocol/dashboard").then(({ handleDashboardContract }) =>
      handleDashboardContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "pages") {
    return import("./protocol/pages").then(({ handlePagesContract }) =>
      handlePagesContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "referrers") {
    return import("./protocol/pages").then(({ handleReferrersContract }) =>
      handleReferrersContract(
        input.env,
        input.siteId,
        input.url,
        20,
        true,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "pages-dashboard") {
    return import("./protocol/pages").then(({ handlePagesDashboardContract }) =>
      handlePagesDashboardContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "event-types") {
    return import("./protocol/events").then(({ handleEventTypesContract }) =>
      handleEventTypesContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "events-summary") {
    return import("./protocol/events").then(({ handleEventsSummaryContract }) =>
      handleEventsSummaryContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "events-trend") {
    return import("./protocol/events").then(({ handleEventsTrendContract }) =>
      handleEventsTrendContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "events-records") {
    return import("./protocol/events").then(({ handleEventRecordsContract }) =>
      handleEventRecordsContract(
        input.env,
        input.siteId,
        input.url,
        ctx,
        queryContext,
      ),
    );
  }
  if (input.pathname === "properties") {
    return import("./protocol/properties").then(
      ({ handlePropertyKeysContract }) =>
        handlePropertyKeysContract(
          input.env,
          input.siteId,
          input.url,
          ctx,
          queryContext,
        ),
    );
  }
  if (input.pathname === "property-values") {
    return import("./protocol/properties").then(
      ({ handlePropertyValuesContract }) =>
        handlePropertyValuesContract(
          input.env,
          input.siteId,
          input.url,
          ctx,
          queryContext,
        ),
    );
  }
  if (input.pathname === "event-type-detail") {
    return import("./protocol/events").then(
      ({ handleEventTypeDetailContract }) =>
        handleEventTypeDetailContract(
          input.env,
          input.siteId,
          input.url,
          ctx,
          queryContext,
          input.dashboardMode
            ? {
                includeContext:
                  input.url.searchParams.get("includeContext") !== "false",
                includeBreakdowns:
                  input.url.searchParams.get("includeBreakdowns") !== "false",
              }
            : undefined,
        ),
    );
  }
  if (input.pathname === "filter-values") {
    return import("./protocol/filter-values").then(
      ({ handleFilterValuesContract }) =>
        handleFilterValuesContract(
          input.env,
          input.siteId,
          input.url,
          ctx,
          queryContext,
        ),
    );
  }
  if (input.pathname === "funnels") {
    if ((input.request?.method ?? "GET") === "GET") {
      return import("./protocol/funnels").then(
        ({ handleFunnelAnalysisContract }) =>
          handleFunnelAnalysisContract(
            input.env,
            input.siteId,
            input.url,
            ctx,
            queryContext,
          ),
      );
    }
    return import("./protocol/funnels").then(({ handleFunnel }) =>
      handleFunnel(input.env, input.siteId, input.url, ctx, input.request),
    );
  }
  if (
    input.pathname === "goal-summary" ||
    input.pathname === "goal-timeseries"
  ) {
    return (async () => {
      const operation = operationForQueryRoute(input.pathname);
      const window = parseWindow(input.url);
      if (!window) return badRequest("Invalid time window");
      const interval = parseInterval(input.url);
      const filters = parseFilterUrlForAudience("private-dashboard", input.url);
      const goalId = input.url.searchParams.get("id")?.trim() ?? "";
      const diagnostics = createAnalyticsReadDiagnostics();
      const runtime = createEdgeSiteAnalyticsRuntime({
        env: input.env,
        siteId: input.siteId,
        diagnostics,
      });
      let goal;
      try {
        goal = await runtime.resources.goals.get(input.siteId, goalId);
      } catch {
        return queryErrorResponse({ kind: "internal", operation });
      }
      if (!goal) return notFound();
      if (
        input.pathname === "goal-timeseries" &&
        goalTimeseriesHasTooManyBuckets({
          startMs: window.startMs,
          endExclusiveMs: window.endExclusiveMs,
          timeZone: window.timeZone,
          interval,
        })
      ) {
        return queryErrorResponse({
          kind: "range-not-supported",
          reason: "too-many-buckets",
        });
      }
      const query = {
        context: queryContext,
        time: createQueryTime(
          window.startMs,
          window.endExclusiveMs,
          window.timeZone,
          window.nowMs,
        ),
        filters,
        goalId,
        ...(input.pathname === "goal-timeseries" ? { interval } : {}),
      };
      return runtime.execute(operation, query).then((result) => {
        if (!result.ok) return queryErrorResponse(result.error);
        if (!result.data) return notFound();
        return jsonResponseWith(
          ctx!,
          { ok: true, data: result.data },
          200,
          analyticsDiagnosticHeaders(result.meta.source, diagnostics),
        );
      });
    })();
  }
  if (input.pathname === "goal-conversions") {
    return (async () => {
      const window = parseWindow(input.url);
      if (!window) return badRequest("Invalid time window");
      const diagnostics = createAnalyticsReadDiagnostics();
      const result = await createEdgeSiteAnalyticsRuntime({
        env: input.env,
        siteId: input.siteId,
        diagnostics,
      }).execute("goal-conversions", {
        context: queryContext,
        time: createQueryTime(
          window.startMs,
          window.endExclusiveMs,
          window.timeZone,
          window.nowMs,
        ),
        filters: parseFilterUrlForAudience("private-dashboard", input.url),
      });
      if (!result.ok) return queryErrorResponse(result.error);
      return jsonResponseWith(
        ctx!,
        { ok: true, data: result.data },
        200,
        analyticsDiagnosticHeaders(result.meta.source, diagnostics),
      );
    })();
  }
  if (input.pathname === "goals") {
    return import("./protocol/goals").then(({ handleGoal }) =>
      handleGoal(input.env, input.siteId, input.url, ctx, input.request),
    );
  }
  const dimension = SIMPLE_DIMENSIONS[input.pathname];
  if (dimension) {
    return import("./protocol/dimensions").then(
      ({ handleSimpleDimensionContract }) =>
        handleSimpleDimensionContract(
          input.env,
          input.siteId,
          input.url,
          dimension,
          ctx,
          queryContext,
        ),
    );
  }
  const overviewTab = OVERVIEW_TABS[input.pathname];
  if (overviewTab) {
    return import("./protocol/overview-tabs").then(
      ({ handleOverviewTabContract }) =>
        handleOverviewTabContract(
          input.env,
          input.siteId,
          input.url,
          overviewTab,
          ctx,
          queryContext,
        ),
    );
  }
  return Promise.resolve(notFound());
}
function teamResponseContext(
  input: PrivateTeamDashboardAdapterInput,
): ResponseContext | undefined {
  return input.request
    ? {
        requestId: getRequestId(input.request),
        deferJsonSerialization: input.deferJsonSerialization,
      }
    : undefined;
}
function teamDashboardBucketError(
  window: ReturnType<typeof parseWindow> extends infer Window
    ? Exclude<Window, null>
    : never,
  interval: ReturnType<typeof parseInterval>,
): Response | null {
  // Keep the HTTP boundary aligned with the D1 provider's 2,000-bucket
  // calendar plan limit. The provider intentionally truncates plans for
  // callers that need partial data, but a dashboard trend must reject before
  // that truncated plan is interpolated into a large SQL CASE expression.
  if (
    !Number.isSafeInteger(window.startMs) ||
    !Number.isSafeInteger(window.endExclusiveMs)
  ) {
    return badRequest("Invalid time window");
  }
  const plan = buildCalendarBucketPlan({
    range: createTimeRange(window.startMs, window.endExclusiveMs),
    granularity: interval,
    reportingTimeZone: normalizeReportingTimeZone(window.timeZone),
  });
  return plan.truncated
    ? queryErrorResponse({
        kind: "range-not-supported",
        reason: "too-many-buckets",
      })
    : null;
}
/** Private team-dashboard adapter after authentication has resolved its team
 * scope. Caching remains at the Hono boundary. */
export async function executePrivateTeamDashboard(
  input: PrivateTeamDashboardAdapterInput,
): Promise<Response> {
  const window = parseWindow(input.url);
  if (!window) return badRequest("Invalid time window");
  const interval = parseInterval(input.url);
  const bucketError = teamDashboardBucketError(window, interval);
  if (bucketError) return bucketError;
  const diagnostics = createAnalyticsReadDiagnostics();
  const result = await createTeamDashboardQueryRuntime({
    env: input.env,
    teamId: input.teamId,
    window,
    interval,
    allowedSiteIds: input.allowedSiteIds,
    diagnostics,
  }).execute("team-dashboard", {
    context: teamQueryContext(
      input.teamId,
      "private-dashboard",
      input.allowedSiteIds,
    ),
    time: createQueryTime(
      window.startMs,
      window.endExclusiveMs,
      window.timeZone,
      window.nowMs,
    ),
  });
  if (!result.ok) {
    return queryErrorResponse(result.error);
  }
  return jsonResponseWith(
    teamResponseContext(input)!,
    { ok: true, data: result.data },
    200,
    {
      ...PRIVATE_CACHE_HEADERS,
      ...analyticsDiagnosticHeaders(result.meta.source, diagnostics),
    },
  );
}
