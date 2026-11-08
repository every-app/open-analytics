import { parseFilterParams } from "@/lib/filter-contract/filter-codec";
import { analyticsFilterRegistry } from "@/lib/filter-contract/filter-registry";
import {
  assertFilterAudience,
  type FilterDocument,
} from "@/lib/filter-contract/filters";

import type { QueryAudience } from "./types";

export class FilterAdapterError extends Error {
  readonly audience: QueryAudience;

  constructor(audience: QueryAudience, cause: unknown) {
    super(cause instanceof Error ? cause.message : "Invalid filter input.");
    this.name = "FilterAdapterError";
    this.audience = audience;
    this.cause = cause;
  }
}

/**
 * The filter of a dashboard request's `filter[...]` parameters. A field the
 * audience may not filter by fails before D1 is read.
 */
export function parseFilterUrlForAudience(
  audience: QueryAudience,
  input: string | URL | URLSearchParams,
): FilterDocument {
  try {
    const document = parseFilterParams(input, analyticsFilterRegistry);
    assertFilterAudience(document, analyticsFilterRegistry, audience);
    return document;
  } catch (error) {
    throw new FilterAdapterError(audience, error);
  }
}
