import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { loadMigrations } from "@/../scripts/schema/database";
import {
  parseChangeCondition,
  parseReportSchedule,
} from "@/lib/notifications/rules";

const databases: DatabaseSync[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

/** The schema before 0003, with rules of every kind the old engine had. */
function databaseBeforeRuleCut() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  const migrations = loadMigrations();
  const index = migrations.findIndex(({ file }) =>
    file.startsWith("0004_report_and_alert_rules"),
  );
  for (const { sql } of migrations.slice(0, index)) database.exec(sql);
  database.exec(`
    INSERT INTO teams (id, name, slug) VALUES ('team', 'Team', 'team');
    INSERT INTO sites (id, team_id, name, domain)
      VALUES ('site', 'team', 'Site', 'example.com');
    INSERT INTO users (id, email) VALUES ('member', 'member@example.com');
  `);
  const insertRule = database.prepare(`
    INSERT INTO notification_rules
      (id, team_id, site_id, name, type, schedule_json, condition_json,
       recipient_json, next_run_at, created_by_user_id)
    VALUES (?, 'team', ?, ?, ?, ?, ?, '{"mode":"all_team_members"}', 1, 'member')
  `);
  const rule = (
    id: string,
    type: string,
    schedule: object,
    condition: object = {},
    siteId: string | null = "site",
  ) =>
    insertRule.run(
      id,
      siteId,
      id,
      type,
      JSON.stringify(schedule),
      JSON.stringify(condition),
    );
  const daily = { kind: "daily", time: "09:30", timezone: "Asia/Tokyo" };
  rule("daily-report", "report", daily, { reportType: "daily" });
  rule("interval-report", "report", { kind: "interval", everyMinutes: 60 });
  rule("weekly-report", "report", {
    kind: "weekly",
    dayOfWeek: 3,
    time: "07:00",
    timezone: "Europe/Paris",
  });
  rule("monthly-report", "report", {
    kind: "monthly",
    dayOfMonth: 2,
    time: "06:00",
    timezone: "UTC",
  });
  rule("quarterly-report", "report", {
    kind: "quarterly",
    dayOfMonth: 15,
    time: "08:00",
    timezone: "America/New_York",
  });
  rule("yearly-report", "report", {
    kind: "yearly",
    month: 3,
    dayOfMonth: 31,
    time: "10:00",
    timezone: "UTC",
  });
  rule(
    "drop-alert",
    "change",
    { kind: "interval", everyMinutes: 30 },
    {
      all: [
        {
          metric: "views",
          window: "yesterday",
          operator: "<=",
          value: -40,
          mode: "percent",
        },
        {
          metric: "visitors",
          window: "last_1h",
          operator: ">=",
          value: 10,
          mode: "percent",
        },
      ],
      cooldownMinutes: 60,
    },
  );
  rule(
    "absolute-spike-alert",
    "change",
    { kind: "interval", everyMinutes: 60 },
    {
      any: [
        {
          metric: "visitors",
          window: "last_1h",
          operator: ">",
          value: 500,
          mode: "absolute",
        },
      ],
    },
  );
  for (const type of ["milestone", "threshold", "health", "test"]) {
    rule(`${type}-rule`, type, daily);
  }
  rule("siteless-report", "report", daily, {}, null);
  const insertMessage = database.prepare(`
    INSERT INTO notification_messages (id, team_id, user_id, type, title)
    VALUES (?, 'team', 'member', ?, 'Title')
  `);
  for (const type of ["report", "change", "threshold", "health", "test"]) {
    insertMessage.run(`${type}-message`, type);
  }
  return { database, rest: migrations.slice(index) };
}

function rulesById(database: DatabaseSync) {
  const rows = database
    .prepare(
      "SELECT id, type, schedule_json, condition_json, next_run_at FROM notification_rules",
    )
    .all() as Array<{
    id: string;
    type: string;
    schedule_json: string;
    condition_json: string;
    next_run_at: number | null;
  }>;
  return new Map(
    rows.map((row) => [
      row.id,
      {
        type: row.type,
        schedule: JSON.parse(row.schedule_json) as Record<string, unknown>,
        condition: JSON.parse(row.condition_json) as Record<string, unknown>,
        nextRunAt: row.next_run_at,
      },
    ]),
  );
}

describe("migration 0003: reports and alerts only", () => {
  it("converts kept rules to the new shapes and deletes the rest", () => {
    const { database, rest } = databaseBeforeRuleCut();
    const before = Math.floor(Date.now() / 1000);
    for (const { sql } of rest) database.exec(sql);
    const rules = rulesById(database);

    expect([...rules.keys()].sort()).toEqual([
      "absolute-spike-alert",
      "daily-report",
      "drop-alert",
      "interval-report",
      "monthly-report",
      "quarterly-report",
      "weekly-report",
      "yearly-report",
    ]);

    expect(rules.get("daily-report")!.schedule).toEqual({
      kind: "weekly",
      dayOfWeek: 1,
      time: "09:30",
      timezone: "Asia/Tokyo",
    });
    expect(rules.get("interval-report")!.schedule).toEqual({
      kind: "weekly",
      dayOfWeek: 1,
      time: "08:00",
      timezone: "UTC",
    });
    expect(rules.get("weekly-report")!.schedule).toEqual({
      kind: "weekly",
      dayOfWeek: 3,
      time: "07:00",
      timezone: "Europe/Paris",
    });
    expect(rules.get("monthly-report")!.schedule).toEqual({
      kind: "monthly",
      dayOfMonth: 2,
      time: "06:00",
      timezone: "UTC",
    });
    expect(rules.get("quarterly-report")!.schedule).toEqual({
      kind: "monthly",
      dayOfMonth: 15,
      time: "08:00",
      timezone: "America/New_York",
    });
    expect(rules.get("yearly-report")!.schedule).toEqual({
      kind: "monthly",
      dayOfMonth: 31,
      time: "10:00",
      timezone: "UTC",
    });

    // Every converted rule is one the app reads back.
    for (const [id, rule] of rules) {
      if (rule.type === "report") {
        expect(parseReportSchedule(rule.schedule), id).toBeTruthy();
        expect(rule.condition, id).toEqual({});
      } else {
        expect(parseChangeCondition(rule.condition), id).toBeTruthy();
        expect(rule.schedule, id).toEqual({});
      }
    }

    expect(rules.get("drop-alert")!.condition).toEqual({
      direction: "drop",
      window: "last_24h",
      percent: 40,
    });
    expect(rules.get("absolute-spike-alert")!.condition).toEqual({
      direction: "spike",
      window: "last_1h",
      percent: 50,
    });
    expect(rules.get("drop-alert")!.nextRunAt).toBeGreaterThanOrEqual(before);
  });

  it("leaves moved reports for the app to schedule and keeps kept ones", () => {
    const { database, rest } = databaseBeforeRuleCut();
    for (const { sql } of rest) database.exec(sql);
    const rules = rulesById(database);

    // Kept schedules keep their next run.
    expect(rules.get("weekly-report")!.nextRunAt).toBe(1);
    expect(rules.get("monthly-report")!.nextRunAt).toBe(1);
    // Moved ones wait for the next tick, which knows their time zone.
    for (const id of [
      "daily-report",
      "interval-report",
      "quarterly-report",
      "yearly-report",
    ]) {
      expect(rules.get(id)!.nextRunAt, id).toBeNull();
    }
  });

  it("turns a chosen alert cooldown into the 12-hour quiet period", () => {
    const { database, rest } = databaseBeforeRuleCut();
    database.exec(`
      UPDATE notification_rules
      SET last_triggered_at = 1000, cooldown_until = 1000 + 7 * 86400
      WHERE id = 'drop-alert';
      UPDATE notification_rules SET cooldown_until = 5000
      WHERE id = 'absolute-spike-alert';
    `);
    for (const { sql } of rest) database.exec(sql);

    const cooldown = (id: string) =>
      (
        database
          .prepare("SELECT cooldown_until FROM notification_rules WHERE id = ?")
          .get(id) as { cooldown_until: number | null }
      ).cooldown_until;
    expect(cooldown("drop-alert")).toBe(1000 + 12 * 60 * 60);
    expect(cooldown("absolute-spike-alert")).toBeNull();
  });

  it("drops messages of removed kinds and the columns rules no longer have", () => {
    const { database, rest } = databaseBeforeRuleCut();
    for (const { sql } of rest) database.exec(sql);

    expect(
      database
        .prepare("SELECT type FROM notification_messages ORDER BY type")
        .all()
        .map((row) => row.type),
    ).toEqual(["change", "report"]);
    const columns = database
      .prepare("SELECT name FROM pragma_table_info('notification_rules')")
      .all()
      .map((row) => row.name);
    expect(columns).not.toContain("recipient_json");
    expect(columns).not.toContain("state_json");
    expect(columns).not.toContain("description");
  });
});
