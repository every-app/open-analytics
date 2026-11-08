import {
  D1_FLUSH_INTERVAL_MS,
  HIDDEN_LEAVE_GRACE_MS,
  VISIT_TIMEOUT_MS,
} from "./constants";
import type { SqlReader } from "./types";

/**
 * When the alarm runs next: a flush interval from now while a buffered row
 * waits for D1, else when the next page view's time is up, else never.
 */
export function nextAlarmAt(
  context: Pick<SqlReader, "sqlOne">,
  now: number,
): number | null {
  if (hasPendingWrites(context)) return now + D1_FLUSH_INTERVAL_MS;
  return nextVisitDeadline(context);
}

/**
 * Whether a dirty page view, or a dirty custom event whose page view the
 * buffer holds, waits for D1. An event without its page view waits for
 * that.
 */
function hasPendingWrites(context: Pick<SqlReader, "sqlOne">): boolean {
  const row = context.sqlOne<{ pending: number }>(`
    SELECT
      EXISTS (SELECT 1 FROM buffered_visits WHERE dirty = 1)
      OR EXISTS (
        SELECT 1
        FROM buffered_custom_events e
        WHERE e.dirty = 1
          AND EXISTS (
            SELECT 1
            FROM buffered_visits v
            WHERE v.visit_id = e.visit_id AND v.site_id = e.site_id
          )
      ) AS pending
  `);
  return row?.pending === 1;
}

/**
 * The earliest time a page view finishes on its own: an open one at the
 * visit timeout after its last activity, a hidden one when the hidden grace
 * ends (the visit timeout if its hidden time is unknown).
 */
function nextVisitDeadline(context: Pick<SqlReader, "sqlOne">): number | null {
  const row = context.sqlOne<{ deadline: number | null }>(`
    SELECT MIN(deadline) AS deadline
    FROM (
      SELECT MIN(last_activity_at) + ${VISIT_TIMEOUT_MS} AS deadline
      FROM buffered_visits
      WHERE status = 'open'
      UNION ALL
      SELECT MIN(last_activity_at) + ${VISIT_TIMEOUT_MS}
      FROM buffered_visits
      WHERE status = 'hidden_pending' AND hidden_at IS NULL
      UNION ALL
      SELECT MIN(hidden_at) + ${HIDDEN_LEAVE_GRACE_MS}
      FROM buffered_visits
      WHERE status = 'hidden_pending' AND hidden_at IS NOT NULL
    )
  `);
  return row?.deadline ?? null;
}
