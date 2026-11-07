import { describe, expect, it } from "vitest";

import { SCHEDULED_TASKS } from "@/lib/edge/scheduled-tasks/registry";

describe("edge/scheduled-task-registry", () => {
  it("lists each task the every-minute cron dispatches once", () => {
    expect(SCHEDULED_TASKS.map((task) => task.key).sort()).toEqual([
      "analytics_retention",
      "database_maintenance",
      "notification_tick",
      "visit_rollups",
    ]);
  });

  it("runs notifications and rollups every 30 minutes, retention hourly and maintenance daily", () => {
    const schedules = Object.fromEntries(
      SCHEDULED_TASKS.map((task) => [task.key, task.internalSchedule]),
    );
    expect(schedules.notification_tick).toEqual({
      kind: "interval",
      everyMinutes: 30,
    });
    expect(schedules.visit_rollups).toEqual({
      kind: "interval",
      everyMinutes: 30,
    });
    expect(schedules.analytics_retention).toEqual({
      kind: "interval",
      everyMinutes: 60,
    });
    expect(schedules.database_maintenance).toEqual({
      kind: "daily",
      timezone: "UTC",
    });
  });
});
