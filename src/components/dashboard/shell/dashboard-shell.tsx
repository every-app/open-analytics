import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { SidebarTrigger } from "@insightflare/ui/sidebar";

import { AppShellLayout } from "@/components/app-shell-layout";
import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { LoadFailedContent } from "@/components/dashboard/common/table-states";
import { FilterPills } from "@/components/dashboard/filters/filter-pills";
import { DashboardHeaderControls } from "@/components/dashboard/shell/dashboard-header-controls";
import { RealtimeActiveBadge } from "@/components/dashboard/shell/dashboard-header-controls/realtime-badge";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import { useSiteTracking } from "@/components/dashboard/site-pages/common/use-site-tracking";
import { FirstViewsBanner } from "@/components/dashboard/site-pages/install/first-views-banner";
import { InstallScriptPage } from "@/components/dashboard/site-pages/install/install-script-page";
import { useAccountTimeZonePreference } from "@/components/time-zone-provider";
import { buildSettingsPath, buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import {
  parseFilterDocumentFromSearchParams,
  type TimeWindow,
} from "@/lib/dashboard/query-state";
import { type TeamData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { usePathname, useSearchParams } from "@/lib/router";

import {
  parseShellRouteState,
  type SidebarSite,
  siteNavLabel,
} from "./dashboard-shell/navigation";
import { AppSidebar } from "./app-sidebar";

interface DashboardShellProps {
  locale: Locale;
  pathname: string;
  messages: AppMessages;
  user: {
    name: string;
    email: string;
    timeZone?: string;
  };
  /** The organization's workspace. */
  team: TeamData;
  gatewayUrl: string;
  sites: SidebarSite[];
  /** The organization's first page view, where All time on All sites starts. */
  firstDataAt: number | null;
  unreadAttentionCount?: number;
  initialQueryWindow?: TimeWindow;
  children: ReactNode;
}

export function DashboardShell({
  locale,
  pathname,
  messages,
  user,
  team,
  gatewayUrl,
  sites,
  firstDataAt,
  unreadAttentionCount = 0,
  initialQueryWindow,
  children,
}: DashboardShellProps) {
  useAccountTimeZonePreference(user.timeZone);
  const livePathname = usePathname() || pathname;
  const routeSearchParams = useSearchParams();
  const initialFilters = parseFilterDocumentFromSearchParams(routeSearchParams);
  const canManage = canManageTeam(team.membershipRole);
  const routeState = useMemo(
    () => parseShellRouteState(livePathname),
    [livePathname],
  );
  const activeSite = routeState.siteSlug
    ? sites.find(
        (site) =>
          site.slug === routeState.siteSlug || site.id === routeState.siteSlug,
      )
    : undefined;
  const section = routeState.siteSection;
  const siteTracking = useSiteTracking(activeSite?.id);
  const siteHasData = siteTracking.data?.hasData;
  // A site page waits for the site's tracking state: it decides between the
  // install view and the reports, and where All time starts. If it can't be
  // read, the page says so and offers to try again.
  const awaitingSiteTracking =
    activeSite !== undefined &&
    section !== undefined &&
    section !== "settings" &&
    siteTracking.data === undefined;
  // Until a site's first page view, its report pages show only how to
  // install the script; Site settings stays open.
  const awaitingFirstView =
    activeSite !== undefined &&
    section !== undefined &&
    section !== "settings" &&
    siteHasData === false;
  // The site whose first page views arrived while this page was open, until
  // its banner is dismissed.
  const [firstViewsSiteId, setFirstViewsSiteId] = useState<string>();
  const previousAwaiting = useRef({
    siteId: activeSite?.id,
    awaitingFirstView,
  });
  useEffect(() => {
    const previous = previousAwaiting.current;
    if (
      previous.siteId === activeSite?.id &&
      previous.awaitingFirstView &&
      siteHasData === true
    ) {
      setFirstViewsSiteId(activeSite?.id);
    }
    previousAwaiting.current = { siteId: activeSite?.id, awaitingFirstView };
  }, [activeSite?.id, awaitingFirstView, siteHasData]);
  const contentClassName = awaitingFirstView
    ? // The install view sits in the middle of the page.
      "flex min-w-0 w-full flex-1 flex-col px-4 py-4 md:px-6 md:py-6 [&>[data-page-transition]]:flex [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col [&>[data-page-transition]]:justify-center"
    : routeState.orgPage === "settings"
      ? // Settings brings its own navigation column and page padding.
        "flex min-w-0 w-full flex-1 flex-col [&>[data-page-transition]]:flex [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col"
      : section === "realtime"
        ? // The live view fills the panel edge to edge.
          "min-w-0 w-full"
        : "mx-auto min-w-0 w-full max-w-8xl px-4 py-4 md:px-6 md:py-6";

  const pageTitle = routeState.siteSlug ? (
    <>
      {activeSite ? (
        <SiteBrandIcon
          siteId={activeSite.id}
          siteName={activeSite.name}
          domain={activeSite.domain}
          iconSrc={activeSite.iconPath}
        />
      ) : null}
      <span className="truncate font-medium">
        {activeSite?.name ?? routeState.siteSlug}
      </span>
      {section ? (
        <span className="hidden truncate text-muted-foreground sm:inline">
          · {siteNavLabel(section, messages)}
        </span>
      ) : null}
    </>
  ) : null;

  // Home before the first site has no period to pick, so no header at all.
  const showHeader =
    routeState.usesDateRange &&
    !(routeState.orgPage === "all-sites" && sites.length === 0);

  return (
    <DashboardQueryProvider
      scopeKey={activeSite?.id ?? ""}
      dataStart={
        routeState.siteSlug ? siteTracking.data?.firstDataAt : firstDataAt
      }
      initialWindow={initialQueryWindow}
      initialFilters={initialFilters}
    >
      <AppShellLayout
        sidebar={
          <AppSidebar
            messages={messages}
            routeState={routeState}
            sites={sites}
            activeSite={activeSite}
            canManage={canManage}
            unreadAttentionCount={unreadAttentionCount}
            gatewayUrl={gatewayUrl}
          />
        }
        mobileTopBar={
          <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-2 py-1.5 md:hidden">
            <SidebarTrigger aria-label={messages.appNav.toggleSidebar} />
            <Link href="/" className="ml-1 font-semibold text-foreground">
              {messages.appName}
            </Link>
          </div>
        }
        header={
          showHeader ? (
            <>
              {/* One row: the controls keep their size, compact below lg, and
                  the title takes what is left. */}
              <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  {pageTitle}
                </div>
                {awaitingSiteTracking || awaitingFirstView ? null : (
                  <div className="flex shrink-0 items-center gap-1.5 lg:gap-2">
                    {activeSite && routeState.siteSlug ? (
                      <RealtimeActiveBadge
                        siteId={activeSite.id}
                        href={buildSitePath(routeState.siteSlug, "realtime")}
                        messages={messages}
                      />
                    ) : null}
                    <DashboardHeaderControls
                      locale={locale}
                      messages={messages}
                      siteId={activeSite?.id ?? ""}
                      showDateControls={section !== "realtime"}
                      showComparison={
                        Boolean(routeState.siteSlug) && section !== "realtime"
                      }
                      showFilter={
                        Boolean(routeState.siteSlug) && section !== "realtime"
                      }
                    />
                  </div>
                )}
              </div>
              {routeState.siteSlug &&
              section !== "realtime" &&
              !awaitingSiteTracking &&
              !awaitingFirstView ? (
                <FilterPills
                  locale={locale}
                  messages={messages}
                  className="px-4 pb-2.5 md:px-6"
                />
              ) : null}
            </>
          ) : undefined
        }
        contentClassName={contentClassName}
        contentDataAttributes={{ "data-dashboard-content": "" }}
      >
        {awaitingSiteTracking ? (
          siteTracking.failed ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-destructive">
              <LoadFailedContent
                messages={messages}
                onRetry={siteTracking.retry}
              />
            </div>
          ) : null
        ) : awaitingFirstView ? (
          <InstallScriptPage messages={messages} siteId={activeSite.id} />
        ) : (
          <>
            {section === "overview" &&
            activeSite &&
            firstViewsSiteId === activeSite.id ? (
              <FirstViewsBanner
                messages={messages}
                reportsHref={buildSettingsPath("notifications")}
                inviteHref={
                  canManage
                    ? `${gatewayUrl.replace(/\/$/, "")}/admin/users`
                    : undefined
                }
                onDismiss={() => setFirstViewsSiteId(undefined)}
              />
            ) : null}
            {children}
          </>
        )}
      </AppShellLayout>
    </DashboardQueryProvider>
  );
}
