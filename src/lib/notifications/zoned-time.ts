/** A wall-clock reading of `date` in `timeZone`. */
export function partsInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const hour = Number(parts.get("hour") ?? 0);
  return {
    year: Number(parts.get("year") ?? 1970),
    month: Number(parts.get("month") ?? 1),
    day: Number(parts.get("day") ?? 1),
    hour: hour === 24 ? 0 : hour,
    minute: Number(parts.get("minute") ?? 0),
    second: Number(parts.get("second") ?? 0),
  };
}

function timezoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = partsInTimezone(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - utcMs;
}

/**
 * The instant a wall-clock time happens in `timeZone`. Out-of-range days and
 * months roll over, as Date.UTC's do.
 */
export function zonedTimeToUtcMs(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string;
}): number {
  const localAsUtc = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
  );
  const firstGuess = localAsUtc - timezoneOffsetMs(localAsUtc, input.timeZone);
  return localAsUtc - timezoneOffsetMs(firstGuess, input.timeZone);
}
