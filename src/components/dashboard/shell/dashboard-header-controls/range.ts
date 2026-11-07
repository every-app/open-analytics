import { type DateRange } from "react-day-picker";

import {
  addZonedInterval,
  startOfZonedMonth,
  zonedParts,
} from "@/lib/analytics/time-zone";
import { intlLocale } from "@/lib/dashboard/format";
import {
  type DashboardInterval,
  RANGE_PRESETS,
  type RangePreset,
} from "@/lib/dashboard/query-state";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
export const INTERVAL_ORDER: readonly DashboardInterval[] = [
  "minute",
  "hour",
  "day",
  "week",
  "month",
] as const;
// Ranges that end now have no next period to move to.
export const ROLLING_RANGE_PRESETS = new Set<RangePreset>([
  "24h",
  "7d",
  "30d",
  "90d",
  "mtd",
  "ytd",
  "12m",
  "all",
]);
/** The presets the date control lists, before Custom range. */
export const MENU_RANGE_PRESETS: readonly RangePreset[] = RANGE_PRESETS.filter(
  (preset) => preset !== "custom",
);
/** The keys that pick a range, as in Plausible. */
export const RANGE_SHORTCUTS: Partial<Record<RangePreset, string>> = {
  today: "t",
  yesterday: "y",
  "24h": "d",
  "7d": "7",
  "30d": "3",
  "90d": "9",
  mtd: "m",
  lastMonth: "l",
  all: "a",
};
/**
 * The range a key press picks, or null for one that isn't a shortcut, comes
 * with a modifier, or is typed into a field.
 */
export function rangeForShortcut(
  event: Pick<
    KeyboardEvent,
    "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
  > & { target: EventTarget | null },
): RangePreset | null {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null;
  }
  const target = event.target as HTMLElement | null;
  if (
    target?.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
  ) {
    return null;
  }
  const key = event.key.toLowerCase();
  return (
    MENU_RANGE_PRESETS.find((preset) => RANGE_SHORTCUTS[preset] === key) ?? null
  );
}
const RANGE_LABEL_KEYS: Record<RangePreset, keyof AppMessages["ranges"]> = {
  today: "today",
  yesterday: "yesterday",
  "24h": "last24h",
  "7d": "last7d",
  "30d": "last30d",
  "90d": "last90d",
  mtd: "monthToDate",
  lastMonth: "lastMonth",
  ytd: "yearToDate",
  "12m": "last12m",
  all: "allTime",
  custom: "custom",
};
export function rangeLabel(messages: AppMessages, range: RangePreset): string {
  return messages.ranges[RANGE_LABEL_KEYS[range]];
}
export function intervalLabel(
  messages: AppMessages,
  interval: DashboardInterval,
): string {
  return messages.intervals[interval];
}
export function toCalendarDate(
  timestampMs: number,
  timeZone: string,
): Date | null {
  if (!Number.isFinite(timestampMs)) return null;
  const parts = zonedParts(timestampMs, timeZone);
  return new Date(parts.year, parts.month - 1, parts.day);
}
/** The days a range covers; `to` is exclusive, so its day is the last moment's. */
export function toDateRange(
  from: number | undefined,
  to: number | undefined,
  timeZone: string,
): DateRange | undefined {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  const fromDate = toCalendarDate(from as number, timeZone);
  const toDate = toCalendarDate((to as number) - 1, timeZone);
  if (!fromDate || !toDate) return undefined;
  return {
    from: fromDate,
    to: toDate,
  };
}
/** A range's first and last day; `to` is exclusive. */
export function formatDateSpan(
  locale: Locale,
  timeZone: string,
  from?: number,
  to?: number,
): string {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return "";
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  });
  return `${formatter.format(new Date(from as number))} - ${formatter.format(new Date((to as number) - 1))}`;
}
/**
 * The calendar months a range steps by: Month to date by its month, Year to
 * date by its year, and whole months in the zone (Last month, or a range
 * stepped to from one) by their count. Null for any other range, which steps
 * by its length in time.
 */
function calendarStepMonths(
  range: RangePreset,
  from: number,
  to: number,
  timeZone: string,
): number | null {
  if (range === "mtd") return 1;
  if (range === "ytd") return 12;
  if (
    startOfZonedMonth(from, timeZone) !== from ||
    startOfZonedMonth(to, timeZone) !== to
  ) {
    return null;
  }
  const start = zonedParts(from, timeZone);
  const end = zonedParts(to, timeZone);
  return (end.year - start.year) * 12 + end.month - start.month;
}
/**
 * The same number of whole months before or after the ones starting at
 * `from`, as a half-open range in the zone; null once it would start after
 * now.
 */
function shiftCalendarWindow(
  from: number,
  months: number,
  direction: "previous" | "next",
  timeZone: string,
  now: number,
): { from: number; to: number } | null {
  const start = addZonedInterval(
    from,
    "month",
    timeZone,
    direction === "previous" ? -months : months,
  );
  if (start >= now) return null;
  return {
    from: start,
    to: addZonedInterval(start, "month", timeZone, months),
  };
}
/**
 * The period before or after a range, for the date control's arrows:
 * calendar ranges step by whole months in the zone, the others by their
 * length in time.
 */
export function stepTimeWindow(
  range: RangePreset,
  window: { from: number; to: number; timeZone: string },
  direction: "previous" | "next",
  now = Date.now(),
): { from: number; to: number } | null {
  const months = calendarStepMonths(
    range,
    window.from,
    window.to,
    window.timeZone,
  );
  return months === null
    ? shiftTimeWindow(window.from, window.to, direction, now)
    : shiftCalendarWindow(window.from, months, direction, window.timeZone, now);
}
export function shiftTimeWindow(
  from: number,
  to: number,
  direction: "previous" | "next",
  now = Date.now(),
): { from: number; to: number } | null {
  const normalizedFrom = Math.max(0, Math.floor(from));
  const normalizedTo = Math.max(normalizedFrom + 1, Math.floor(to));
  const span = Math.max(1, normalizedTo - normalizedFrom);

  if (direction === "previous") {
    const previousTo = Math.max(normalizedFrom - 1, 0);
    const previousFrom = Math.max(previousTo - span, 0);
    if (previousFrom >= previousTo) return null;
    return {
      from: previousFrom,
      to: previousTo,
    };
  }

  const currentNow = Math.max(1, Math.floor(now));
  if (normalizedTo >= currentNow) return null;

  const nextFromCandidate = normalizedTo + 1;
  const nextToCandidate = nextFromCandidate + span;
  const nextTo = Math.min(nextToCandidate, currentNow);
  const nextFrom = Math.max(0, nextTo - span);

  if (nextFrom >= nextTo) return null;
  if (nextFrom === normalizedFrom && nextTo === normalizedTo) return null;

  return {
    from: nextFrom,
    to: nextTo,
  };
}
