import type { DatabaseSync } from "node:sqlite";

import { listMembers } from "@every-app/sdk/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import type { Actor } from "@/lib/edge/admin/auth";
import type { Env } from "@/lib/edge/types";
import {
  createNotificationRule,
  deleteNotificationRule,
  getNotificationRule,
  listDueNotificationRules,
  listNotificationRules,
  type NotificationRule,
  recordNotificationRuleCheck,
  resolveNotificationRecipient,
  scheduleUnscheduledReports,
  updateNotificationRule,
} from "@/lib/notifications/edge/rule-store";
import type { NotificationRuleConfig } from "@/lib/notifications/rules";

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMembers: vi.fn(),
}));

const NOW = Math.floor(Date.UTC(2026, 6, 1, 10, 0) / 1000); // Wednesday
const weeklyReport: NotificationRuleConfig = {
  type: "report",
  schedule: { kind: "weekly", dayOfWeek: 1, time: "08:00", timezone: "UTC" },
};
const dropAlert: NotificationRuleConfig = {
  type: "change",
  condition: { direction: "drop", window: "last_24h", percent: 40 },
};

let database: DatabaseSync;
let env: Env;

function actor(input: Partial<Actor> = {}): Actor {
  return {
    user: { id: "ana" } as Actor["user"],
    teamId: "team-1",
    role: "owner",
    isAdmin: true,
    ...input,
  } as Actor;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW * 1000);
  database = createMigratedDatabase();
  database.exec(`
    INSERT INTO users (id, email, notification_preferences_json, preferred_locale)
      VALUES ('ana', 'ana@old.test', '{"email":false}', 'ja');
    INSERT INTO teams (id, name, slug) VALUES ('team-1', 'One', 'one'),
      ('team-2', 'Two', 'two');
    INSERT INTO sites (id, team_id, name, domain) VALUES
      ('site-1', 'team-1', 'Site One', 'one.test'),
      ('site-2', 'team-1', 'Site Two', 'two.test'),
      ('other-site', 'team-2', 'Other', 'other.test');
  `);
  env = { DB: createSqliteD1Database(database) } as unknown as Env;
  vi.mocked(listMembers).mockResolvedValue({
    members: [
      { id: "ana", email: "ana@new.test", name: "Ana", role: "owner" },
      { id: "bo", email: "bo@example.test", name: "Bo", role: "admin" },
    ],
  } as never);
});

afterEach(() => {
  vi.useRealTimers();
  database.close();
});

describe("notification rule store", () => {
  it("creates a report scheduled for its next send, owned by its creator", async () => {
    const rule = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "  Weekly  ",
      config: weeklyReport,
    });

    expect(rule).toEqual({
      id: expect.any(String),
      teamId: "team-1",
      siteId: "site-1",
      name: "Weekly",
      enabled: true,
      ...weeklyReport,
      lastCheckedAt: null,
      lastTriggeredAt: null,
      nextRunAt: Math.floor(Date.UTC(2026, 6, 6, 8) / 1000),
      cooldownUntil: null,
      createdByUserId: "ana",
      createdAt: NOW,
      updatedAt: NOW,
    });
    await expect(getNotificationRule(env, rule.id)).resolves.toEqual(rule);
  });

  it("checks an alert on the next tick and stores no schedule for it", async () => {
    const rule = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "",
      enabled: false,
      config: dropAlert,
    });

    expect(rule).toMatchObject({
      name: "Notification rule",
      enabled: false,
      ...dropAlert,
      nextRunAt: NOW,
    });
    expect(
      database
        .prepare(
          "SELECT schedule_json, condition_json FROM notification_rules WHERE id = ?",
        )
        .get(rule.id),
    ).toEqual({
      schedule_json: "{}",
      condition_json: JSON.stringify(dropAlert.condition),
    });
  });

  it("refuses sites and organizations the actor doesn't manage", async () => {
    for (const input of [
      { teamId: "team-1", siteId: "other-site" },
      { teamId: "team-2", siteId: "other-site" },
    ]) {
      await expect(
        createNotificationRule(env, actor(), {
          ...input,
          name: "x",
          config: weeklyReport,
        }),
      ).rejects.toThrow("Forbidden");
    }
    await expect(
      listNotificationRules(env, actor(), { teamId: "team-2" }),
    ).rejects.toThrow("Forbidden");
    await expect(
      listNotificationRules(env, actor({ isAdmin: false })),
    ).rejects.toThrow("Forbidden");
  });

  it("lists the organization's rules, newest change first, by site", async () => {
    const first = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "first",
      config: weeklyReport,
    });
    vi.setSystemTime((NOW + 10) * 1000);
    const second = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-2",
      name: "second",
      config: dropAlert,
    });

    expect(
      (await listNotificationRules(env, actor())).map((rule) => rule.id),
    ).toEqual([second.id, first.id]);
    expect(
      (
        await listNotificationRules(env, actor(), {
          teamId: "team-1",
          siteId: "site-1",
        })
      ).map((rule) => rule.id),
    ).toEqual([first.id]);
  });

  it("restarts the schedule and cooldown only when what the rule watches changes", async () => {
    const rule = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "alert",
      config: dropAlert,
    });
    database
      .prepare(
        "UPDATE notification_rules SET cooldown_until = ?, next_run_at = ? WHERE id = ?",
      )
      .run(NOW + 500, NOW + 60, rule.id);

    const renamed = await updateNotificationRule(env, actor(), {
      ruleId: rule.id,
      name: "renamed",
      enabled: false,
    });
    expect(renamed).toMatchObject({
      name: "renamed",
      enabled: false,
      cooldownUntil: NOW + 500,
      nextRunAt: NOW + 60,
    });

    const moved = await updateNotificationRule(env, actor(), {
      ruleId: rule.id,
      siteId: "site-2",
      config: weeklyReport,
    });
    expect(moved).toMatchObject({
      siteId: "site-2",
      ...weeklyReport,
      cooldownUntil: null,
      nextRunAt: Math.floor(Date.UTC(2026, 6, 6, 8) / 1000),
    });

    await expect(
      updateNotificationRule(env, actor(), {
        ruleId: rule.id,
        siteId: "other-site",
      }),
    ).rejects.toThrow("Forbidden");
    await expect(
      updateNotificationRule(env, actor(), { ruleId: "missing" }),
    ).rejects.toThrow("Not Found");
  });

  it("deletes a rule once and only for a manager", async () => {
    const rule = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "x",
      config: dropAlert,
    });

    await expect(
      deleteNotificationRule(env, actor({ isAdmin: false }), rule.id),
    ).rejects.toThrow("Forbidden");
    await expect(deleteNotificationRule(env, actor(), rule.id)).resolves.toBe(
      true,
    );
    await expect(deleteNotificationRule(env, actor(), rule.id)).resolves.toBe(
      false,
    );
  });

  it("lists due rules that are on and out of cooldown, earliest first", async () => {
    const create = (name: string, config: NotificationRuleConfig) =>
      createNotificationRule(env, actor(), {
        teamId: "team-1",
        siteId: "site-1",
        name,
        config,
      });
    const alert = await create("due alert", dropAlert);
    const cooling = await create("cooling", dropAlert);
    const paused = await create("paused", dropAlert);
    const report = await create("report", weeklyReport);
    const set = database.prepare(
      "UPDATE notification_rules SET next_run_at = ?, cooldown_until = ?, enabled = ? WHERE id = ?",
    );
    set.run(NOW - 10, NOW - 1, 1, alert.id);
    set.run(NOW - 20, NOW + 100, 1, cooling.id);
    set.run(NOW - 30, null, 0, paused.id);
    set.run(NOW - 5, null, 1, report.id);

    expect(
      (await listDueNotificationRules(env, NOW)).map((rule) => rule.name),
    ).toEqual(["due alert", "report"]);
  });

  it("schedules an unscheduled report in its own time zone without touching the rest", async () => {
    const create = (name: string, config: NotificationRuleConfig) =>
      createNotificationRule(env, actor(), {
        teamId: "team-1",
        siteId: "site-1",
        name,
        config,
      });
    const tokyo = await create("tokyo", {
      type: "report",
      schedule: {
        kind: "weekly",
        dayOfWeek: 1,
        time: "08:00",
        timezone: "Asia/Tokyo",
      },
    });
    const paused = await create("paused", weeklyReport);
    const alert = await create("alert", dropAlert);
    const set = database.prepare(
      "UPDATE notification_rules SET next_run_at = ?, enabled = ? WHERE id = ?",
    );
    set.run(null, 1, tokyo.id);
    set.run(null, 0, paused.id);
    set.run(NOW - 5, 1, alert.id);

    await scheduleUnscheduledReports(env, NOW);

    const nextRunAt = (id: string) =>
      (
        database
          .prepare("SELECT next_run_at FROM notification_rules WHERE id = ?")
          .get(id) as { next_run_at: number | null }
      ).next_run_at;
    // Monday 2026-07-06 08:00 in Tokyo is Sunday 23:00 UTC.
    expect(nextRunAt(tokyo.id)).toBe(Date.UTC(2026, 6, 5, 23, 0) / 1000);
    expect(nextRunAt(paused.id)).toBeNull();
    expect(nextRunAt(alert.id)).toBe(NOW - 5);
  });

  it("records a check: last run, last send, cooldown and next run", async () => {
    const report = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "report",
      config: weeklyReport,
    });
    const alert = await createNotificationRule(env, actor(), {
      teamId: "team-1",
      siteId: "site-1",
      name: "alert",
      config: dropAlert,
    });

    await recordNotificationRuleCheck(env, {
      rule: report,
      checkedAt: NOW,
      triggeredAt: NOW,
    });
    await recordNotificationRuleCheck(env, {
      rule: alert,
      checkedAt: NOW,
      triggeredAt: NOW,
      cooldownUntil: NOW + 43_200,
    });
    await recordNotificationRuleCheck(env, {
      rule: alert,
      checkedAt: NOW + 50_000,
    });

    await expect(getNotificationRule(env, report.id)).resolves.toMatchObject({
      lastCheckedAt: NOW,
      lastTriggeredAt: NOW,
      nextRunAt: Math.floor(Date.UTC(2026, 6, 6, 8) / 1000),
    });
    await expect(getNotificationRule(env, alert.id)).resolves.toMatchObject({
      lastCheckedAt: NOW + 50_000,
      lastTriggeredAt: NOW,
      cooldownUntil: null,
      nextRunAt: NOW + 50_000,
    });
  });

  it("refuses a stored rule it can't read rather than guessing", async () => {
    database.exec(`
      INSERT INTO notification_rules (id, team_id, site_id, name, type)
      VALUES ('siteless', 'team-1', NULL, 'x', 'report'),
        ('daily', 'team-1', 'site-1', 'x', 'report');
      UPDATE notification_rules
      SET schedule_json = '{"kind":"daily","time":"08:00","timezone":"UTC"}'
      WHERE id = 'daily';
    `);

    await expect(getNotificationRule(env, "siteless")).rejects.toThrow(
      "notification_rule_row_invalid",
    );
    await expect(getNotificationRule(env, "daily")).rejects.toThrow(
      "schedule.kind must be one of weekly, monthly",
    );
  });

  it("sends to the creator while they're a member, with their settings", async () => {
    const rule = (createdByUserId: string | null) =>
      ({ teamId: "team-1", createdByUserId }) as NotificationRule;

    await expect(
      resolveNotificationRecipient(env, rule("ana")),
    ).resolves.toEqual({
      id: "ana",
      email: "ana@new.test",
      preferencesJson: '{"email":false}',
    });
    // Bo never opened the app: the defaults.
    await expect(
      resolveNotificationRecipient(env, rule("bo")),
    ).resolves.toEqual({
      id: "bo",
      email: "bo@example.test",
      preferencesJson: "{}",
    });
    await expect(
      resolveNotificationRecipient(env, rule("gone")),
    ).resolves.toBeNull();
    await expect(
      resolveNotificationRecipient(env, rule(null)),
    ).resolves.toBeNull();
    expect(listMembers).toHaveBeenCalledWith({
      env,
      for: { background: true, organizationId: "team-1" },
    });
  });
});
