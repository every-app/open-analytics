import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScheduledTaskContext } from "@/lib/edge/scheduled-tasks/runner";
import { runNotificationTick } from "@/lib/notifications/edge/notification-task";
import type { NotificationRule } from "@/lib/notifications/edge/rule-store";

const listDueNotificationRules = vi.hoisted(() => vi.fn());
const resolveNotificationRecipient = vi.hoisted(() => vi.fn());
const recordNotificationRuleCheck = vi.hoisted(() => vi.fn());
const scheduleUnscheduledReports = vi.hoisted(() => vi.fn());
const evaluateNotificationRule = vi.hoisted(() => vi.fn());
const createNotificationMessage = vi.hoisted(() => vi.fn());
const deliverNotificationMessage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications/edge/rule-store", () => ({
  DUE_NOTIFICATION_RULES_PER_READ: 100,
  listDueNotificationRules,
  resolveNotificationRecipient,
  recordNotificationRuleCheck,
  scheduleUnscheduledReports,
}));
vi.mock("@/lib/notifications/edge/evaluator", () => ({
  evaluateNotificationRule,
}));
vi.mock("@/lib/notifications/edge/message-store", () => ({
  createNotificationMessage,
}));
vi.mock("@/lib/notifications/edge/delivery", () => ({
  deliverNotificationMessage,
}));

function rule(id: string): NotificationRule {
  return {
    id,
    teamId: "team-1",
    siteId: "site-1",
    name: id,
    enabled: true,
    type: "change",
    condition: { direction: "spike", window: "last_1h", percent: 50 },
    lastCheckedAt: null,
    lastTriggeredAt: null,
    nextRunAt: 0,
    cooldownUntil: null,
    createdByUserId: "creator",
    createdAt: 1,
    updatedAt: 1,
  };
}

const spike = {
  status: "triggered",
  cooldownUntil: 99_999,
  message: {
    type: "change",
    severity: "warning",
    title: "example.com traffic spike",
    summary: "Visitors rose 50% (100 to 150).",
    bodyText: "Visitors rose 50% (100 to 150).",
    data: {
      siteDomain: "example.com",
      window: "last_1h",
      current: 150,
      previous: 100,
      change: 50,
    },
  },
};

function context(): ScheduledTaskContext & { events: string[] } {
  const events: string[] = [];
  const log = (event: string) => {
    events.push(event);
    return Promise.resolve();
  };
  return {
    env: { DB: {} } as never,
    startedAt: Date.now(),
    logger: { debug: log, info: log, warn: log, error: log },
    events,
  };
}

function delivered(status: string) {
  return { deliveryResults: { email: { status } } };
}

describe("notification tick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveNotificationRecipient.mockResolvedValue({
      id: "creator",
      email: "creator@example.com",
      preferencesJson: JSON.stringify({
        attention: { alertsCreateUnread: false },
      }),
    });
    createNotificationMessage.mockImplementation(async (_env, input) => ({
      id: `message-${input.ruleId}`,
      ...input,
    }));
    deliverNotificationMessage.mockResolvedValue(delivered("sent"));
  });

  it("sends a triggered rule to its creator and records the check", async () => {
    listDueNotificationRules.mockResolvedValue([rule("rule-1")]);
    evaluateNotificationRule.mockResolvedValue(spike);

    const outcome = await runNotificationTick(context());

    // Reports the rules migration left unscheduled get their slot first.
    expect(scheduleUnscheduledReports).toHaveBeenCalledBefore(
      listDueNotificationRules,
    );
    expect(resolveNotificationRecipient).toHaveBeenCalledWith(
      { DB: {} },
      expect.objectContaining({ id: "rule-1" }),
    );
    expect(createNotificationMessage).toHaveBeenCalledWith(
      { DB: {} },
      expect.objectContaining({
        userId: "creator",
        ruleId: "rule-1",
        type: "change",
        severity: "warning",
        // Their preference says alerts don't arrive unread.
        requiresAttention: false,
        title: "example.com traffic change alert",
        data: expect.objectContaining({ locale: "en", change: 50 }),
      }),
    );
    expect(deliverNotificationMessage).toHaveBeenCalledWith(
      { DB: {} },
      expect.objectContaining({ id: "message-rule-1" }),
      expect.objectContaining({ id: "creator" }),
      expect.anything(),
    );
    expect(recordNotificationRuleCheck).toHaveBeenCalledWith(
      { DB: {} },
      {
        rule: expect.objectContaining({ id: "rule-1" }),
        checkedAt: expect.any(Number),
        triggeredAt: expect.any(Number),
        cooldownUntil: 99_999,
      },
    );
    expect(outcome).toEqual({
      status: "success",
      summary: {
        rulesScanned: 1,
        rulesChecked: 1,
        rulesSkipped: 0,
        rulesTriggered: 1,
        messagesCreated: 1,
        emailSent: 1,
        emailFailed: 0,
        emailSkipped: 0,
      },
      workRemains: false,
    });
  });

  it("records checks that sent nothing and keeps going after a failure", async () => {
    listDueNotificationRules.mockResolvedValue([
      rule("quiet"),
      rule("gone-site"),
      rule("broken"),
      rule("no-creator"),
      rule("email-failed"),
      rule("email-skipped"),
    ]);
    evaluateNotificationRule.mockImplementation(async (_env, current) => {
      if (current.id === "quiet")
        return { status: "checked", triggered: false };
      if (current.id === "gone-site") {
        return { status: "skipped", reason: "site_not_found" };
      }
      if (current.id === "broken") throw new Error("D1 unavailable");
      return spike;
    });
    resolveNotificationRecipient.mockImplementation(async (_env, current) =>
      current.id === "no-creator"
        ? null
        : { id: "creator", email: "c@example.com", preferencesJson: "{}" },
    );
    deliverNotificationMessage.mockImplementation(async (_env, message) =>
      delivered(message.ruleId === "email-failed" ? "failed" : "skipped"),
    );
    const ctx = context();

    const outcome = await runNotificationTick(ctx);

    expect(outcome).toEqual({
      status: "partial",
      summary: {
        rulesScanned: 6,
        rulesChecked: 5,
        rulesSkipped: 3,
        rulesTriggered: 3,
        messagesCreated: 2,
        emailSent: 0,
        emailFailed: 1,
        emailSkipped: 1,
      },
      workRemains: false,
    });
    expect(recordNotificationRuleCheck).toHaveBeenCalledTimes(6);
    for (const id of ["quiet", "gone-site", "broken"]) {
      expect(recordNotificationRuleCheck).toHaveBeenCalledWith(
        { DB: {} },
        {
          rule: expect.objectContaining({ id }),
          checkedAt: expect.any(Number),
        },
      );
    }
    expect(ctx.events).toEqual(
      expect.arrayContaining([
        "notification_rule_skipped",
        "notification_rule_failed",
        "notification_tick_finish",
      ]),
    );
  });

  it("goes on with the next minute's tick when a read returns a full page of due rules", async () => {
    listDueNotificationRules.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => rule(`rule-${index}`)),
    );
    evaluateNotificationRule.mockResolvedValue({
      status: "checked",
      triggered: false,
    });

    const outcome = await runNotificationTick(context());

    expect(recordNotificationRuleCheck).toHaveBeenCalledTimes(100);
    expect(outcome.workRemains).toBe(true);
  });
});
