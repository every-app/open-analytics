import { type ReactNode, useMemo } from "react";
import { SidebarTrigger } from "@insightflare/ui/sidebar";

import { AppShellLayout } from "@/components/app-shell-layout";
import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { DashboardHeaderControls } from "@/components/dashboard/shell/dashboard-header-controls";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import { useAccountTimeZonePreference } from "@/components/time-zone-provider";
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

function filterScopeFor(routeState: ShellRouteState): FilterScope | undefined {
  if (!routeState.siteSlug) return undefined;
  if (routeState.siteSection === "sessions") return "session";
  if (routeState.siteSection === "visitors") return "visitor";
  if (routeState.siteSection === "realtime") return undefined;
  return "event";
}

// Pages that fill the panel edge to edge: the map, the live view, and a
// session's or visitor's journey.
function isFullBleed(routeState: ShellRouteState): boolean {
  const { siteSection, siteSubSection } = routeState;
  return (
    siteSection === "realtime" ||
    siteSection === "geo" ||
    ((siteSection === "sessions" || siteSection === "visitors") &&
      siteSubSection === "detail")
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
  const contentClassName =
    section === "geo"
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
          · {siteNavLabel(section, messages)}
        </span>
      ) : null}
    </>
  ) : null;

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
            pathname={livePathname}
            routeState={routeState}
            sites={sites}
            activeSite={activeSite}
            canManage={canManage}
            unreadAttentionCount={unreadAttentionCount}
            user={user}
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
          routeState.usesDateRange ? (
            <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 md:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                {pageTitle}
              </div>
              <div className="min-w-0 shrink-0">
                <DashboardHeaderControls
                  locale={locale}
                  messages={messages}
                  siteId={activeSite?.id ?? ""}
                  resolvedScope={filterScopeFor(routeState)}
                  showControls
                  showFilterSheet={Boolean(routeState.siteSlug)}
                  comparisonDisabled={
                    section === "realtime" ||
                    section === "sessions" ||
                    section === "visitors"
                  }
                  filterDisabled={section === "realtime"}
                  showRealtimeBadge
                />
              </div>
            </div>
          ) : undefined
        }
        contentClassName={contentClassName}
        contentDataAttributes={{ "data-dashboard-content": "" }}
      >
        {children}
      </AppShellLayout>
    </DashboardQueryProvider>
  );
}
