import type { DatabaseSync } from "node:sqlite";

import { listMembers, sendEmail } from "@every-app/sdk/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRollupTestEnv,
  DAY_MS,
  seedSites,
} from "@/lib/edge/__tests__/rollup-fixtures";
import {
  D1_QUERIES_PER_INVOCATION,
  D1QueryBudget,
  withD1QueryBudget,
} from "@/lib/edge/scheduled-tasks/d1-query-budget";
import { dispatchInternalScheduledTasks } from "@/lib/edge/scheduled-tasks/dispatcher";
import type { Env } from "@/lib/edge/types";
import {
  NOTIFICATION_RULE_D1_QUERIES,
  runNotificationTick,
} from "@/lib/notifications/edge/notification-task";
import type { NotificationRuleType } from "@/lib/notifications/rules";

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMembers: vi.fn(),
  sendEmail: vi.fn(),
}));

/** Monday 2026-11-09, midnight UTC. */
const START = Date.UTC(2026, 10, 9);
const MINUTE_MS = 60_000;
/** The tick's own reads: reports left unscheduled, then the due rules. */
const TICK_READS = 2;

/**
 * A weekly report in New York: its week starts and ends inside UTC days, so
 * on a site with rollups its overview reads the rolled-up days and both raw
 * edges, its longest path.
 */
const REPORT = {
  type: "report",
  schedule: {
    kind: "weekly",
    dayOfWeek: 1,
    time: "00:00",
    timezone: "America/New_York",
  },
} as const;
const SPIKE = {
  type: "change",
  condition: { direction: "spike", window: "last_24h", percent: 50 },
} as const;

interface Setup {
  database: DatabaseSync;
  env: Env;
  d1Queries: () => number;
}

let setup: Setup | undefined;

function observability() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as never;
}

function logger() {
  const log = () => Promise.resolve();
  return { debug: log, info: log, warn: log, error: log };
}

function siteId(index: number): string {
  return `site-${index}`;
}

/**
 * Sites 1..`rolledUp` have two months of rollups and a weekly report each;
 * the next `alerts` sites have no rollups and a spike alert each, due first.
 */
function seed(input: { rolledUp: number; alerts?: number }): Setup {
  const created = createRollupTestEnv();
  const { database } = created;
  const alerts = input.alerts ?? 0;
  const sites = Array.from({ length: input.rolledUp + alerts }, (_, index) => ({
    siteId: siteId(index + 1),
    sitePk: index + 1,
  }));
  seedSites(database, sites);
  database
    .prepare("INSERT INTO users (id, email) VALUES ('ana', 'ana@example.test')")
    .run();
  const today = Math.floor(START / DAY_MS);
  const rollups = database.prepare(
    "INSERT INTO visit_rollup_state (site_pk, first_day, last_day) VALUES (?, ?, ?)",
  );
  const rule = database.prepare(
    `INSERT INTO notification_rules (id, team_id, site_id, name, type,
       schedule_json, condition_json, next_run_at, created_by_user_id)
     VALUES (?, 'team-1', ?, ?, ?, ?, ?, ?, 'ana')`,
  );
  for (const site of sites) {
    const config = site.sitePk <= input.rolledUp ? REPORT : SPIKE;
    if (config === REPORT) rollups.run(site.sitePk, today - 60, today - 1);
    rule.run(
      `rule-${site.sitePk}`,
      site.siteId,
      site.siteId,
      config.type,
      JSON.stringify(config.type === "report" ? config.schedule : {}),
      JSON.stringify(config.type === "change" ? config.condition : {}),
      // Alerts are due first, then the reports in site order.
      START / 1000 - (config === SPIKE ? 10_000 : 1000) + site.sitePk,
    );
  }
  setup = created;
  return created;
}

/** A visit in the last day, so the site's spike alert fires. */
function visitToday(database: DatabaseSync, sitePk: number): void {
  database
    .prepare(
      `INSERT INTO visits (visit_id, site_pk, visitor_id, session_id,
         status, started_at, last_activity_at, duration_ms, pathname, hostname)
       VALUES (?, ?, 'v', 's', 'complete', ?, ?, 1000, '/', 'example.com')`,
    )
    .run(`visit-${sitePk}`, sitePk, START - 3_600_000, START);
}

/** Messages per rule. */
function messages(database: DatabaseSync): Record<string, number> {
  const rows = database
    .prepare(
      "SELECT rule_id AS ruleId, COUNT(*) AS n FROM notification_messages GROUP BY rule_id",
    )
    .all() as Array<{ ruleId: string; n: number }>;
  return Object.fromEntries(rows.map((row) => [row.ruleId, Number(row.n)]));
}

/** Rules with a message whose check wasn't recorded as a send. */
function sentWithoutRecord(database: DatabaseSync): number {
  return Number(
    (
      database
        .prepare(
          `SELECT COUNT(*) AS n FROM notification_messages m
           JOIN notification_rules r ON r.id = m.rule_id
           WHERE r.last_triggered_at IS NULL`,
        )
        .get() as { n: number }
    ).n,
  );
}

function rule(database: DatabaseSync, id: string) {
  return database
    .prepare(
      "SELECT last_checked_at AS lastCheckedAt, next_run_at AS nextRunAt FROM notification_rules WHERE id = ?",
    )
    .get(id) as { lastCheckedAt: number | null; nextRunAt: number };
}

function notificationSchedule(database: DatabaseSync) {
  return database
    .prepare(
      "SELECT next_run_at AS nextRunAt, last_error AS lastError FROM scheduled_task_schedule_state WHERE task_key = 'notification_tick'",
    )
    .get() as { nextRunAt: number; lastError: string | null };
}

describe("notification ticks within their D1 queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listMembers).mockResolvedValue({
      members: [
        { id: "ana", email: "ana@example.test", name: "Ana", role: "owner" },
      ],
    } as never);
    vi.mocked(sendEmail).mockResolvedValue({
      messageId: "email-1",
      status: "sent",
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    setup?.database.close();
    setup = undefined;
  });

  it.each([
    ["report", { rolledUp: 1 }],
    ["change", { rolledUp: 0, alerts: 1 }],
  ] as const)(
    "reserves the queries a %s takes on its longest path, from evaluation to its recorded send",
    async (type: NotificationRuleType, sites) => {
      const { database, env, d1Queries } = seed(sites);
      if (type === "change") visitToday(database, 1);
      vi.useFakeTimers({ now: START, toFake: ["Date"] });

      const outcome = await runNotificationTick({
        env,
        startedAt: START,
        logger: logger(),
      });

      expect(outcome.summary).toMatchObject({
        rulesTriggered: 1,
        messagesCreated: 1,
        emailSent: 1,
      });
      expect(d1Queries() - TICK_READS).toBe(NOTIFICATION_RULE_D1_QUERIES[type]);
    },
  );

  it("sends each rule once across ticks that can't finish them all, and records every send", async () => {
    const { database, env } = seed({ rolledUp: 3 });
    // Two reports' queries, less one: the second can't be finished.
    const tickQueries =
      TICK_READS + 2 * NOTIFICATION_RULE_D1_QUERIES.report - 1;
    const outcomes: Array<boolean | undefined> = [];
    const sent: number[] = [];

    for (let tick = 0; tick < 5; tick += 1) {
      vi.useFakeTimers({ now: START + tick * MINUTE_MS, toFake: ["Date"] });
      // The invocation refuses a query past its part, as the dispatcher's does.
      const budget = new D1QueryBudget(tickQueries);
      const outcome = await runNotificationTick(
        {
          env: withD1QueryBudget(env, budget),
          startedAt: Date.now(),
          logger: logger(),
        },
        budget.left,
      );
      outcomes.push(outcome.workRemains);
      sent.push(Object.keys(messages(database)).length);
      expect(sentWithoutRecord(database)).toBe(0);
      if (!outcome.workRemains) break;
    }

    // One report a tick; the rest run on the next.
    expect(outcomes).toEqual([true, true, false]);
    expect(sent).toEqual([1, 2, 3]);
    expect(messages(database)).toEqual({
      "rule-1": 1,
      "rule-2": 1,
      "rule-3": 1,
    });
    for (const id of ["rule-1", "rule-2", "rule-3"]) {
      expect(rule(database, id).nextRunAt).toBeGreaterThan(START / 1000);
    }
  });

  it("runs notifications again on the next minute until every due rule has run, without checking an alert twice", async () => {
    const reports = 85;
    const alerts = 5;
    const { database, env, d1Queries } = seed({ rolledUp: reports, alerts });
    database
      .prepare(
        "UPDATE scheduled_task_schedule_state SET next_run_at = CASE task_key WHEN 'notification_tick' THEN 0 ELSE ? END",
      )
      .run(START / 1000 + 86_400);
    const alertIds = Array.from(
      { length: alerts },
      (_, index) => `rule-${reports + index + 1}`,
    );

    vi.useFakeTimers({ now: START, toFake: ["Date"] });
    const first = d1Queries();
    await dispatchInternalScheduledTasks(env, START, observability());
    expect(d1Queries() - first).toBeLessThanOrEqual(D1_QUERIES_PER_INVOCATION);
    const sentFirst = Object.keys(messages(database)).length;
    expect(sentFirst).toBeGreaterThan(0);
    expect(sentFirst).toBeLessThan(reports);
    // The rules it didn't reach run on the next minute.
    expect(notificationSchedule(database)).toEqual({
      nextRunAt: START / 1000 + 60,
      lastError: null,
    });
    for (const id of alertIds) {
      expect(rule(database, id)).toEqual({
        lastCheckedAt: START / 1000,
        nextRunAt: START / 1000 + 1800,
      });
    }

    const next = START + MINUTE_MS;
    vi.useFakeTimers({ now: next, toFake: ["Date"] });
    const second = d1Queries();
    await dispatchInternalScheduledTasks(env, next, observability());
    expect(d1Queries() - second).toBeLessThanOrEqual(D1_QUERIES_PER_INVOCATION);

    expect(messages(database)).toEqual(
      Object.fromEntries(
        Array.from({ length: reports }, (_, index) => [`rule-${index + 1}`, 1]),
      ),
    );
    expect(sentWithoutRecord(database)).toBe(0);
    // Done: back on its own schedule. The alerts wait for their next slot.
    expect(notificationSchedule(database)).toEqual({
      nextRunAt: START / 1000 + 1800,
      lastError: null,
    });
    for (const id of alertIds) {
      expect(rule(database, id).lastCheckedAt).toBe(START / 1000);
    }
  });
});
