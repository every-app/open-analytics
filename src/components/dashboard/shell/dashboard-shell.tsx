import { type ReactNode, useMemo } from "react";
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@insightflare/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@insightflare/ui/sidebar";
import { VerticalScrollMask } from "@insightflare/ui/vertical-scroll-mask";
import { RiArrowLeftLine } from "@remixicon/react";

import { AppShellLayout } from "@/components/app-shell-layout";
import { AppSidebarBrand } from "@/components/app-sidebar-brand";
import { AnalyticsTabs } from "@/components/dashboard/common/analytics-tabs";
import { DashboardHeaderControls } from "@/components/dashboard/shell/dashboard-header-controls";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import { SidebarFooterMenus } from "@/components/dashboard/shell/sidebar-footer-menus";
import { SidebarMenuStage } from "@/components/dashboard/shell/sidebar-menu-stage";
import { SidebarSiteDetails } from "@/components/dashboard/shell/sidebar-site-details";
import { useAccountTimeZonePreference } from "@/components/time-zone-provider";
import { buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import {
  parseFilterDocumentFromSearchParams,
  type TimeWindow,
} from "@/lib/dashboard/query-state";
import { buildTeamSections } from "@/lib/dashboard/team-sections";
import { type TeamData } from "@/lib/dashboard-api/client/edge";
import {
  type FilterScope,
  parseFilterScopePreference,
} from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { usePathname, useSearchParams } from "@/lib/router";

import type {
  AnalyticsNavKey,
  SidebarSite,
  TeamSectionNavItem,
} from "./dashboard-shell/navigation";
import {
  analyticsTabLabel,
  getManagementSectionIcon,
  getTeamSectionIcon,
  normalizeLocalePath,
  parseSidebarRouteState,
  SIDEBAR_COLLAPSE_MARGIN_CLASS,
  SIDEBAR_COLLAPSE_SEPARATOR_CLASS,
  VALID_ANALYTICS_SECTIONS,
} from "./dashboard-shell/navigation";
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
  managementSections?: TeamSectionNavItem[];
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
  unreadAttentionCount = 0,
  managementSections,
  initialQueryWindow,
  children,
}: DashboardShellProps) {
  useAccountTimeZonePreference(user.timeZone);
  const livePathname = usePathname() || pathname;
  const routeSearchParams = useSearchParams();
  const initialFilters = parseFilterDocumentFromSearchParams(routeSearchParams);
  const initialScopePreference = parseFilterScopePreference(routeSearchParams);
  const canManage = canManageTeam(team.membershipRole, user.systemRole);
  const teamSections = useMemo(
    () => buildTeamSections(locale, messages, canManage),
    [canManage, locale, messages],
  );
  const routeState = useMemo(
    () => parseSidebarRouteState(livePathname),
    [livePathname],
  );
  const mainSiteSection = routeState.siteSection || "";
  const mainSiteSubSection = routeState.siteSubSection || "";

  const currentAnalyticsSection =
    routeState.mode === "site" && VALID_ANALYTICS_SECTIONS.has(mainSiteSection)
      ? mainSiteSection
      : undefined;
  const hasManagementSections = Boolean(
    managementSections && managementSections.length > 0,
  );
  const resolvedActiveSiteSlug = routeState.activeSiteSlug || "";
  const hasActiveSite =
    routeState.mode === "site" && resolvedActiveSiteSlug.length > 0;
  const dashboardFilterResolvedScope: FilterScope | undefined =
    currentAnalyticsSection === "sessions"
      ? "session"
      : currentAnalyticsSection === "visitors"
        ? "visitor"
        : currentAnalyticsSection === "realtime"
          ? undefined
          : hasActiveSite
            ? "event"
            : undefined;
  const activeSiteBase = hasActiveSite
    ? buildSitePath(locale, resolvedActiveSiteSlug)
    : null;

  const analyticsSections = useMemo<
    Array<{
      key: AnalyticsNavKey;
      href: string;
      label?: string;
      queryKey?: string;
      queryValue?: string;
      queryDefault?: boolean;
    }>
  >(
    () =>
      hasActiveSite && activeSiteBase
        ? [
            { key: "overview", href: activeSiteBase },
            { key: "realtime", href: `${activeSiteBase}/realtime` },
            { key: "pages", href: `${activeSiteBase}/pages` },
            { key: "referrers", href: `${activeSiteBase}/referrers` },
            { key: "campaigns", href: `${activeSiteBase}/campaigns` },
            { key: "sessions", href: `${activeSiteBase}/sessions` },
            { key: "visitors", href: `${activeSiteBase}/visitors` },
            { key: "events", href: `${activeSiteBase}/events` },
            { key: "funnels", href: `${activeSiteBase}/funnels` },
            { key: "goals", href: `${activeSiteBase}/goals` },
            { key: "retention", href: `${activeSiteBase}/retention` },
            { key: "geo", href: `${activeSiteBase}/geo` },
            { key: "devices", href: `${activeSiteBase}/devices` },
            { key: "browsers", href: `${activeSiteBase}/browsers` },
            { key: "performance", href: `${activeSiteBase}/performance` },
            ...(canManage
              ? [
                  {
                    key: "settings" as const,
                    href: `${activeSiteBase}/settings`,
                  },
                ]
              : []),
          ]
        : [],
    [activeSiteBase, canManage, hasActiveSite],
  );
  const localeSuffix = normalizeLocalePath(livePathname);
  const switchToEn = `/en${localeSuffix}`;
  const switchToZh = `/zh${localeSuffix}`;
  const switchToZhTw = `/zh-tw${localeSuffix}`;
  const switchToJa = `/ja${localeSuffix}`;
  const accountHref = `/${locale}/app/account`;
  const notificationsHref = `/${locale}/app/inbox`;
  const teamRootHref = `/${locale}/app`;
  const backToTeamLabel = messages.common.backToTeam;
  const activeTeamName = messages.appName;
  const activeSite = hasActiveSite
    ? sites.find((site) => site.slug === resolvedActiveSiteSlug)
    : undefined;
  const activeSiteName = activeSite?.name || resolvedActiveSiteSlug;
  const activeSiteId = activeSite?.id || "";
  const isRealtimeRoute = Boolean(
    hasActiveSite && activeSiteBase && mainSiteSection === "realtime",
  );
  const isComparisonDisabledRoute = [
    "realtime",
    "sessions",
    "visitors",
  ].includes(mainSiteSection);
  const isRequestObservationRoute =
    routeState.activeManagementSectionKey === "request-observation";
  const topbarSections = analyticsSections;
  const isGeoRoute = Boolean(
    hasActiveSite && activeSiteBase && mainSiteSection === "geo",
  );
  const isSessionDetailRoute = Boolean(
    hasActiveSite &&
    activeSiteBase &&
    mainSiteSection === "sessions" &&
    mainSiteSubSection === "detail",
  );
  const isVisitorDetailRoute = Boolean(
    hasActiveSite &&
    activeSiteBase &&
    mainSiteSection === "visitors" &&
    mainSiteSubSection === "detail",
  );
  const contentContainerClassName = isGeoRoute
    ? "flex min-h-0 flex-1 min-w-0 w-full flex-col md:overflow-hidden [&>[data-page-transition]]:flex [&>[data-page-transition]]:h-full [&>[data-page-transition]]:min-h-0 [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col"
    : isRealtimeRoute || isSessionDetailRoute || isVisitorDetailRoute
      ? "min-w-0 w-full"
      : "mx-auto min-w-0 w-full max-w-[1400px] p-4 md:p-6";
  const mobileCurrentLevelName = hasActiveSite
    ? activeSiteName
    : activeTeamName;
  const sidebarLabels = useMemo(
    () => ({
      views: messages.common.views,
      visitors: messages.common.visitors,
    }),
    [messages.common.visitors, messages.common.views],
  );

  return (
    <DashboardQueryProvider
      scopeKey={activeSiteId}
      initialWindow={initialQueryWindow}
      initialFilters={initialFilters}
      initialScopePreference={initialScopePreference}
    >
      <AppShellLayout
        sidebar={
          <Sidebar variant="inset" collapsible="icon">
            <SidebarHeader>
              <AppSidebarBrand href={teamRootHref} appName={messages.appName} />
            </SidebarHeader>

            <div className="shrink-0">
              {routeState.mode === "site" ? (
                <>
                  <SidebarGroup>
                    <SidebarGroupContent>
                      <SidebarMenu
                        className={`mb-2 ${SIDEBAR_COLLAPSE_MARGIN_CLASS}`}
                      >
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href={teamRootHref}>
                              <RiArrowLeftLine />
                              <span>{backToTeamLabel}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>

                  <SidebarSeparator
                    className={`!mx-2 !w-auto ${SIDEBAR_COLLAPSE_SEPARATOR_CLASS}`}
                  />
                </>
              ) : null}
            </div>

            <VerticalScrollMask
              className="min-h-0 flex-1"
              contentClassName="flex min-h-0 flex-col"
              maskClassName="from-sidebar via-sidebar/80 to-transparent"
              syncKey={`${routeState.mode}:${sites.length}`}
            >
              <SidebarContent className="flex-none overflow-hidden">
                <SidebarMenuStage
                  mode={routeState.mode}
                  storageKey="open-analytics-sidebar-mode"
                >
                  {routeState.mode === "team" ? (
                    <>
                      <SidebarGroup>
                        <SidebarGroupLabel>
                          {messages.appName}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {teamSections.map((item) => {
                              const isActive =
                                routeState.activeTeamSectionKey === item.key;
                              const SectionIcon = getTeamSectionIcon(item.key);
                              return (
                                <SidebarMenuItem key={item.key}>
                                  <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                  >
                                    <Link href={item.href}>
                                      <SectionIcon />
                                      <span>{item.label}</span>
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>

                      {hasManagementSections ? (
                        <>
                          <SidebarSeparator
                            className={SIDEBAR_COLLAPSE_SEPARATOR_CLASS}
                          />
                          <SidebarGroup>
                            <SidebarGroupLabel>
                              {messages.common.management}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                              <SidebarMenu>
                                {managementSections?.map((item) => {
                                  const isActive =
                                    routeState.activeManagementSectionKey ===
                                    item.key;
                                  const SectionIcon = getManagementSectionIcon(
                                    item.key,
                                  );
                                  return (
                                    <SidebarMenuItem key={item.key}>
                                      <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                      >
                                        <Link href={item.href}>
                                          <SectionIcon />
                                          <span>{item.label}</span>
                                        </Link>
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  );
                                })}
                              </SidebarMenu>
                            </SidebarGroupContent>
                          </SidebarGroup>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <SidebarGroup>
                      <SidebarGroupLabel>
                        {messages.common.site}
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarSiteDetails
                          locale={locale}
                          teamId={team.id}
                          activeSiteSlug={resolvedActiveSiteSlug}
                          currentSection={currentAnalyticsSection}
                          sites={sites}
                          loading={false}
                          loadingLabel={messages.common.loading}
                          labels={sidebarLabels}
                        />
                      </SidebarGroupContent>
                    </SidebarGroup>
                  )}
                </SidebarMenuStage>
              </SidebarContent>
            </VerticalScrollMask>

            <SidebarFooter className="!m-0 !gap-0 !p-0">
              <SidebarFooterMenus
                locale={locale}
                user={user}
                gatewayUrl={gatewayUrl}
                switchToEn={switchToEn}
                switchToZh={switchToZh}
                switchToZhTw={switchToZhTw}
                switchToJa={switchToJa}
                accountHref={accountHref}
                notificationsHref={notificationsHref}
                unreadAttentionCount={unreadAttentionCount}
                messages={messages}
              />
            </SidebarFooter>
          </Sidebar>
        }
        header={
          <>
            <div className="p-3">
              <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger />
                <div className="min-w-0 flex-1">
                  <Breadcrumb className="md:hidden">
                    <BreadcrumbList className="flex-nowrap">
                      <BreadcrumbItem className="min-w-0">
                        <BreadcrumbPage className="block truncate">
                          {mobileCurrentLevelName}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>

                  <Breadcrumb className="hidden md:block">
                    <BreadcrumbList className="flex-nowrap">
                      <BreadcrumbItem className="min-w-0">
                        {hasActiveSite ? (
                          <BreadcrumbLink asChild>
                            <Link
                              href={teamRootHref}
                              className="block max-w-[28vw] truncate"
                            >
                              {activeTeamName}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="block max-w-[28vw] truncate">
                            {activeTeamName}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>

                      {hasActiveSite ? (
                        <>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem className="min-w-0">
                            <BreadcrumbPage className="block max-w-[28vw] truncate">
                              {activeSiteName}
                            </BreadcrumbPage>
                          </BreadcrumbItem>
                        </>
                      ) : null}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
                <div className="ml-auto min-w-0">
                  <DashboardHeaderControls
                    locale={locale}
                    messages={messages}
                    siteId={activeSiteId}
                    resolvedScope={dashboardFilterResolvedScope}
                    showControls={!isRequestObservationRoute}
                    showFilterSheet={hasActiveSite}
                    comparisonDisabled={
                      hasActiveSite && isComparisonDisabledRoute
                    }
                    filterDisabled={isRealtimeRoute}
                    showRealtimeBadge
                  />
                </div>
              </div>
            </div>

            <AutoResizer className="px-3" duration={0.24}>
              <AutoTransition
                type="slideDown"
                duration={0.2}
                initial={false}
                presenceMode="sync"
              >
                {topbarSections.length > 0 ? (
                  <div key="analytics-tabs">
                    <AnalyticsTabs
                      items={topbarSections.map((item) => ({
                        key: item.key,
                        href: item.href,
                        label: analyticsTabLabel(item, messages),
                        queryKey: item.queryKey,
                        queryValue: item.queryValue,
                        queryDefault: item.queryDefault,
                      }))}
                    />
                  </div>
                ) : (
                  <div key="analytics-tabs-empty" className="h-0" aria-hidden />
                )}
              </AutoTransition>
            </AutoResizer>
          </>
        }
        contentClassName={contentContainerClassName}
        contentDataAttributes={{ "data-dashboard-content": "" }}
      >
        {children}
      </AppShellLayout>
    </DashboardQueryProvider>
  );
}
