import { AnalyticsProviderRegistry } from "@/lib/edge/analytics/application/provider-registry";
import { createAnalyticsQueryRuntime } from "@/lib/edge/analytics/composition/query-runtime";
import { createD1ReadDiagnostics } from "@/lib/edge/analytics/providers/d1/internal/diagnostics";
import { createOverviewReader } from "@/lib/edge/analytics/providers/d1/operations/overview-reader";

import { dashboardProvider } from "./dashboard";
import { registerEventProviders } from "./events";
import { registerFunnelProvider } from "./funnels";
import { registerGoalProviders } from "./goals";
import { overviewProvider, trendProvider } from "./overview";
import { registerPropertyProviders } from "./properties";
import type { D1SiteRuntimeBindings } from "./shared";
import { registerSiteContractProviders } from "./site";

export type { D1ReadDiagnostics } from "@/lib/edge/analytics/providers/d1/internal/diagnostics";

/**
 * Compose the D1 implementation for the canonical site overview operations.
 * Audience policy and filter authorization are validated by the application
 * service before the provider is invoked.
 */
export function createD1SiteProviderRegistry(options: D1SiteRuntimeBindings) {
  const diagnostics = options.diagnostics ?? createD1ReadDiagnostics();
  const reader = createOverviewReader(options.env, options.siteId, diagnostics);
  const registry = new AnalyticsProviderRegistry()
    .register("overview", overviewProvider(reader))
    .register("trend", trendProvider(reader))
    .register("dashboard", dashboardProvider(options, diagnostics));
  registerSiteContractProviders(registry, options);
  registerEventProviders(registry, options);
  registerFunnelProvider(registry, options);
  registerGoalProviders(registry, options);
  registerPropertyProviders(registry, options);

  return registry;
}

export function createD1SiteQueryRuntime(options: D1SiteRuntimeBindings) {
  return createAnalyticsQueryRuntime(createD1SiteProviderRegistry(options));
}
