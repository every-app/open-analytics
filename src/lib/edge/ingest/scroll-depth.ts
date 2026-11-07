import { coerceNumber } from "@/lib/edge/utils";

// A page view's scroll depth is the deepest the visitor scrolled, as a whole
// percent of the page. It is NULL until a payload reports one.

export function normalizeScrollDepth(value: unknown): number | null {
  const depth = coerceNumber(value);
  return depth === null ? null : Math.min(100, Math.max(0, Math.round(depth)));
}

/**
 * The deeper of a buffered_visits row's scroll depth and a reported one, which
 * is bound twice. SQLite's multi-argument MAX is NULL when either side is, so
 * each side falls back to the other.
 */
export const DEEPEST_SCROLL_DEPTH_SQL =
  "MAX(COALESCE(scroll_depth, ?), COALESCE(?, scroll_depth))";
