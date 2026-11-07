// Visit duration counts only the time the page was visible, as in Plausible.
// `hidden_ms` holds the hidden stretches the visitor came back from; a visit
// that ends while hidden stops counting at the moment it was hidden.

export function engagedDurationMs(input: {
  startedAt: number;
  endAt: number;
  hiddenAt: number | null;
  hiddenMs: number;
}): number {
  const visibleUntil =
    input.hiddenAt === null
      ? input.endAt
      : Math.min(input.endAt, Math.max(input.hiddenAt, input.startedAt));
  return Math.max(0, visibleUntil - input.startedAt - input.hiddenMs);
}

/**
 * `engagedDurationMs` for a buffered_visits row, ending at a bound time that
 * is bound twice. SQLite's multi-argument MAX is NULL when hidden_at is.
 */
export const ENGAGED_DURATION_AT_SQL =
  "MAX(0, MIN(?, COALESCE(MAX(hidden_at, started_at), ?)) - started_at - hidden_ms)";
