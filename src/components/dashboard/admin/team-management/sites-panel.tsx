import { type ReactNode, useEffect, useRef, useState } from "react";
import { SiteTrafficStackChart } from "@insightflare/product-ui/charts";
import { TrafficPairBarChart } from "@insightflare/product-ui/charts";
import { Button } from "@insightflare/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  GlobeIcon,
  PlusIcon,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import {
  durationFormat,
  numberFormat,
  percentFormat,
} from "@/lib/dashboard/format";
import { buildSitePath } from "@/lib/dashboard/paths";
import Link from "@/lib/router";

import { useTeamManagementContext } from "./context";
import {
  changeRateClass,
  formatChangeRate,
  SITE_CARD_MAX_TREND_POINTS,
} from "./model";

function DeferredSiteChart({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[180px] w-full">
      {ready ? children : null}
    </div>
  );
}

export function TeamManagementSitesPanel() {
  const {
    aggregateChartRenderData,
    aggregateChartSites,
    canManageSites,
    dashboardQuery,
    dashboardSites,
    dashboardWindow,
    locale,
    isPageDataLoading,
    messages,
    openCreateSiteDialog,
    pagesPerSessionFormatter,
    siteDashboardCards,
  } = useTeamManagementContext();
  const getStartedCopy = messages.getStarted;

  function ChangeRateInline({
    value,
    lowerIsBetter = false,
  }: {
    value: number | null;
    lowerIsBetter?: boolean;
  }) {
    if (value === null) return null;
    const Icon = value >= 0 ? ArrowUpIcon : ArrowDownIcon;
    return (
      <span
        className={`inline-flex items-end gap-0.5 text-xs leading-none tabular-nums ${changeRateClass(value, lowerIsBetter)}`}
      >
        <Icon className="size-3.5" />
        {formatChangeRate(value)}
      </span>
    );
  }

  if (!isPageDataLoading && dashboardSites.length === 0) {
    return (
      <EmptyState
        media="rows"
        icon={GlobeIcon}
        title={getStartedCopy.noSitesTitle}
        description={getStartedCopy.noSitesDescription}
        action={
          canManageSites ? (
            <Button type="button" onClick={openCreateSiteDialog}>
              <PlusIcon data-icon="inline-start" />
              {getStartedCopy.addSite}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ChartColumnIcon className="size-4" />
            {messages.teamManagement.sites.aggregateTitle}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <SiteTrafficStackChart
              data={aggregateChartRenderData}
              sites={aggregateChartSites}
              from={dashboardWindow.from}
              to={dashboardWindow.to}
              locale={locale}
              timeZone={dashboardWindow.timeZone}
              interval={dashboardWindow.interval}
              viewsLabel={messages.common.views}
              visitorsLabel={messages.common.visitors}
              messages={messages}
              axisDateFormat="regular"
              loading={dashboardQuery.isFetching}
              className="h-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {siteDashboardCards.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {siteDashboardCards.map(
            ({ site, overview, pagesPerSession, changeRates, trend }) => (
              <Link
                key={site.id}
                href={buildSitePath(locale, site.slug)}
                className="group block h-full cursor-pointer rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`${messages.teamManagement.sites.openAnalytics}: ${site.name}`}
              >
                <Card className="h-full transition-colors group-hover:border-foreground/20">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="flex items-center gap-2 truncate text-base">
                            <SiteBrandIcon
                              siteId={site.id}
                              siteName={site.name}
                              domain={site.domain}
                              iconSrc={site.iconPath}
                              size="md"
                            />
                            {site.name}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {site.domain}
                          </CardDescription>
                        </div>
                      </div>
                      <span className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                        <ChevronRightIcon className="size-4" />
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <DeferredSiteChart>
                      <TrafficPairBarChart
                        data={trend}
                        locale={locale}
                        timeZone={dashboardWindow.timeZone}
                        interval={dashboardWindow.interval}
                        viewsLabel={messages.common.views}
                        visitorsLabel={messages.common.visitors}
                        axisDateFormat="compact"
                        maxPoints={SITE_CARD_MAX_TREND_POINTS}
                        loading={dashboardQuery.isFetching}
                        range={dashboardWindow}
                      />
                    </DeferredSiteChart>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.common.views}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {numberFormat(locale, overview.views)}
                          <ChangeRateInline value={changeRates.views} />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.common.visitors}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {numberFormat(locale, overview.visitors)}
                          <ChangeRateInline value={changeRates.visitors} />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.common.sessions}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {numberFormat(locale, overview.sessions)}
                          <ChangeRateInline value={changeRates.sessions} />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.common.bounceRate}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {percentFormat(locale, overview.bounceRate)}
                          <ChangeRateInline
                            value={changeRates.bounceRate}
                            lowerIsBetter
                          />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.teamManagement.sites.pagesPerSession}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {pagesPerSessionFormatter.format(pagesPerSession)}
                          <ChangeRateInline
                            value={changeRates.pagesPerSession}
                          />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">
                          {messages.common.avgDuration}
                        </p>
                        <p className="inline-flex items-end gap-1.5 text-base leading-none tabular-nums">
                          {durationFormat(locale, overview.avgDurationMs)}
                          <ChangeRateInline value={changeRates.avgDurationMs} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
