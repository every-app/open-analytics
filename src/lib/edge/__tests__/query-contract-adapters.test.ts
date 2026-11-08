import { describe, expect, it } from "vitest";

import {
  type QueryOperation,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import { handleSimpleDimensionContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/dimensions";
import {
  handleEventFieldValuesContract,
  handleEventRecordsContract,
  handleEventsSummaryContract,
  handleEventsTrendContract,
  handleEventTypeDetailContract,
  handleEventTypeFieldsContract,
  handleEventTypesContract,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/events";
import { handleFilterValuesContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/filter-values";
import { handleFunnelAnalysisContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/funnels";
import { handleOverviewGeoPointsContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-extras";
import {
  handlePagesContract,
  handlePagesDashboardContract,
  handleReferrersContract,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/pages";
import type { Env } from "@/lib/edge/types";
function emptyEnv(): Env {
  const statement = {
    bind() {
      return statement;
    },
    all: async () => ({ results: [] }),
    first: async () => null,
  };
  return {
    DB: { prepare: () => statement },
    MAIN_SECRET: "contract-test-secret",
  } as unknown as Env;
}
const env = emptyEnv();
const siteId = "site-contract";
const invalidWindow = new URL("https://edge.test/query?from=20&to=10");
const context = undefined;
describe("typed query adapter validation branches", () => {
  it("validates and forwards comparison options for UTM dimensions", async () => {
    const base = "https://edge.test/query?from=1767225600000&to=1767312000000";
    const responses = await Promise.all([
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(`${base}&sort=invalid`),
        "utm.source",
      ),
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(`${base}&direction=invalid`),
        "utm.source",
      ),
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(`${base}&compare=invalid`),
        "utm.source",
      ),
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(`${base}&compare=same`),
        "utm.medium",
      ),
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(
          `${base}&compare=previous&metric=sessions&sortBy=change&direction=asc&search=email`,
        ),
        "utm.source",
      ),
      handleSimpleDimensionContract(
        env,
        siteId,
        new URL(
          `${base}&compare=previous&metric=visitors&sortBy=reference&compareFilter%5Bpage.path%5D=%2Fpricing`,
        ),
        "utm.campaign",
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 200, 200, 200,
    ]);
  });

  it("enters event and funnel contract adapters before D1", async () => {
    const responses = await Promise.all([
      handleEventTypesContract(env, siteId, invalidWindow, context),
      handleEventsSummaryContract(env, siteId, invalidWindow, context),
      handleEventsTrendContract(env, siteId, invalidWindow, context),
      handleEventRecordsContract(env, siteId, invalidWindow, context),
      handleEventFieldValuesContract(env, siteId, invalidWindow, context),
      handleEventTypeFieldsContract(env, siteId, invalidWindow, context),
      handleEventTypeDetailContract(env, siteId, invalidWindow, context),
      handleFunnelAnalysisContract(env, siteId, invalidWindow, context),
    ]);

    expect(responses).toHaveLength(8);
    expect(responses.every((response) => response instanceof Response)).toBe(
      true,
    );
    expect(responses.some((response) => response.status === 400)).toBe(true);
  });

  it("executes valid event and funnel reader branches", async () => {
    const valid = new URL(
      "https://edge.test/query?from=1767225600000&to=1767312000000&eventName=signup&fieldPath=plan&fieldValueType=string&limit=5",
    );
    const responses = await Promise.all([
      handleEventTypesContract(env, siteId, valid),
      handleEventsSummaryContract(env, siteId, valid),
      handleEventsTrendContract(env, siteId, valid),
      handleEventRecordsContract(env, siteId, valid),
      handleEventFieldValuesContract(env, siteId, valid),
      handleEventTypeFieldsContract(env, siteId, valid),
      handleEventTypeDetailContract(env, siteId, valid, undefined, undefined, {
        includeContext: false,
        includeBreakdowns: false,
      }),
      handleFunnelAnalysisContract(env, siteId, valid),
    ]);

    expect(responses).toHaveLength(8);
    expect(responses.every((response) => response instanceof Response)).toBe(
      true,
    );
    expect(responses.some((response) => response.status === 200)).toBe(true);
  });

  it("covers event detail and funnel lookup branches", async () => {
    const base =
      "https://edge.test/query?from=1767225600000&to=1767312000000&eventName=signup";
    const responses = await Promise.all([
      handleEventTypeDetailContract(env, siteId, new URL(base)),
      handleFunnelAnalysisContract(env, siteId, new URL(`${base}&id=missing`)),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 404]);
  });

  it("covers filter and page contract option branches", async () => {
    const base = "https://edge.test/query?from=1767225600000&to=1767312000000";
    const filterKeys = [
      "geo.country",
      "page.path",
      "referrer.url",
      "client.browser",
      "geo.region",
      "geo.continent",
    ];
    const responses = await Promise.all([
      ...filterKeys.map((filterKey) =>
        handleFilterValuesContract(
          env,
          siteId,
          new URL(`${base}&filterKey=${filterKey}`),
        ),
      ),
      handleOverviewGeoPointsContract(env, siteId, new URL(base)),
      handleOverviewGeoPointsContract(
        env,
        siteId,
        new URL(`${base}&applyGeoFilter=true`),
      ),
      handlePagesContract(
        env,
        siteId,
        new URL(base),
        undefined,
        siteQueryContext(siteId, "private-dashboard"),
      ),
      handlePagesContract(
        env,
        siteId,
        new URL(base),
        undefined,
        siteQueryContext(siteId, "public-share"),
      ),
      handleReferrersContract(
        env,
        siteId,
        new URL(`${base}&fullUrl=true`),
        20,
        true,
      ),
      handleReferrersContract(
        env,
        siteId,
        new URL(`${base}&fullUrl=true`),
        8,
        false,
      ),
      handlePagesDashboardContract(env, siteId, new URL(`${base}&limit=24`)),
    ]);

    expect(responses).toHaveLength(13);
    expect(responses.every((response) => response.status < 500)).toBe(true);
  });

  it("covers paginated pages/referrers and cursor validation", async () => {
    const base = "https://edge.test/query?from=1767225600000&to=1767312000000";
    const [pages, publicReferrers, deepDashboard, invalidDashboard] =
      await Promise.all([
        handlePagesContract(
          env,
          siteId,
          new URL(`${base}&cursor=opaque`),
          undefined,
          siteQueryContext(siteId, "private-dashboard"),
        ),
        handleReferrersContract(
          env,
          siteId,
          new URL(
            `${base}&fullUrl=true&search=google&sort=visitors&direction=asc`,
          ),
          8,
          false,
        ),
        handlePagesDashboardContract(env, siteId, new URL(`${base}&limit=25`)),
        handlePagesDashboardContract(
          env,
          siteId,
          new URL(`${base}&limit=25&cursor=invalid`),
        ),
      ]);

    expect(pages.status).toBe(400);
    expect(publicReferrers.status).toBe(200);
    expect(deepDashboard.status).toBe(200);
    expect(invalidDashboard.status).toBe(400);
  });

  it("does not expose private canonical fields from public filter-values", async () => {
    const response = await handleFilterValuesContract(
      env,
      siteId,
      new URL(
        "https://edge.test/query?from=1767225600000&to=1767312000000&filterKey=page.query",
      ),
      undefined,
      siteQueryContext(siteId, "public-share"),
    );
    expect(response.status).toBe(400);
  });

  it("validates canonical filter-value requests before returning candidates", async () => {
    const base = "https://edge.test/query?from=1767225600000&to=1767312000000";
    const deniedContext = {
      ...siteQueryContext(siteId, "private-dashboard"),
      policy: {
        ...siteQueryContext(siteId, "private-dashboard").policy,
        allowedOperations: new Set<QueryOperation>(),
      },
    };
    const [missingField, unknownField, invalidWindow, valid, denied] =
      await Promise.all([
        handleFilterValuesContract(env, siteId, new URL(base)),
        handleFilterValuesContract(
          env,
          siteId,
          new URL(`${base}&filterKey=missing.field`),
        ),
        handleFilterValuesContract(
          env,
          siteId,
          new URL("https://edge.test/query?filterKey=page.path&from=20&to=10"),
        ),
        handleFilterValuesContract(
          env,
          siteId,
          new URL(`${base}&filterKey=page.path&search=docs`),
        ),
        handleFilterValuesContract(
          env,
          siteId,
          new URL(`${base}&filterKey=page.path`),
          undefined,
          deniedContext,
        ),
      ]);

    expect(missingField.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(invalidWindow.status).toBe(400);
    expect(valid.status).toBe(200);
    expect(denied.status).toBe(400);
  });
});
