type InternalSchedule =
  | { kind: "interval"; everyMinutes: 30 | 60 }
  | { kind: "daily"; timezone: "UTC" };

interface ScheduledTaskDefinitionInfo {
  key: string;
  internalSchedule: InternalSchedule;
}

/** The tasks the 30-minute cron dispatches, each on its own schedule. */
export const SCHEDULED_TASKS: ScheduledTaskDefinitionInfo[] = [
  {
    // Aggregates closed visit rows into hourly rollups.
    key: "visit_hourly_rollup",
    internalSchedule: { kind: "interval", everyMinutes: 60 },
  },
  {
    // Evaluates notification rules and delivers their messages.
    key: "notification_tick",
    internalSchedule: { kind: "interval", everyMinutes: 30 },
  },
  {
    // Deletes expired notifications and refreshes D1 query statistics.
    key: "database_maintenance",
    internalSchedule: { kind: "daily", timezone: "UTC" },
  },
  {
    // Deletes expired page views and events; hourly totals are kept.
    key: "analytics_retention",
    internalSchedule: { kind: "daily", timezone: "UTC" },
  },
];
