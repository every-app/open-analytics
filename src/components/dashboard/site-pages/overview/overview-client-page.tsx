import { useDashboardComparisonQuery } from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { useDashboardQuery } from "@/components/dashboard/shell/dashboard-query-provider";

import { useDashboardLoad } from "./dashboard-load";
import { GoalConversionsCard } from "./goal-conversions-card";
import { OverviewMetricsSection } from "./metrics";
import { PropertiesCard } from "./properties-card";
import { OverviewReportCards } from "./report-cards";
import { type OverviewClientPageProps } from "./types";

/**
 * The site's one dashboard, as in Plausible: the top stats and the graph of
 * the picked one, then the Sources, Pages, Locations and Devices cards, then
 * the goals' conversions beside the custom properties. Goals and properties
 * are private: a share page has neither.
 */
export function OverviewClientPage({
  locale,
  messages,
  siteId,
  siteDomain,
  goalsPath,
}: OverviewClientPageProps) {
  const { window, filters } = useDashboardQuery();
  // One request brings the top stats, the graph and the cards' top rows.
  const load = useDashboardLoad(
    siteId,
    window,
    filters,
    useDashboardComparisonQuery(window, filters) !== null,
  );

  return (
    <div className="space-y-6">
      <OverviewMetricsSection
        locale={locale}
        messages={messages}
        siteId={siteId}
        window={window}
        filters={filters}
        load={load}
      />
      <OverviewReportCards
        locale={locale}
        messages={messages}
        siteId={siteId}
        siteDomain={siteDomain}
        filters={filters}
        filtered={filters.conditions.length > 0}
        load={load}
      />
      {goalsPath ? (
        // Each card shows only when it has rows; one alone is full width.
        <section className="flex flex-col gap-6 *:min-w-0 xl:flex-row xl:*:flex-1">
          <GoalConversionsCard
            locale={locale}
            messages={messages}
            siteId={siteId}
            window={window}
            filters={filters}
            goalsPath={goalsPath}
          />
          <PropertiesCard
            locale={locale}
            messages={messages}
            siteId={siteId}
            window={window}
            filters={filters}
            filtered={filters.conditions.length > 0}
          />
        </section>
      ) : null}
    </div>
  );
}
