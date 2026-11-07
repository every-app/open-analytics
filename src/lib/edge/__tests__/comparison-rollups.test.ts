import { describe, expect, it } from "vitest";

import { handleSimpleDimensionContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/dimensions";
import { handleOverviewContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import {
  handleOverviewTabContract,
  type OverviewTab,
} from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview-tabs";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import type { Env } from "@/lib/edge/types";

import {
  createRollupTestEnv,
  insertVisits,
  seedSites,
  syntheticVisits,
} from "./rollup-fixtures";

const SITE = { siteId: "site-a", sitePk: 1 };
const NOW = Date.UTC(2026, 10, 6, 13);
// The last 30 days, and the same dates a year earlier.
const CURRENT = { from: Date.UTC(2026, 9, 7), to: Date.UTC(2026, 10, 6) };
const YEAR_AGO = { from: Date.UTC(2025, 9, 7), to: Date.UTC(2025, 10, 6) };
const CARD_TABS: OverviewTab[] = [
  "page.path",
  "page.entry",
  "page.exit",
  "source.domain",
  "source.channel",
  "client.browser",
  "client.osVersion",
  "client.deviceType",
  "geo.country",
  "geo.region",
  "geo.city",
];

function url(params: Record<string, string | number>): URL {
  const target = new URL("https://app.test/api/private/report");
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, String(value));
  }
  return target;
}

async function body(response: Response): Promise<unknown> {
  expect(response.status).toBe(200);
  return response.json();
}

/** Every comparison the Overview shows with Compare set to a year earlier. */
async function readYearOverYear(env: Env) {
  const compared = { ...CURRENT, timeZone: "UTC", compare: "year", limit: 200 };
  const result: Record<string, unknown> = {
    // The top stats and the graph's comparison line read the earlier period.
    overview: await body(
      await handleOverviewContract(
        env,
        SITE.siteId,
        url({
          ...YEAR_AGO,
          timeZone: "UTC",
          includeDetail: 1,
          interval: "day",
        }),
      ),
    ),
    "utm.source": await body(
      await handleSimpleDimensionContract(
        env,
        SITE.siteId,
        url(compared),
        "utm.source",
      ),
    ),
  };
  for (const tab of CARD_TABS) {
    result[tab] = await body(
      await handleOverviewTabContract(env, SITE.siteId, url(compared), tab),
    );
  }
  return result;
}

describe("year-over-year comparisons", () => {
  it("read the rollups of a year earlier once retention has deleted its page views", async () => {
    const { database, env } = createRollupTestEnv();
    seedSites(database, [SITE]);
    for (const [index, period] of [YEAR_AGO, CURRENT].entries()) {
      insertVisits(
        database,
        syntheticVisits({
          ...SITE,
          fromMs: period.from,
          toMs: period.to,
          peoplePerDay: 12,
          seed: index + 1,
        }).map((visit) => ({
          ...visit,
          visitId: `${index}-${visit.visitId}`,
          sessionId: visit.sessionId && `${index}-${visit.sessionId}`,
        })),
      );
    }
    while ((await runVisitRollups(env, NOW)).workRemains);

    const withPageViews = await readYearOverYear(env);
    database
      .prepare("DELETE FROM visits WHERE started_at < ?")
      .run(YEAR_AGO.to);
    const afterRetention = await readYearOverYear(env);
    database.close();

    for (const tab of [...CARD_TABS, "utm.source"]) {
      const items = (
        withPageViews[tab] as {
          data: { items: { reference: { views: number } }[] };
        }
      ).data.items;
      expect(items.some((item) => item.reference.views > 0)).toBe(true);
    }
    expect(afterRetention).toEqual(withPageViews);
  }, 60_000);
});
