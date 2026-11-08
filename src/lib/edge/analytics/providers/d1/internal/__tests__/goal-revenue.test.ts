import { describe, expect, it } from "vitest";

import {
  createRollupTestEnv,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import { createEdgeSiteAnalyticsRuntime } from "@/lib/edge/analytics/composition";
import {
  analyticsFilterRegistry,
  createQueryTime,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
  siteQueryContext,
} from "@/lib/edge/analytics/contract";
import { createGoalDefinition } from "@/lib/edge/analytics/providers/d1/internal/goals";
import { parseFilterDsl } from "@/lib/filter-contract";

const SITE_ID = "site-1";
const START = 1_000_000;
const END = START + 3_600_000;

/** A US or German visit, each its own session and visitor. */
const VISITS = [
  ["visit-us-1", "US"],
  ["visit-us-2", "US"],
  ["visit-us-3", "US"],
  ["visit-de", "DE"],
] as const;

/** Event name, visit, minutes into the window, amount and currency. */
const EVENTS = [
  ["Purchase", "visit-us-1", 1, 15.99, "USD"],
  // Another currency: not converted, not counted.
  ["Purchase", "visit-us-1", 2, 10, "EUR"],
  ["Purchase", "visit-us-2", 3, 4.01, "USD"],
  // A conversion without revenue.
  ["Purchase", "visit-us-3", 4, null, null],
  // Outside the global filter's country.
  ["Purchase", "visit-de", 5, 100, "USD"],
  // Not matched by the goal.
  ["Signup", "visit-us-2", 6, 50, "USD"],
  // Outside the window.
  ["Purchase", "visit-us-2", 120, 70, "USD"],
] as const;

function seed() {
  const { database, env } = createRollupTestEnv();
  seedSites(database, [{ siteId: SITE_ID, sitePk: 1 }]);
  for (const [visitId, country] of VISITS) {
    database
      .prepare(
        `INSERT INTO visits (
          visit_id, site_pk, visitor_id, session_id, status,
          started_at, last_activity_at, pathname, hostname, country
        ) VALUES (?, 1, ?, ?, 'finalized', ?, ?, '/checkout', 'example.com', ?)`,
      )
      .run(
        visitId,
        `visitor-${visitId}`,
        `session-${visitId}`,
        START,
        START,
        country,
      );
  }
  const nameIds = new Map<string, number>();
  for (const [name] of EVENTS) {
    if (nameIds.has(name)) continue;
    nameIds.set(name, nameIds.size + 1);
    database
      .prepare(
        "INSERT INTO custom_event_names (id, site_pk, name, last_seen_at) VALUES (?, 1, ?, 0)",
      )
      .run(nameIds.get(name)!, name);
  }
  EVENTS.forEach(([name, visitId, minute, amount, currency], index) => {
    database
      .prepare(
        `INSERT INTO custom_events (
          event_id, site_pk, visit_id, event_name_id, occurred_at,
          received_at, revenue_amount, revenue_currency
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        `event-${index}`,
        visitId,
        nameIds.get(name)!,
        START + minute * 60_000,
        START + minute * 60_000,
        amount,
        currency,
      );
  });
  return env;
}

async function goalSummary(
  env: ReturnType<typeof seed>,
  goalId: string,
  filters: FilterDocument,
) {
  const result = await createEdgeSiteAnalyticsRuntime({
    env,
    siteId: SITE_ID,
  }).execute("goal-summary", {
    context: siteQueryContext(SITE_ID, "private-dashboard"),
    time: createQueryTime(START, END, "UTC", END),
    filters,
    goalId,
  });
  if (!result.ok || !result.data) throw new Error("goal_summary_failed");
  return result.data.summary;
}

describe("Goal revenue on D1", () => {
  it("sums only the goal's matched events in its currency, within the global filter", async () => {
    const env = seed();
    const goal = await createGoalDefinition(env, SITE_ID, "Purchase", {
      filterDslVersion: 1,
      filterDsl: 'event.name eq "Purchase"',
      currency: "usd",
    });
    expect(goal.currency).toBe("USD");

    const unfiltered = await goalSummary(env, goal.id, EMPTY_FILTER_DOCUMENT);
    expect(unfiltered.visitors.converted).toBe(4);
    // 15.99 + 4.01 + 100 over the three Purchase events with USD revenue.
    expect(unfiltered.revenue).toEqual({
      currency: "USD",
      total: expect.closeTo(120),
      average: expect.closeTo(40),
    });

    const unitedStates = await goalSummary(
      env,
      goal.id,
      parseFilterDsl('geo.country eq "US"', analyticsFilterRegistry),
    );
    expect(unitedStates.visitors.converted).toBe(3);
    // 15.99 + 4.01: the German visit's 100 USD is outside the filter.
    expect(unitedStates.revenue).toEqual({
      currency: "USD",
      total: expect.closeTo(20),
      average: expect.closeTo(10),
    });
  }, 60_000);

  it("has no revenue for a goal without a currency, and zero when nothing matched carried any", async () => {
    const env = seed();
    const plain = await createGoalDefinition(env, SITE_ID, "Purchase", {
      filterDslVersion: 1,
      filterDsl: 'event.name eq "Purchase"',
    });
    expect(plain).not.toHaveProperty("currency");
    expect(
      (await goalSummary(env, plain.id, EMPTY_FILTER_DOCUMENT)).revenue,
    ).toBeNull();

    const pounds = await createGoalDefinition(env, SITE_ID, "Purchase", {
      filterDslVersion: 1,
      filterDsl: 'event.name eq "Purchase"',
      currency: "GBP",
    });
    expect(
      (await goalSummary(env, pounds.id, EMPTY_FILTER_DOCUMENT)).revenue,
    ).toEqual({ currency: "GBP", total: 0, average: 0 });
  }, 60_000);
});
