import {
  DEFAULT_RETENTION_CONFIG,
  type RetentionConfig,
  retentionDaysForNotification,
} from "@/lib/retention";

import type { ReportSchedule } from "./rules";
import { partsInTimezone, zonedTimeToUtcMs } from "./zoned-time";

const MINUTE_MS = 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The schedule's time on a local date; a day past the month's end clamps. */
function sendAt(
  schedule: ReportSchedule,
  date: { year: number; month: number; day: number },
): number {
  const [hour, minute] = schedule.time.split(":").map(Number);
  // Date.UTC rolls month 13 into January, so read the real month first.
  const first = new Date(Date.UTC(date.year, date.month - 1, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth() + 1;
  return zonedTimeToUtcMs({
    year,
    month,
    day:
      schedule.kind === "monthly"
        ? Math.min(date.day, daysInMonth(year, month))
        : date.day,
    hour: hour!,
    minute: minute!,
    timeZone: schedule.timezone,
  });
}

function nextSendMs(schedule: ReportSchedule, fromMs: number): number {
  const today = partsInTimezone(new Date(fromMs), schedule.timezone);
  if (schedule.kind === "weekly") {
    const weekday = new Date(
      Date.UTC(today.year, today.month - 1, today.day),
    ).getUTCDay();
    const day = today.day + ((schedule.dayOfWeek - weekday + 7) % 7);
    const candidate = sendAt(schedule, { ...today, day });
    return candidate > fromMs
      ? candidate
      : sendAt(schedule, { ...today, day: day + 7 });
  }
  const candidate = sendAt(schedule, { ...today, day: schedule.dayOfMonth });
  return candidate > fromMs
    ? candidate
    : sendAt(schedule, {
        ...today,
        month: today.month + 1,
        day: schedule.dayOfMonth,
      });
}

/** When a report next goes out, at least a minute after `fromEpochSeconds`. */
export function nextReportRunAt(
  schedule: ReportSchedule,
  fromEpochSeconds: number,
): number {
  const fromMs = Math.max(0, Math.trunc(fromEpochSeconds)) * 1000;
  return Math.floor(
    Math.max(fromMs + MINUTE_MS, nextSendMs(schedule, fromMs)) / 1000,
  );
}

export function notificationRuleExpiresAtSeconds(input: {
  severity: string;
  createdAtSeconds: number;
  retention?: RetentionConfig;
}): number {
  const days = retentionDaysForNotification(
    input,
    input.retention ?? DEFAULT_RETENTION_CONFIG,
  );
  return input.createdAtSeconds + days * DAY_SECONDS;
}
