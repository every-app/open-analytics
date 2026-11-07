import { useMemo } from "react";

import { useDashboardQuery } from "@/components/dashboard/shell/dashboard-query-provider";
import { resolveFilterScope } from "@/lib/edge/analytics/contract/scoped-filter";
import { attachFilterScopePreference } from "@/lib/filter-contract";

import { GoalConversionsCard } from "./goal-conversions-card";
import { OverviewMetricsSection } from "./metrics";
import { OverviewReportCards } from "./report-cards";
import { type OverviewClientPageProps } from "./types";

/**
 * The site's one dashboard, as in Plausible: the top stats and the graph of
 * the picked one, then the Sources, Pages, Locations and Devices cards, then
 * the goals' conversions.
 */
export function OverviewClientPage({
  locale,
  messages,
  siteId,
  siteDomain,
  goalsPath,
}: OverviewClientPageProps) {
  const { window, filters, scopePreference } = useDashboardQuery();
  const resolvedScope = resolveFilterScope("overview", scopePreference);
  // Auto scope is resolved once for the dashboard and passed to every
  // request; the address stays Auto.
  const requestFilters = useMemo(
    () =>
      resolvedScope
        ? attachFilterScopePreference(filters, resolvedScope)
        : filters,
    [filters, resolvedScope],
  );

  return (
    <div className="space-y-6">
      <OverviewMetricsSection
        locale={locale}
        messages={messages}
        siteId={siteId}
        window={window}
        filters={requestFilters}
      />
      <OverviewReportCards
        locale={locale}
        messages={messages}
        siteId={siteId}
        siteDomain={siteDomain}
        filters={requestFilters}
        filtered={Boolean(filters.root)}
        resolvedScope={resolvedScope ?? undefined}
      />
      {goalsPath ? (
        <GoalConversionsCard
          locale={locale}
          messages={messages}
          siteId={siteId}
          window={window}
          filters={filters}
          goalsPath={goalsPath}
        />
      ) : null}
    </div>
  );
}
