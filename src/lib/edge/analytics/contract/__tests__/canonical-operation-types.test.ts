import { describe, expect, it } from "vitest";

import type {
  AnalyticsProviderRegistry,
  TypedQueryProvider,
} from "@/lib/edge/analytics/application/provider-registry";
import type { AnalyticsQueryExecutor } from "@/lib/edge/analytics/composition/query-runtime";
import type {
  AnalyticsResult,
  BreakdownResult,
  CanonicalQuery,
  CanonicalResult,
} from "@/lib/edge/analytics/contract";

declare const executor: AnalyticsQueryExecutor;
declare const registry: AnalyticsProviderRegistry;
declare const overviewQuery: CanonicalQuery<"overview">;
declare const breakdownProvider: TypedQueryProvider<
  "dimension",
  BreakdownResult
>;
declare const nestedComparisonProvider: TypedQueryProvider<
  "comparison",
  AnalyticsResult<CanonicalResult<"comparison">>
>;

function assertCanonicalOperationTypes() {
  // @ts-expect-error An overview query cannot execute the dimension operation.
  void executor.execute("dimension", overviewQuery);
  // @ts-expect-error A Dimension provider cannot be registered as Channels.
  registry.register("channels", breakdownProvider);
  // @ts-expect-error Canonical providers return values, not AnalyticsResult envelopes.
  registry.register("comparison", nestedComparisonProvider);
}
void assertCanonicalOperationTypes;

describe("canonical operation type mapping", () => {
  it("keeps operation query and provider result types coupled", () => {
    expect(true).toBe(true);
  });
});
