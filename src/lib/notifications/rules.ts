/**
 * The two kinds of notification rule, as Plausible has them: a weekly or
 * monthly traffic report, and an alert when a site's visitors spike or drop.
 * Every rule belongs to one site and goes to the member who created it.
 * Runtime-neutral: the settings UI and the Worker share these shapes.
 */
export const NOTIFICATION_RULE_TYPES = ["report", "change"] as const;
export type NotificationRuleType = (typeof NOTIFICATION_RULE_TYPES)[number];

export const REPORT_FREQUENCIES = ["weekly", "monthly"] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

export const CHANGE_DIRECTIONS = ["spike", "drop"] as const;
export type ChangeDirection = (typeof CHANGE_DIRECTIONS)[number];

/** Visitors in this window are compared with the window just before it. */
export const CHANGE_WINDOWS = ["last_1h", "last_24h"] as const;
export type ChangeWindow = (typeof CHANGE_WINDOWS)[number];

export const MIN_CHANGE_PERCENT = 1;
export const MAX_CHANGE_PERCENT = 1000;

/** An alert that fired stays quiet this long, as Plausible's do. */
export const CHANGE_ALERT_COOLDOWN_SECONDS = 12 * 60 * 60;

export type ReportSchedule =
  | { kind: "weekly"; dayOfWeek: number; time: string; timezone: string }
  | { kind: "monthly"; dayOfMonth: number; time: string; timezone: string };

export interface ChangeCondition {
  direction: ChangeDirection;
  window: ChangeWindow;
  percent: number;
}

export type NotificationRuleConfig =
  | { type: "report"; schedule: ReportSchedule }
  | { type: "change"; condition: ChangeCondition };

/** Sends go out on the hour or the half hour. */
const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/;

export class InvalidNotificationRuleError extends Error {}

function record(value: unknown, field: string): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new InvalidNotificationRuleError(`${field} must be an object`);
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (allowed.includes(value as T)) return value as T;
  throw new InvalidNotificationRuleError(
    `${field} must be one of ${allowed.join(", ")}`,
  );
}

function integerIn(
  value: unknown,
  min: number,
  max: number,
  field: string,
): number {
  if (Number.isInteger(value) && Number(value) >= min && Number(value) <= max) {
    return Number(value);
  }
  throw new InvalidNotificationRuleError(
    `${field} must be a whole number from ${min} to ${max}`,
  );
}

function timeOfDay(value: unknown): string {
  if (typeof value === "string" && TIME_RE.test(value)) return value;
  throw new InvalidNotificationRuleError(
    "schedule.time must be HH:00 or HH:30",
  );
}

function timeZone(value: unknown): string {
  if (typeof value === "string" && value) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return value;
    } catch {
      // Falls through to the error below.
    }
  }
  throw new InvalidNotificationRuleError(
    "schedule.timezone must be a time zone",
  );
}

export function parseReportSchedule(input: unknown): ReportSchedule {
  const raw = record(input, "schedule");
  const kind = oneOf(raw.kind, REPORT_FREQUENCIES, "schedule.kind");
  const time = timeOfDay(raw.time);
  const timezone = timeZone(raw.timezone);
  return kind === "weekly"
    ? {
        kind,
        dayOfWeek: integerIn(raw.dayOfWeek, 0, 6, "schedule.dayOfWeek"),
        time,
        timezone,
      }
    : {
        kind,
        dayOfMonth: integerIn(raw.dayOfMonth, 1, 31, "schedule.dayOfMonth"),
        time,
        timezone,
      };
}

export function parseChangeCondition(input: unknown): ChangeCondition {
  const raw = record(input, "condition");
  return {
    direction: oneOf(raw.direction, CHANGE_DIRECTIONS, "condition.direction"),
    window: oneOf(raw.window, CHANGE_WINDOWS, "condition.window"),
    percent: integerIn(
      raw.percent,
      MIN_CHANGE_PERCENT,
      MAX_CHANGE_PERCENT,
      "condition.percent",
    ),
  };
}

/** A rule's type with its schedule (reports) or condition (alerts). */
export function parseNotificationRuleConfig(
  input: Readonly<Record<string, unknown>>,
): NotificationRuleConfig {
  const type = oneOf(input.type, NOTIFICATION_RULE_TYPES, "type");
  return type === "report"
    ? { type, schedule: parseReportSchedule(input.schedule) }
    : { type, condition: parseChangeCondition(input.condition) };
}
