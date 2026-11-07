import { describe, expect, it } from "vitest";

import {
  nextReportRunAt,
  notificationRuleExpiresAtSeconds,
} from "@/lib/notifications/schedule";

function at(iso: string): number {
  return Math.floor(Date.parse(iso) / 1000);
}
function iso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

describe("report schedule", () => {
  it("sends weekly on the chosen day at the chosen time", () => {
    const schedule = {
      kind: "weekly" as const,
      dayOfWeek: 1,
      time: "08:30",
      timezone: "UTC",
    };
    // Tuesday: the coming Monday.
    expect(iso(nextReportRunAt(schedule, at("2026-06-30T10:20:00Z")))).toBe(
      "2026-07-06T08:30:00.000Z",
    );
    // Monday before the time: today. After it: next week.
    expect(iso(nextReportRunAt(schedule, at("2026-07-06T08:00:00Z")))).toBe(
      "2026-07-06T08:30:00.000Z",
    );
    expect(iso(nextReportRunAt(schedule, at("2026-07-06T08:30:00Z")))).toBe(
      "2026-07-13T08:30:00.000Z",
    );
  });

  it("reads the day and time in the schedule's time zone", () => {
    // Monday 08:00 in Tokyo is Sunday 23:00 UTC.
    expect(
      iso(
        nextReportRunAt(
          {
            kind: "weekly",
            dayOfWeek: 1,
            time: "08:00",
            timezone: "Asia/Tokyo",
          },
          at("2026-06-28T12:00:00Z"),
        ),
      ),
    ).toBe("2026-06-28T23:00:00.000Z");
  });

  it("sends monthly on the chosen day, clamped to the month's last day", () => {
    const monthly = (dayOfMonth: number) => ({
      kind: "monthly" as const,
      dayOfMonth,
      time: "08:00",
      timezone: "UTC",
    });
    expect(iso(nextReportRunAt(monthly(1), at("2026-06-30T10:20:00Z")))).toBe(
      "2026-07-01T08:00:00.000Z",
    );
    expect(iso(nextReportRunAt(monthly(15), at("2026-06-01T00:00:00Z")))).toBe(
      "2026-06-15T08:00:00.000Z",
    );
    expect(iso(nextReportRunAt(monthly(31), at("2026-02-01T00:00:00Z")))).toBe(
      "2026-02-28T08:00:00.000Z",
    );
    // December rolls into the next year.
    expect(iso(nextReportRunAt(monthly(1), at("2026-12-02T00:00:00Z")))).toBe(
      "2027-01-01T08:00:00.000Z",
    );
  });

  it("computes notification expiration windows by severity", () => {
    const createdAtSeconds = 1000;
    const days = (count: number) => createdAtSeconds + count * 24 * 60 * 60;
    expect(
      notificationRuleExpiresAtSeconds({
        severity: "warning",
        createdAtSeconds,
      }),
    ).toBe(days(180));
    expect(
      notificationRuleExpiresAtSeconds({
        severity: "critical",
        createdAtSeconds,
      }),
    ).toBe(days(180));
    expect(
      notificationRuleExpiresAtSeconds({ severity: "info", createdAtSeconds }),
    ).toBe(days(120));
  });
});
