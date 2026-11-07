type InternalSchedule =
  | { kind: "interval"; everyMinutes: 30 | 60 }
  | { kind: "daily"; timezone: "UTC" };

/** How often the notification tick checks the due rules. */
export const NOTIFICATION_TICK_MINUTES = 30;

interface ScheduledTaskDefinitionInfo {
  key: string;
  internalSchedule: InternalSchedule;
}

/**
 * The tasks the every-minute cron dispatches, each on its own schedule. A
 * run that leaves work (a backfill, rebuilds, expired data, a deleted site's
 * data) runs again on the next minute until it is done.
 */
export const SCHEDULED_TASKS: ScheduledTaskDefinitionInfo[] = [
  {
    // Rolls up each complete UTC day, then backfills older days.
    key: "visit_rollups",
    internalSchedule: { kind: "interval", everyMinutes: 30 },
  },
  {
    // Evaluates notification rules and delivers their messages.
    key: "notification_tick",
    internalSchedule: {
      kind: "interval",
      everyMinutes: NOTIFICATION_TICK_MINUTES,
    },
  },
  {
    // Deletes expired notifications and refreshes D1 query statistics.
    key: "database_maintenance",
    internalSchedule: { kind: "daily", timezone: "UTC" },
  },
  {
    // Deletes deleted sites' data, then expired page views and events;
    // rollups are kept.
    key: "analytics_retention",
    internalSchedule: { kind: "interval", everyMinutes: 60 },
  },
];
