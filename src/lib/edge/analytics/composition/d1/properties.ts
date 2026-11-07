/** D1 composition of the custom property breakdown's operations. */
import {
  type AnalyticsProviderRegistry,
  typedQueryProviderFor,
} from "@/lib/edge/analytics/application/provider-registry";
import {
  queryPropertyKeysFromD1,
  queryPropertyValuesFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/properties";

import { type D1SiteRuntimeBindings, timeWindow } from "./shared";

export function registerPropertyProviders(
  registry: AnalyticsProviderRegistry,
  options: D1SiteRuntimeBindings,
): void {
  registry
    .register(
      "property-keys",
      typedQueryProviderFor("property-keys", async (input) => ({
        value: {
          items: await queryPropertyKeysFromD1(
            options.env,
            options.siteId,
            timeWindow(input.time),
            input.filters,
            input.limit,
          ),
        },
      })),
    )
    .register(
      "property-values",
      typedQueryProviderFor("property-values", async (input) => ({
        value: {
          key: input.key,
          items: await queryPropertyValuesFromD1(
            options.env,
            options.siteId,
            timeWindow(input.time),
            input.filters,
            input.key,
            input.search,
            input.sort,
            input.limit,
          ),
        },
      })),
    );
}
