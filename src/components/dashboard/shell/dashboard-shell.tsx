import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { SidebarTrigger } from "@insightflare/ui/sidebar";

import { AppShellLayout } from "@/components/app-shell-layout";
import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { DashboardHeaderControls } from "@/components/dashboard/shell/dashboard-header-controls";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import {
  parsePeopleView,
  PeopleView,
} from "@/components/dashboard/site-pages/common/detail-query-param";
import { useSiteHasData } from "@/components/dashboard/site-pages/common/use-site-has-data";
import { FirstViewsBanner } from "@/components/dashboard/site-pages/install/first-views-banner";
import { InstallScriptPage } from "@/components/dashboard/site-pages/install/install-script-page";
import { useAccountTimeZonePreference } from "@/components/time-zone-provider";
import { useLiveSearchParams } from "@/lib/dashboard/client/history";
import { buildSettingsPath, buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import {
  parseFilterDocumentFromSearchParams,
  type TimeWindow,
} from "@/lib/dashboard/query-state";
import { type TeamData } from "@/lib/dashboard-api/client/edge";
import {
  type FilterScope,
  parseFilterScopePreference,
} from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { usePathname, useSearchParams } from "@/lib/router";

import {
  parseShellRouteState,
  type ShellRouteState,
  type SidebarSite,
  siteNavItemFor,
  siteNavItemLabel,
  siteNavLabel,
  useDashboardNavHref,
} from "./dashboard-shell/navigation";
import { AppSidebar } from "./app-sidebar";
import { NavTabs } from "./nav-tabs";

interface DashboardShellProps {
  locale: Locale;
  pathname: string;
  messages: AppMessages;
  user: {
    name: string;
    email: string;
    systemRole: "admin" | "user";
    timeZone?: string;
  };
  /** The organization's workspace. */
  team: TeamData;
  gatewayUrl: string;
  sites: SidebarSite[];
  unreadAttentionCount?: number;
  initialQueryWindow?: TimeWindow;
  children: ReactNode;
}

function filterScopeFor(
  routeState: ShellRouteState,
  peopleView: PeopleView,
): FilterScope | undefined {
  if (!routeState.siteSlug) return undefined;
  if (routeState.siteSection === "visitors") {
    return peopleView === PeopleView.Sessions ? "session" : "visitor";
  }
  if (routeState.siteSection === "realtime") return undefined;
  return "event";
}

// Pages that fill the panel edge to edge: the map and the live view.
function isFullBleed(routeState: ShellRouteState): boolean {
  return (
    routeState.siteSection === "realtime" || routeState.siteSection === "geo"
  );
}

export function DashboardShell({
  locale,
  pathname,
  messages,
  user,
  team,
  gatewayUrl,
  sites,
  unreadAttentionCount = 0,
  initialQueryWindow,
  children,
}: DashboardShellProps) {
  useAccountTimeZonePreference(user.timeZone);
  const livePathname = usePathname() || pathname;
  const routeSearchParams = useSearchParams();
  const liveSearchParams = useLiveSearchParams();
  const initialFilters = parseFilterDocumentFromSearchParams(routeSearchParams);
  const initialScopePreference = parseFilterScopePreference(routeSearchParams);
  const canManage = canManageTeam(team.membershipRole, user.systemRole);
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
  const siteHasData = useSiteHasData(activeSite?.id);
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
  const navHref = useDashboardNavHref();
  const navItem = section ? siteNavItemFor(section) : undefined;
  // A sidebar entry with several pages shows them as tabs.
  const tabs =
    navItem && navItem.sections.length > 1 && routeState.siteSlug
      ? navItem.sections.map((key) => ({
          key,
          label: siteNavLabel(key, messages),
          href: navHref(
            buildSitePath(
              locale,
              routeState.siteSlug!,
              key === "overview" ? undefined : key,
            ),
          ),
          active: key === section,
        }))
      : null;
  const contentClassName = awaitingFirstView
    ? // The install view sits in the middle of the page.
      "flex min-w-0 w-full flex-1 flex-col px-4 py-4 md:px-6 md:py-6 [&>[data-page-transition]]:flex [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col [&>[data-page-transition]]:justify-center"
    : section === "geo"
      ? "flex min-h-0 flex-1 min-w-0 w-full flex-col md:overflow-hidden [&>[data-page-transition]]:flex [&>[data-page-transition]]:h-full [&>[data-page-transition]]:min-h-0 [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col"
      : routeState.orgPage === "settings"
        ? // Settings brings its own navigation column and page padding.
          "flex min-w-0 w-full flex-1 flex-col [&>[data-page-transition]]:flex [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col"
        : isFullBleed(routeState)
          ? "min-w-0 w-full"
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
          ·{" "}
          {navItem
            ? siteNavItemLabel(navItem, messages)
            : siteNavLabel(section, messages)}
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
      initialWindow={initialQueryWindow}
      initialFilters={initialFilters}
      initialScopePreference={initialScopePreference}
    >
      <AppShellLayout
        sidebar={
          <AppSidebar
            locale={locale}
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
            <Link
              href={`/${locale}/app`}
              className="ml-1 font-semibold text-foreground"
            >
              {messages.appName}
            </Link>
          </div>
        }
        header={
          showHeader ? (
            <>
              <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  {pageTitle}
                </div>
                <div className="min-w-0 shrink-0">
                  {awaitingFirstView ? null : (
                    <DashboardHeaderControls
                      locale={locale}
                      messages={messages}
                      siteId={activeSite?.id ?? ""}
                      resolvedScope={filterScopeFor(
                        routeState,
                        parsePeopleView(liveSearchParams),
                      )}
                      showDateControls={section !== "realtime"}
                      showComparison={
                        Boolean(routeState.siteSlug) &&
                        section !== "realtime" &&
                        section !== "visitors"
                      }
                      showFilter={
                        Boolean(routeState.siteSlug) && section !== "realtime"
                      }
                      realtimeHref={
                        routeState.siteSlug
                          ? buildSitePath(
                              locale,
                              routeState.siteSlug,
                              "realtime",
                            )
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
              {tabs ? (
                <NavTabs
                  label={messages.appNav.sections}
                  items={tabs}
                  className="border-b-0 px-4 md:px-6"
                />
              ) : null}
            </>
          ) : undefined
        }
        contentClassName={contentClassName}
        contentDataAttributes={{ "data-dashboard-content": "" }}
      >
        {awaitingFirstView ? (
          <InstallScriptPage messages={messages} siteId={activeSite.id} />
        ) : (
          <>
            {section === "overview" &&
            activeSite &&
            firstViewsSiteId === activeSite.id ? (
              <FirstViewsBanner
                messages={messages}
                reportsHref={
                  canManage
                    ? buildSettingsPath(locale, "notifications")
                    : undefined
                }
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
