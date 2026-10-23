import { type ReactNode, useEffect, useRef, useState } from "react";
import { SiteTrafficStackChart } from "@insightflare/product-ui/charts";
import { TrafficPairBarChart } from "@insightflare/product-ui/charts";
import { Badge } from "@insightflare/ui/badge";
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
  ArrowUpRightIcon,
  ChartColumnIcon,
  ChevronRightIcon,
  SettingsIcon,
} from "lucide-react";

import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { useSiteHasData } from "@/components/dashboard/site-pages/common/use-site-has-data";
import {
  durationFormat,
  numberFormat,
  percentFormat,
} from "@/lib/dashboard/format";
import { buildSitePath } from "@/lib/dashboard/paths";
import { sharePath } from "@/lib/dashboard/share-path";
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
    <div ref={containerRef} className="relative h-[180px] w-full">
      {ready ? children : null}
    </div>
  );
}

/** A site's numbers, or that it's still waiting for its first page view. */
function SiteCardBody({
  siteId,
  waitingLabel,
  children,
}: {
  siteId: string;
  waitingLabel: string;
  children: ReactNode;
}) {
  if (useSiteHasData(siteId) === false) {
    return (
      <CardContent>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          {waitingLabel}
        </p>
      </CardContent>
    );
  }
  return <CardContent className="space-y-4">{children}</CardContent>;
}

export function TeamManagementSitesPanel() {
  const {
    aggregateChartRenderData,
    aggregateChartSites,
    canManageSites,
    dashboardQuery,
    dashboardWindow,
    locale,
    messages,
    pagesPerSessionFormatter,
    siteDashboardCards,
  } = useTeamManagementContext();
  const copy = messages.teamManagement.sites;

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

  // An all-zero total says nothing; each site's card says what it waits for.
  const hasViews = siteDashboardCards.some((card) => card.overview.views > 0);

  return (
    <div className="space-y-4">
      {hasViews ? (
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ChartColumnIcon className="size-4" />
              {copy.aggregateTitle}
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
      ) : null}

      {siteDashboardCards.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {siteDashboardCards.map(
            ({ site, overview, pagesPerSession, changeRates, trend }) => (
              // The site's name links the whole card; the public link and
              // site settings sit above it.
              <Card
                key={site.id}
                className="relative h-full transition-colors hover:border-foreground/20"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <SiteBrandIcon
                          siteId={site.id}
                          siteName={site.name}
                          domain={site.domain}
                          iconSrc={site.iconPath}
                          size="md"
                        />
                        <Link
                          href={buildSitePath(locale, site.slug)}
                          aria-label={`${copy.openAnalytics}: ${site.name}`}
                          className="truncate outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                        >
                          {site.name}
                        </Link>
                        {site.publicEnabled && site.publicSlug ? (
                          <Badge asChild variant="soft" className="relative">
                            <a
                              href={sharePath(locale, site.publicSlug)}
                              target="_blank"
                              rel="noreferrer"
                              title={copy.openPublic}
                            >
                              {copy.public}
                              <ArrowUpRightIcon data-icon="inline-end" />
                            </a>
                          </Badge>
                        ) : null}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {site.domain}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                      {canManageSites ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="relative"
                        >
                          <Link
                            href={buildSitePath(locale, site.slug, "settings")}
                            aria-label={`${messages.appNav.siteSettings}: ${site.name}`}
                            title={messages.appNav.siteSettings}
                          >
                            <SettingsIcon />
                          </Link>
                        </Button>
                      ) : null}
                      <ChevronRightIcon className="size-4" aria-hidden />
                    </div>
                  </div>
                </CardHeader>

                <SiteCardBody
                  siteId={site.id}
                  waitingLabel={messages.getStarted.waitingTitle}
                >
                  {/* Above the card's link, so the chart's tooltips work. */}
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
                        <ChangeRateInline value={changeRates.pagesPerSession} />
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
                </SiteCardBody>
              </Card>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
