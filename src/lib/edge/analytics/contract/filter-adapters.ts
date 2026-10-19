import {
  type FilterCodecOptions,
  parseFilterParams,
} from "@/lib/filter-contract/filter-codec";
import { analyticsFilterRegistry } from "@/lib/filter-contract/filter-registry";
import {
  assertFilterAudience,
  type FilterDocument,
} from "@/lib/filter-contract/filters";
import {
  attachFilterScopePreference,
  parseFilterScopePreference,
} from "@/lib/filter-contract/scope-preference";

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

function fromUrl(
  audience: QueryAudience,
  input: string | URL | URLSearchParams,
  options?: FilterCodecOptions,
): FilterDocument {
  try {
    const document = parseFilterParams(input, analyticsFilterRegistry, options);
    assertFilterAudience(document, analyticsFilterRegistry, audience);
    return attachFilterScopePreference(
      document,
      parseFilterScopePreference(input),
    );
  } catch (error) {
    throw new FilterAdapterError(audience, error);
  }
}

/** Private dashboard protocol adapter. */
export function parsePrivateFilterUrl(
  input: string | URL | URLSearchParams,
  options?: FilterCodecOptions,
): FilterDocument {
  return fromUrl("private-dashboard", input, options);
}

/** Public sharing protocol adapter. Sensitive fields fail closed before D1 access. */
export function parsePublicFilterUrl(
  input: string | URL | URLSearchParams,
  options?: FilterCodecOptions,
): FilterDocument {
  return fromUrl("public-share", input, options);
}

/** Selects one of the protocol adapters from the already-authorized audience. */
export function parseFilterUrlForAudience(
  audience: QueryAudience,
  input: string | URL | URLSearchParams,
  options?: FilterCodecOptions,
): FilterDocument {
  if (audience === "public-share") return parsePublicFilterUrl(input, options);
  return parsePrivateFilterUrl(input, options);
}
