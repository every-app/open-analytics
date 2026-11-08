import type { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  createRollupTestEnv,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import {
  analyticsFilterRegistry,
  EMPTY_FILTER_DOCUMENT,
  type FilterDocument,
  type FunnelConfigV2,
} from "@/lib/edge/analytics/contract";
import {
  assertFunnelSqlShapeWithinBudget,
  assertFunnelStructuralBudget,
  buildFunnelSqlPlan,
  FUNNEL_SQL_STRUCTURAL_BUDGET,
} from "@/lib/edge/analytics/providers/d1/internal/funnel-planner";
import { parseFilterDsl } from "@/lib/filter-contract";

interface Visit {
  readonly id: string;
  readonly sitePk?: number;
  readonly session: string;
  readonly visitor: string;
  readonly at: number;
  readonly path: string;
  readonly country?: string;
}
interface CustomEvent {
  readonly id: string;
  readonly visit: string;
  readonly sitePk?: number;
  readonly name: string;
  readonly at: number;
  readonly sequence?: number;
}

function database(
  visits: readonly Visit[],
  events: readonly CustomEvent[] = [],
): DatabaseSync {
  const { database } = createRollupTestEnv();
  seedSites(database, [
    { siteId: "site-1", sitePk: 1 },
    { siteId: "site-2", sitePk: 2 },
  ]);
  for (const visit of visits) {
    database
      .prepare(
        `INSERT INTO visits (visit_id, site_pk, visitor_id, session_id, status,
          started_at, last_activity_at, pathname, hostname, country)
         VALUES (?, ?, ?, ?, 'complete', ?, ?, ?, 'example.com', ?)`,
      )
      .run(
        visit.id,
        visit.sitePk ?? 1,
        visit.visitor,
        visit.session,
        visit.at,
        visit.at,
        visit.path,
        visit.country ?? "US",
      );
  }
  const names = new Map<string, number>();
  for (const event of events) {
    const key = `${event.sitePk ?? 1}:${event.name}`;
    if (!names.has(key)) {
      names.set(key, names.size + 1);
      database
        .prepare(
          "INSERT INTO custom_event_names (id, site_pk, name, last_seen_at) VALUES (?, ?, ?, 0)",
        )
        .run(names.get(key)!, event.sitePk ?? 1, event.name);
    }
    database
      .prepare(
        `INSERT INTO custom_events (event_id, site_pk, visit_id, event_name_id,
          occurred_at, received_at, sequence)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.sitePk ?? 1,
        event.visit,
        names.get(key)!,
        event.at,
        event.at,
        event.sequence ?? 0,
      );
  }
  return database;
}

function step(id: string, filterDsl: string) {
  return { id, filterDsl } as const;
}

function config(
  steps: FunnelConfigV2["steps"],
  progressionScope: FunnelConfigV2["progressionScope"] = "session",
  conversionWindowMs: number | null = null,
): FunnelConfigV2 {
  return { filterDslVersion: 1, progressionScope, conversionWindowMs, steps };
}

function source(filters: FilterDocument = EMPTY_FILTER_DOCUMENT) {
  return { siteId: "site-1", startMs: 0, endExclusiveMs: 1_000, filters };
}

function runPlan(
  db: DatabaseSync,
  plan: ReturnType<typeof buildFunnelSqlPlan>,
) {
  return db.prepare(plan.sql).all(...plan.bindings) as Array<{
    stepId: string;
    stepIndex: number;
    sessions: number;
    visitors: number;
  }>;
}

const LANDING_THEN_SIGNUP = [
  step("landing", 'page.path eq "/landing"'),
  step("signup", 'event.name eq "signup"'),
];

describe("FunnelSqlPlan", () => {
  it("runs session progression in one non-recursive query over one site", () => {
    const db = database(
      [
        {
          id: "visit-1",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
        {
          id: "visit-2",
          session: "s1",
          visitor: "v1",
          at: 200,
          path: "/landing",
        },
        // Another site's page view and event, with the same session id.
        {
          id: "visit-3",
          sitePk: 2,
          session: "s1",
          visitor: "v2",
          at: 100,
          path: "/landing",
        },
      ],
      [
        { id: "event-1", visit: "visit-1", name: "signup", at: 160 },
        { id: "event-2", visit: "visit-3", sitePk: 2, name: "signup", at: 160 },
      ],
    );
    const plan = buildFunnelSqlPlan(config(LANDING_THEN_SIGNUP), source());

    expect(runPlan(db, plan)).toEqual([
      { stepIndex: 0, stepId: "landing", sessions: 1, visitors: 1 },
      { stepIndex: 1, stepId: "signup", sessions: 1, visitors: 1 },
    ]);
    expect(plan.sql).not.toMatch(/WITH\s+RECURSIVE/iu);
    expect(plan.sql).toMatch(/reached_1\s+AS/iu);
    expect(plan.sql).not.toContain("scope_raw");
    expect(plan.sql.match(/\bFROM visits v\b/gu)).toHaveLength(1);
    expect(plan.bindings.slice(-2)).toEqual(["landing", "signup"]);
  });

  it("counts a custom event only for an event step, and a page view only for a page step", () => {
    const db = database(
      [
        {
          id: "visit-1",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
      ],
      // On the landing page, but a page step's match is a page view.
      [{ id: "event-1", visit: "visit-1", name: "other", at: 100 }],
    );
    const rows = runPlan(
      db,
      buildFunnelSqlPlan(
        config([
          step("first", 'page.path eq "/landing"'),
          step("second", 'page.path eq "/landing"'),
        ]),
        source(),
      ),
    );

    expect(rows[0]).toMatchObject({ sessions: 1, visitors: 1 });
    expect(rows[1]).toMatchObject({ sessions: 0, visitors: 0 });
  });

  it("excludes blank identities", () => {
    const db = database(
      [
        {
          id: "visit-1",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
        {
          id: "visit-2",
          session: "",
          visitor: "v2",
          at: 110,
          path: "/landing",
        },
        {
          id: "visit-3",
          session: "s3",
          visitor: "",
          at: 120,
          path: "/landing",
        },
        { id: "visit-4", session: "", visitor: "", at: 130, path: "/landing" },
      ],
      [{ id: "event-1", visit: "visit-4", name: "signup", at: 170 }],
    );

    expect(
      runPlan(db, buildFunnelSqlPlan(config(LANDING_THEN_SIGNUP), source())),
    ).toEqual([
      { stepIndex: 0, stepId: "landing", sessions: 2, visitors: 2 },
      { stepIndex: 1, stepId: "signup", sessions: 0, visitors: 0 },
    ]);
    expect(
      runPlan(
        db,
        buildFunnelSqlPlan(
          config(LANDING_THEN_SIGNUP, "visitor", 1_000),
          source(),
        ),
      ),
    ).toEqual([
      { stepIndex: 0, stepId: "landing", sessions: 2, visitors: 2 },
      { stepIndex: 1, stepId: "signup", sessions: 0, visitors: 0 },
    ]);
  });

  it("orders a step after the previous one, and an event after its page view", () => {
    const db = database(
      [
        {
          id: "visit-1",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
      ],
      [
        // Before the landing page: not a progression.
        { id: "event-early", visit: "visit-1", name: "signup", at: 90 },
      ],
    );
    expect(
      runPlan(db, buildFunnelSqlPlan(config(LANDING_THEN_SIGNUP), source()))[1],
    ).toMatchObject({ sessions: 0, visitors: 0 });

    db.prepare(
      `INSERT INTO custom_events (event_id, site_pk, visit_id, event_name_id,
        occurred_at, received_at, sequence)
       VALUES ('event-same-time', 1, 'visit-1', 1, 100, 100, 0)`,
    ).run();
    expect(
      runPlan(db, buildFunnelSqlPlan(config(LANDING_THEN_SIGNUP), source()))[1],
    ).toMatchObject({ sessions: 1, visitors: 1 });
  });

  it("carries visitor first observation through the total conversion window", () => {
    const db = database(
      [
        {
          id: "visit-1",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
        {
          id: "visit-2",
          session: "s2",
          visitor: "v1",
          at: 500,
          path: "/other",
        },
        {
          id: "visit-3",
          session: "s3",
          visitor: "v2",
          at: 100,
          path: "/landing",
        },
        {
          id: "visit-4",
          session: "s4",
          visitor: "v2",
          at: 140,
          path: "/other",
        },
      ],
      [
        // Within 60 ms of v2's first landing page view, in another session.
        { id: "event-1", visit: "visit-4", name: "signup", at: 150 },
        // Too late for v1.
        { id: "event-2", visit: "visit-2", name: "signup", at: 500 },
      ],
    );
    const plan = buildFunnelSqlPlan(
      config(LANDING_THEN_SIGNUP, "visitor", 60),
      source(),
    );

    expect(runPlan(db, plan)).toEqual([
      { stepIndex: 0, stepId: "landing", sessions: 2, visitors: 2 },
      { stepIndex: 1, stepId: "signup", sessions: 1, visitors: 1 },
    ]);
    expect(plan.sql).toContain("previous.first_observed_at");
    expect(plan.sql).toContain("PARTITION BY previous.visitor_id");
  });

  it("applies the dashboard's filter before the steps", () => {
    const db = database(
      [
        {
          id: "visit-us",
          session: "s1",
          visitor: "v1",
          at: 100,
          path: "/landing",
        },
        {
          id: "visit-de",
          session: "s2",
          visitor: "v2",
          at: 100,
          path: "/landing",
          country: "DE",
        },
      ],
      [
        { id: "event-us", visit: "visit-us", name: "signup", at: 150 },
        { id: "event-de", visit: "visit-de", name: "signup", at: 150 },
      ],
    );
    const filters = parseFilterDsl(
      'geo.country eq "DE"',
      analyticsFilterRegistry,
    );

    expect(
      runPlan(
        db,
        buildFunnelSqlPlan(config(LANDING_THEN_SIGNUP), source(filters)),
      ),
    ).toEqual([
      { stepIndex: 0, stepId: "landing", sessions: 1, visitors: 1 },
      { stepIndex: 1, stepId: "signup", sessions: 1, visitors: 1 },
    ]);
  });

  it("enforces every reachable structural budget and config guard", () => {
    expect(() => assertFunnelStructuralBudget(0)).toThrow(
      "funnel_steps_required",
    );
    expect(() => assertFunnelStructuralBudget(11)).toThrow(
      "funnel_sql_step_limit_exceeded",
    );

    const shape = {
      stepCount: 1,
      stagedCteCount: 1,
      funnelCteCount: 1,
      sqlLength: 1,
      bindingCount: 1,
    };
    expect(() =>
      assertFunnelSqlShapeWithinBudget(shape, { maxStagedCtes: 0 }),
    ).toThrow("funnel_sql_staged_cte_limit_exceeded");
    expect(() =>
      assertFunnelSqlShapeWithinBudget(shape, { maxFunnelCtes: 0 }),
    ).toThrow("funnel_sql_cte_limit_exceeded");
    expect(() =>
      assertFunnelSqlShapeWithinBudget(shape, { maxBindings: 0 }),
    ).toThrow("funnel_sql_binding_limit_exceeded");

    const steps = [
      step("first", 'page.path eq "/first"'),
      step("second", 'page.path eq "/second"'),
    ];
    for (const allowHistoricalOverLimit of [false, true]) {
      expect(() =>
        buildFunnelSqlPlan(config(steps, "visitor", null), source(), {
          allowHistoricalOverLimit,
        }),
      ).toThrow("visitor_funnel_conversion_window_must_be_positive");
      expect(() =>
        buildFunnelSqlPlan(config(steps, "session", 1), source(), {
          allowHistoricalOverLimit,
        }),
      ).toThrow("session_funnel_conversion_window_must_be_null");
    }
    expect(() =>
      buildFunnelSqlPlan(config([]), source(), {
        allowHistoricalOverLimit: true,
      }),
    ).toThrow("funnel_steps_required");
  });

  it("reports the ten-step shape and catches explicit overages", () => {
    const db = database([]);
    const tenStepPlan = buildFunnelSqlPlan(
      config(
        Array.from({ length: 10 }, (_, index) =>
          step(`step-${index}`, `page.path eq "/step-${index}"`),
        ),
      ),
      source(),
    );

    expect(tenStepPlan.shape.stagedCteCount).toBe(10);
    expect(tenStepPlan.sql.match(/\breached_\d+\s+AS/giu)).toHaveLength(10);
    expect(runPlan(db, tenStepPlan).map((row) => row.stepId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `step-${index}`),
    );
    expect(tenStepPlan.shape.sqlLength).toBe(tenStepPlan.sql.length);
    expect(FUNNEL_SQL_STRUCTURAL_BUDGET.maxSteps).toBe(10);

    expect(() =>
      assertFunnelSqlShapeWithinBudget(tenStepPlan.shape, {
        maxSqlLength: tenStepPlan.shape.sqlLength - 1,
      }),
    ).toThrow("funnel_sql_length_exceeded");
    const elevenSteps = config(
      Array.from({ length: 11 }, (_, index) =>
        step(`step-${index}`, `page.path eq "/step-${index}"`),
      ),
    );
    expect(() => buildFunnelSqlPlan(elevenSteps, source())).toThrow(
      "funnel_sql_step_limit_exceeded",
    );
    expect(
      buildFunnelSqlPlan(elevenSteps, source(), {
        allowHistoricalOverLimit: true,
      }).shape.stepCount,
    ).toBe(11);
    expect(() =>
      buildFunnelSqlPlan(
        config(
          Array.from({ length: 13 }, (_, index) =>
            step(`step-${index}`, `page.path eq "/step-${index}"`),
          ),
        ),
        source(),
        { allowHistoricalOverLimit: true },
      ),
    ).toThrow("funnel_historical_step_limit_exceeded");
  });
});
