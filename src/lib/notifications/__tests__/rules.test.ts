import { describe, expect, it } from "vitest";

import {
  InvalidNotificationRuleError,
  parseChangeCondition,
  parseNotificationRuleConfig,
  parseReportSchedule,
} from "@/lib/notifications/rules";

const weekly = {
  kind: "weekly",
  dayOfWeek: 1,
  time: "08:30",
  timezone: "Europe/Paris",
};
const alert = { direction: "drop", window: "last_24h", percent: 40 };

describe("notification rule config", () => {
  it("accepts weekly and monthly reports and spike or drop alerts", () => {
    expect(
      parseNotificationRuleConfig({ type: "report", schedule: weekly }),
    ).toEqual({ type: "report", schedule: weekly });
    expect(
      parseReportSchedule({
        kind: "monthly",
        dayOfMonth: 31,
        time: "23:00",
        timezone: "UTC",
        dayOfWeek: 4,
      }),
    ).toEqual({
      kind: "monthly",
      dayOfMonth: 31,
      time: "23:00",
      timezone: "UTC",
    });
    expect(
      parseNotificationRuleConfig({
        type: "change",
        condition: { ...alert, extra: true },
        schedule: weekly,
      }),
    ).toEqual({ type: "change", condition: alert });
  });

  it.each([
    [{ type: "milestone" }, "type must be one of report, change"],
    [{ type: "report" }, "schedule must be an object"],
    [
      { type: "report", schedule: { ...weekly, kind: "daily" } },
      "schedule.kind must be one of weekly, monthly",
    ],
    [
      { type: "report", schedule: { ...weekly, time: "08:15" } },
      "schedule.time must be HH:00 or HH:30",
    ],
    [
      { type: "report", schedule: { ...weekly, timezone: "Mars/Base" } },
      "schedule.timezone must be a time zone",
    ],
    [
      { type: "report", schedule: { ...weekly, dayOfWeek: 7 } },
      "schedule.dayOfWeek must be a whole number from 0 to 6",
    ],
    [
      {
        type: "report",
        schedule: {
          kind: "monthly",
          dayOfMonth: 0,
          time: "08:00",
          timezone: "UTC",
        },
      },
      "schedule.dayOfMonth must be a whole number from 1 to 31",
    ],
    [{ type: "change", condition: [] }, "condition must be an object"],
    [
      { type: "change", condition: { ...alert, direction: "up" } },
      "condition.direction must be one of spike, drop",
    ],
    [
      { type: "change", condition: { ...alert, window: "yesterday" } },
      "condition.window must be one of last_1h, last_24h",
    ],
    [
      { type: "change", condition: { ...alert, percent: 12.5 } },
      "condition.percent must be a whole number from 1 to 1000",
    ],
  ])("refuses %j", (input, message) => {
    expect(() => parseNotificationRuleConfig(input)).toThrow(
      new InvalidNotificationRuleError(message),
    );
  });

  it("refuses a percentage outside 1 to 1000", () => {
    expect(() => parseChangeCondition({ ...alert, percent: 0 })).toThrow(
      InvalidNotificationRuleError,
    );
    expect(() => parseChangeCondition({ ...alert, percent: 1001 })).toThrow(
      InvalidNotificationRuleError,
    );
  });
});
