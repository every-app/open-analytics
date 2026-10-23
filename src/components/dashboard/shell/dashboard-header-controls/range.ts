import { type DateRange } from "react-day-picker";

import { zonedParts } from "@/lib/analytics/time-zone";
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
// Rolling ranges end now, so there is no next period to move to.
export const ROLLING_RANGE_PRESETS = new Set<RangePreset>([
  "7d",
  "30d",
  "90d",
  "12m",
]);
/** The presets the date control lists, before Custom range. */
export const RANGE_PRESET_OPTIONS = RANGE_PRESETS.filter(
  (preset) => preset !== "custom",
);
const RANGE_LABEL_KEYS: Record<RangePreset, keyof AppMessages["ranges"]> = {
  today: "today",
  yesterday: "yesterday",
  "7d": "last7d",
  "30d": "last30d",
  "90d": "last90d",
  "12m": "last12m",
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
export function toDateRange(
  from: number | undefined,
  to: number | undefined,
  timeZone: string,
): DateRange | undefined {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return undefined;
  const fromDate = toCalendarDate(from as number, timeZone);
  const toDate = toCalendarDate(to as number, timeZone);
  if (!fromDate || !toDate) return undefined;
  return {
    from: fromDate,
    to: toDate,
  };
}
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
  return `${formatter.format(new Date(from as number))} - ${formatter.format(new Date(to as number))}`;
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
