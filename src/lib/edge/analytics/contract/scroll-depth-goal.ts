import {
  analyticsFilterRegistry,
  FILTER_DOCUMENT_VERSION,
  type FilterCondition,
  type FilterDocument,
  type FilterExpression,
  type FilterFieldId,
  filterFingerprint,
  type FilterOperator,
  formatFilterDsl,
  parseFilterDsl,
} from "@/lib/filter-contract";

/**
 * A scroll depth goal, as Plausible's goal form has it: visitors who scrolled
 * at least `threshold` percent down a page whose path matches `pagePath`.
 * In the path, `*` matches any characters, slashes included, and the rest
 * matches literally. An empty path means every page.
 */
export interface ScrollDepthGoal {
  readonly threshold: number;
  readonly pagePath: string;
}

export const SCROLL_DEPTH_THRESHOLD_MIN = 1;
export const SCROLL_DEPTH_THRESHOLD_MAX = 100;

export enum ScrollDepthGoalError {
  ThresholdInvalid = "scroll_depth_threshold_invalid",
  /**
   * A path the filter's string operators can't match exactly: two or more
   * `*`, other than one at each end.
   */
  PathWildcardUnsupported = "scroll_depth_path_wildcard_unsupported",
}

export class ScrollDepthGoalValidationError extends Error {
  constructor(readonly code: ScrollDepthGoalError) {
    super(code);
    this.name = "ScrollDepthGoalValidationError";
  }
}

const WILDCARD = "*";
const PAGE_PATH = "page.path" as FilterFieldId;
const SCROLL_DEPTH = "page.scrollDepth" as FilterFieldId;

function condition(
  field: FilterFieldId,
  operator: FilterOperator,
  value: FilterCondition["value"],
): FilterCondition {
  return {
    kind: "condition",
    target: { kind: "field", field },
    operator,
    value,
  };
}

function isThreshold(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= SCROLL_DEPTH_THRESHOLD_MIN &&
    (value as number) <= SCROLL_DEPTH_THRESHOLD_MAX
  );
}

/**
 * The paths that start with `prefix` and end with `suffix` only because the
 * two overlap, e.g. `/blog/comments` for `/blog/` and `/comments`. They
 * leave no room for the `*` between them, so `prefix*suffix` misses them.
 */
function overlapPaths(prefix: string, suffix: string): string[] {
  const paths: string[] = [];
  for (
    let overlap = Math.min(prefix.length, suffix.length);
    overlap > 0;
    overlap -= 1
  ) {
    if (prefix.endsWith(suffix.slice(0, overlap))) {
      paths.push(prefix + suffix.slice(overlap));
    }
  }
  return paths;
}

/**
 * The page.path conditions that match exactly the paths `pagePath` does, or
 * null when the filter's string operators can't.
 */
function pathConditions(pagePath: string): FilterCondition[] | null {
  const pattern = pagePath.trim().replace(/\*+/g, WILDCARD);
  if (pattern === "" || pattern === WILDCARD) return [];
  const parts = pattern.split(WILDCARD);
  if (parts.length === 1) return [condition(PAGE_PATH, "eq", pattern)];
  const [prefix, middle, suffix] = parts as [string, string, string?];
  if (parts.length === 2) {
    if (middle === "") return [condition(PAGE_PATH, "startsWith", prefix)];
    if (prefix === "") return [condition(PAGE_PATH, "endsWith", middle)];
    const overlaps = overlapPaths(prefix, middle);
    return [
      condition(PAGE_PATH, "startsWith", prefix),
      condition(PAGE_PATH, "endsWith", middle),
      ...(overlaps.length > 0 ? [condition(PAGE_PATH, "notIn", overlaps)] : []),
    ];
  }
  if (parts.length === 3 && prefix === "" && suffix === "") {
    return [condition(PAGE_PATH, "contains", middle)];
  }
  return null;
}

function filterOf(conditions: readonly FilterCondition[]): FilterDocument {
  return {
    version: FILTER_DOCUMENT_VERSION,
    root:
      conditions.length === 1
        ? conditions[0]!
        : { kind: "and", children: conditions },
  };
}

/**
 * The goal's filter: its page path conditions and `page.scrollDepth gte`
 * its threshold, which all apply to the same page view.
 */
export function scrollDepthGoalFilter(goal: ScrollDepthGoal): FilterDocument {
  if (!isThreshold(goal.threshold)) {
    throw new ScrollDepthGoalValidationError(
      ScrollDepthGoalError.ThresholdInvalid,
    );
  }
  const path = pathConditions(goal.pagePath);
  if (!path) {
    throw new ScrollDepthGoalValidationError(
      ScrollDepthGoalError.PathWildcardUnsupported,
    );
  }
  return filterOf([...path, condition(SCROLL_DEPTH, "gte", goal.threshold)]);
}

export function scrollDepthGoalFilterDsl(goal: ScrollDepthGoal): string {
  return formatFilterDsl(scrollDepthGoalFilter(goal));
}

function fieldCondition(
  expression: FilterExpression,
  field: FilterFieldId,
  operator: FilterOperator,
): FilterCondition | undefined {
  return expression.kind === "condition" &&
    expression.target.kind === "field" &&
    expression.target.field === field &&
    expression.operator === operator
    ? expression
    : undefined;
}

function conjuncts(root: FilterExpression | null): readonly FilterExpression[] {
  return !root ? [] : root.kind === "and" ? root.children : [root];
}

/** The conditions' fingerprints, in a stable order. */
function conjunctFingerprints(
  expressions: readonly FilterExpression[],
): string {
  return expressions
    .map((child) =>
      filterFingerprint(
        { version: FILTER_DOCUMENT_VERSION, root: child },
        analyticsFilterRegistry,
      ),
    )
    .sort()
    .join("\n");
}

/**
 * The scroll depth goal a filter is, or null for any other filter. It is
 * one when the filter is exactly what `scrollDepthGoalFilter` builds for
 * some goal, in any order.
 */
export function scrollDepthGoalFromFilter(
  document: FilterDocument,
): ScrollDepthGoal | null {
  const children = conjuncts(document.root);
  const pathValue = (operator: FilterOperator) => {
    const value = children
      .map((child) => fieldCondition(child, PAGE_PATH, operator))
      .find(Boolean)?.value;
    return typeof value === "string" ? value : undefined;
  };
  const threshold = children
    .map((child) => fieldCondition(child, SCROLL_DEPTH, "gte"))
    .find(Boolean)?.value;
  if (!isThreshold(threshold)) return null;

  const exact = pathValue("eq");
  const contains = pathValue("contains");
  const prefix = pathValue("startsWith");
  const suffix = pathValue("endsWith");
  const pagePath =
    exact ??
    (contains !== undefined
      ? `${WILDCARD}${contains}${WILDCARD}`
      : prefix === undefined && suffix === undefined
        ? ""
        : `${prefix ?? ""}${WILDCARD}${suffix ?? ""}`);
  const path = pathConditions(pagePath);
  return path &&
    conjunctFingerprints([
      ...path,
      condition(SCROLL_DEPTH, "gte", threshold),
    ]) === conjunctFingerprints(children)
    ? { threshold, pagePath }
    : null;
}

/** The scroll depth goal a saved goal's filter DSL is, or null. */
export function scrollDepthGoalFromDsl(
  filterDsl: string,
): ScrollDepthGoal | null {
  return scrollDepthGoalFromFilter(
    parseFilterDsl(filterDsl, analyticsFilterRegistry),
  );
}
