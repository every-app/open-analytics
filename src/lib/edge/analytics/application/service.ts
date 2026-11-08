import type { OperationResultCache } from "@/lib/edge/analytics/application/cache";
import { type OperationCachePolicy } from "@/lib/edge/analytics/application/cache";
import type {
  AnalyticsResult,
  CanonicalQuery,
  CanonicalResult,
  QueryInput,
  QueryOperation,
  QueryTime,
} from "@/lib/edge/analytics/contract";
import { ComparisonDomainError } from "@/lib/edge/analytics/contract/comparison";
import { InvalidCursorError } from "@/lib/pagination";

import { AnalyticsProviderDomainError } from "./errors";
import type { AnalyticsProviderRegistry } from "./provider-registry";
import type { TypedQueryProviderResult } from "./provider-registry";
import { validateTypedQueryInput } from "./query-validation";
export type { AnalyticsServiceError, AnalyticsServiceResult } from "./errors";
export interface QueryExecutionContext {
  readonly signal?: AbortSignal;
  readonly deadlineMs?: number;
  /** One request-scoped clock captured before provider execution. */
  readonly capturedAtMs?: number;
  readonly now?: () => number;
  /** Optional protocol-owned cache policy carried through the runtime boundary. */
  readonly cache?: {
    readonly key: string;
    readonly policy: OperationCachePolicy;
    readonly isCacheable?: (value: unknown) => boolean;
  };
  /** Optional cache instance supplied by a protocol adapter. */
  readonly cacheStore?: OperationResultCache;
  /** Optional low-cardinality hook; callers must not include query payloads. */
  readonly onEvent?: (event: AnalyticsQueryEvent) => void;
  /** Allows a protocol adapter to preserve its legacy provider-error mapping. */
  readonly onProviderError?: (error: unknown) => void;
  readonly operation?: string;
}
export interface AnalyticsQueryEvent {
  readonly operation: string;
  readonly phase: "start" | "success" | "cancelled" | "deadline" | "failure";
}
export type AnalyticsApplicationErrorHandler = (
  error: unknown,
  operation: string,
) => void;
/**
 * The only application invocation shape. Route, SSR, and protocol adapters
 * normalize their own inputs before creating this object.
 */
export interface TypedQueryOperationInvocation<
  Operation extends QueryOperation,
> {
  readonly kind: "typed-query";
  readonly operation: Operation;
  readonly query: CanonicalQuery<Operation>;
  readonly providerRegistry: AnalyticsProviderRegistry;
  readonly cache?: {
    readonly key: string;
    readonly policy: OperationCachePolicy;
    readonly isCacheable?: (value: CanonicalResult<Operation>) => boolean;
  };
}
type ExecutionFailure = {
  readonly ok: false;
  readonly error:
    | { readonly kind: "request-cancelled" }
    | { readonly kind: "deadline-exceeded" };
};
function executionDomainError(
  context: QueryExecutionContext,
): ExecutionFailure | null {
  if (context.signal?.aborted) {
    return { ok: false, error: { kind: "request-cancelled" } };
  }
  const now = context.now?.() ?? Date.now();
  if (typeof context.deadlineMs === "number" && now >= context.deadlineMs) {
    return { ok: false, error: { kind: "deadline-exceeded" } };
  }
  return null;
}
function emit(
  context: QueryExecutionContext,
  phase: AnalyticsQueryEvent["phase"],
): void {
  try {
    context.onEvent?.({
      operation: context.operation ?? "unknown",
      phase,
    });
  } catch {
    // Observability must never change query behavior.
  }
}
class UncacheableResult extends Error {
  constructor(readonly value: unknown) {
    super("analytics result must not enter cache");
  }
}
export class TypedQueryApplicationService {
  constructor(
    private readonly cache?: OperationResultCache,
    private readonly onApplicationError?: AnalyticsApplicationErrorHandler,
  ) {}

  private async executeTypedQuery<Operation extends QueryOperation>(
    invocation: TypedQueryOperationInvocation<Operation>,
    executionContext: QueryExecutionContext,
  ): Promise<AnalyticsResult<CanonicalResult<Operation>>> {
    emit(executionContext, "start");

    const before = executionDomainError(executionContext);
    if (before) {
      emit(
        executionContext,
        before.error.kind === "deadline-exceeded" ? "deadline" : "cancelled",
      );
      return before;
    }

    const validationError = validateTypedQueryInput(
      invocation.operation,
      invocation.query,
    );
    if (validationError) {
      emit(executionContext, "failure");
      return { ok: false, error: validationError };
    }
    const query: QueryInput = invocation.query;

    try {
      const provider = invocation.providerRegistry.resolve<Operation>(
        invocation.operation,
      );
      if (!provider) {
        emit(executionContext, "failure");
        return {
          ok: false,
          error: { kind: "internal", operation: invocation.operation },
        };
      }
      const load = async (): Promise<
        TypedQueryProviderResult<CanonicalResult<Operation>>
      > =>
        provider.execute(query as CanonicalQuery<Operation>, executionContext);
      let result: TypedQueryProviderResult<CanonicalResult<Operation>>;
      if (!invocation.cache || !this.cache) {
        result = await load();
      } else {
        try {
          result = (
            await this.cache.getOrLoad({
              key: invocation.cache.key,
              policy: invocation.cache.policy,
              load: async () => {
                const loaded = await load();
                if (!(invocation.cache?.isCacheable?.(loaded.value) ?? true)) {
                  throw new UncacheableResult(loaded);
                }
                return loaded;
              },
            })
          ).value;
        } catch (error) {
          if (!(error instanceof UncacheableResult)) throw error;
          result = error.value as TypedQueryProviderResult<
            CanonicalResult<Operation>
          >;
        }
      }
      const time =
        "time" in query
          ? (query as QueryInput & { readonly time: QueryTime }).time
          : "current" in query &&
              query.current &&
              typeof query.current === "object" &&
              "time" in query.current
            ? (query.current as { readonly time: QueryTime }).time
            : undefined;
      if (!time) {
        emit(executionContext, "failure");
        return {
          ok: false,
          error: { kind: "internal", operation: invocation.operation },
        };
      }
      const after = executionDomainError(executionContext);
      if (after) {
        emit(
          executionContext,
          after.error.kind === "deadline-exceeded" ? "deadline" : "cancelled",
        );
        return after;
      }
      emit(executionContext, "success");
      return {
        ok: true,
        data: result.value,
        meta: {
          time,
          source: result.source ?? "raw",
          approximateVisitors: Boolean(result.approximateVisitors),
        },
      };
    } catch (error) {
      try {
        executionContext.onProviderError?.(error);
      } catch {
        // Error reporting must never change query behavior.
      }
      try {
        this.onApplicationError?.(error, invocation.operation);
      } catch {
        // Application error reporting must never change query behavior.
      }
      const executionFailure = executionDomainError(executionContext);
      if (executionFailure) {
        emit(
          executionContext,
          executionFailure.error.kind === "deadline-exceeded"
            ? "deadline"
            : "cancelled",
        );
        return executionFailure;
      }
      emit(executionContext, "failure");
      if (error instanceof ComparisonDomainError) {
        return { ok: false, error: error.domainError };
      }
      if (error instanceof AnalyticsProviderDomainError) {
        return { ok: false, error: error.domainError };
      }
      if (error instanceof InvalidCursorError) {
        return {
          ok: false,
          error: { kind: "invalid-cursor", cursorKind: error.cursorKind },
        };
      }
      return {
        ok: false,
        error: { kind: "internal", operation: invocation.operation },
      };
    }
  }

  /**
   * Executes a registered canonical query. Providers receive only the
   * normalized query object, never HTTP/auth objects or route DTOs.
   */
  async execute<Operation extends QueryOperation>(
    invocation: TypedQueryOperationInvocation<Operation>,
    executionContext: QueryExecutionContext = {},
  ): Promise<AnalyticsResult<CanonicalResult<Operation>>> {
    return this.executeTypedQuery(invocation, executionContext);
  }
}
