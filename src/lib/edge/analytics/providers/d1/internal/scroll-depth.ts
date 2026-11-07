/**
 * Plausible's scroll depth, as a SELECT: each visitor's deepest scroll on
 * each page, averaged over those visitors and rounded to a whole percent.
 * Page views without a depth don't count, so a group with none has a NULL
 * depth. Without `groupBy` it is one row for all of `from`.
 */
export function scrollDepthSql({
  from,
  visitor,
  depth,
  groupBy,
}: {
  /** The page views, with a `pathname` column. */
  readonly from: string;
  readonly visitor: string;
  readonly depth: string;
  /** What each depth is for, such as the page or a time bucket. */
  readonly groupBy?: { readonly sql: string; readonly as: string };
}): string {
  const key = groupBy ? `${groupBy.as}, ` : "";
  return `SELECT ${key}ROUND(avg(visitor_depth)) AS scrollDepth
FROM (
  SELECT ${groupBy ? `${groupBy.sql} AS ${groupBy.as}, ` : ""}MAX(${depth}) AS visitor_depth
  FROM ${from}
  WHERE ${depth} IS NOT NULL
  GROUP BY ${key}${visitor}, pathname
)${groupBy ? `\nGROUP BY ${groupBy.as}` : ""}`;
}

/**
 * Where a page without a depth sorts: below every depth, including 0, so a
 * keyset cursor can hold it as a number.
 */
export const NO_SCROLL_DEPTH_RANK = -1;

export function scrollDepthOf(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}
