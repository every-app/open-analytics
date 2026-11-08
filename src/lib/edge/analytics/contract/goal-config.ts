import { currencyCode } from "@/lib/currency";
import {
  FILTER_DSL_MAX_LENGTH,
  type FilterDocument,
  parseFilterDsl,
} from "@/lib/filter-contract";
import {
  analyticsFilterRegistry,
  matchesOnlyCustomEvents,
} from "@/lib/filter-contract/filter-registry";
import {
  assertFilterAudience,
  filterFingerprint,
} from "@/lib/filter-contract/filters";
import { sha256Hex } from "@/lib/sha256";

export const GOAL_CONFIG_VERSION = 1 as const;
export const GOAL_FILTER_DSL_VERSION = 1 as const;

export interface GoalConfigV1 {
  readonly filterDslVersion: typeof GOAL_FILTER_DSL_VERSION;
  /** Exact user-authored DSL. Validation must never rewrite this value. */
  readonly filterDsl: string;
  /**
   * An upper-case ISO 4217 code. The goal then sums the revenue of the
   * custom events it matched in this currency; other currencies aren't
   * converted or counted. Only a goal that matches custom events alone has
   * one.
   */
  readonly currency?: string;
}

export interface EncodedGoalConfig {
  readonly configVersion: typeof GOAL_CONFIG_VERSION;
  readonly configJson: string;
}

export class GoalConfigDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalConfigDecodeError";
  }
}

export class GoalConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoalConfigValidationError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const REQUIRED_CONFIG_KEYS = ["filterDslVersion", "filterDsl"] as const;
const CONFIG_KEYS = [...REQUIRED_CONFIG_KEYS, "currency"] as const;

function configKeys(value: Record<string, unknown>): boolean {
  return (
    REQUIRED_CONFIG_KEYS.every((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    ) &&
    Object.keys(value).every((key) =>
      (CONFIG_KEYS as readonly string[]).includes(key),
    )
  );
}

function configFields(value: unknown): GoalConfigV1 {
  const root = record(value);
  return {
    filterDslVersion:
      root?.filterDslVersion as GoalConfigV1["filterDslVersion"],
    filterDsl: root?.filterDsl as string,
    ...(root?.currency === undefined
      ? {}
      : { currency: root.currency as string }),
  };
}

function parseAndAssertGoalFilter(filterDsl: string): FilterDocument {
  const document = parseFilterDsl(filterDsl, analyticsFilterRegistry);
  assertFilterAudience(document, analyticsFilterRegistry, "private-dashboard");
  return document;
}

function decodeV1(value: unknown): GoalConfigV1 {
  const root = record(value);
  if (
    !root ||
    !configKeys(root) ||
    root.filterDslVersion !== GOAL_FILTER_DSL_VERSION ||
    typeof root.filterDsl !== "string"
  ) {
    throw new GoalConfigDecodeError("goal_v1_config_invalid");
  }

  try {
    return validateGoalConfigForWrite(configFields(root));
  } catch (error) {
    throw new GoalConfigDecodeError(
      error instanceof GoalConfigValidationError
        ? error.message
        : "goal_v1_config_invalid",
    );
  }
}

/** Decode a stored Goal config using its storage config version. */
export function decodeGoalConfig(version: number, json: string): GoalConfigV1 {
  if (!Number.isSafeInteger(version)) {
    throw new GoalConfigDecodeError("goal_config_version_invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new GoalConfigDecodeError("goal_config_json_invalid");
  }

  if (version === GOAL_CONFIG_VERSION) return decodeV1(parsed);
  throw new GoalConfigDecodeError(`goal_config_version_unknown:${version}`);
}

/** Validate a Goal config for a new or updated definition write. */
export function validateGoalConfigForWrite(config: GoalConfigV1): GoalConfigV1 {
  const root = record(config);
  if (!root || !configKeys(root)) {
    throw new GoalConfigValidationError("goal_config_invalid");
  }
  if (root.filterDslVersion !== GOAL_FILTER_DSL_VERSION) {
    throw new GoalConfigValidationError("goal_filter_dsl_version_invalid");
  }
  if (
    typeof root.filterDsl !== "string" ||
    !root.filterDsl.trim() ||
    root.filterDsl.length > FILTER_DSL_MAX_LENGTH
  ) {
    throw new GoalConfigValidationError("goal_filter_dsl_invalid");
  }

  let document: FilterDocument;
  try {
    document = parseAndAssertGoalFilter(root.filterDsl);
  } catch {
    throw new GoalConfigValidationError("goal_filter_dsl_invalid");
  }

  if (root.currency === undefined) {
    return {
      filterDslVersion: GOAL_FILTER_DSL_VERSION,
      filterDsl: root.filterDsl,
    };
  }
  const currency = currencyCode(root.currency);
  if (currency === null) {
    throw new GoalConfigValidationError("goal_currency_invalid");
  }
  if (!matchesOnlyCustomEvents(document)) {
    throw new GoalConfigValidationError("goal_currency_requires_event_goal");
  }
  return {
    filterDslVersion: GOAL_FILTER_DSL_VERSION,
    filterDsl: root.filterDsl,
    currency,
  };
}

export function encodeGoalConfig(config: GoalConfigV1): EncodedGoalConfig {
  const validated = validateGoalConfigForWrite(config);
  return {
    configVersion: GOAL_CONFIG_VERSION,
    configJson: JSON.stringify(validated),
  };
}

export function parseGoalFilter(config: GoalConfigV1): FilterDocument {
  const validated = validateGoalConfigForWrite(configFields(config));
  return parseAndAssertGoalFilter(validated.filterDsl);
}

function semanticPayload(config: GoalConfigV1): string {
  return JSON.stringify({
    configVersion: GOAL_CONFIG_VERSION,
    filterDslVersion: config.filterDslVersion,
    filter: filterFingerprint(parseGoalFilter(config), analyticsFilterRegistry),
    ...(config.currency === undefined ? {} : { currency: config.currency }),
  });
}

/** Backend-computed Goal semantics; definition display metadata is absent. */
export async function goalSemanticFingerprint(
  config: GoalConfigV1,
): Promise<string> {
  const validated = validateGoalConfigForWrite(configFields(config));
  return `goal-v${GOAL_CONFIG_VERSION}:${await sha256Hex(semanticPayload(validated))}`;
}
