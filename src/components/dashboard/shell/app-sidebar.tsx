import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@insightflare/ui/sidebar";
import { VerticalScrollMask } from "@insightflare/ui/vertical-scroll-mask";
import { BellIcon, ChevronLeftIcon } from "lucide-react";

import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { buildSitePath } from "@/lib/dashboard/paths";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

import {
  type ShellRouteState,
  type SidebarSite,
  siteNavItemFor,
  siteNavItemIcon,
  siteNavItemLabel,
  siteNavItemsFor,
  type SiteNavKey,
  useDashboardNavHref,
} from "./dashboard-shell/navigation";
import { SidebarFootLinks } from "./sidebar-foot-links";
import { SIDEBAR_NAV_BUTTON_CLASS, SidebarNavLink } from "./sidebar-nav";
import { SiteSwitcher } from "./site-switcher";

const GROUP_LABEL_CLASS =
  "h-7 uppercase tracking-wider text-sidebar-foreground/40";

/**
 * The sidebar: the way back to Every App, the wordmark and the site
 * switcher, the site's pages when one is open or the list of sites otherwise
 * (none before the first site), then Settings.
 */
export function AppSidebar({
  locale,
  messages,
  routeState,
  sites,
  activeSite,
  canManage,
  unreadAttentionCount,
  gatewayUrl,
}: {
  locale: Locale;
  messages: AppMessages;
  routeState: ShellRouteState;
  sites: SidebarSite[];
  activeSite?: SidebarSite;
  canManage: boolean;
  unreadAttentionCount: number;
  gatewayUrl: string;
}) {
  const { setOpenMobile } = useSidebar();
  const closeMobile = () => setOpenMobile(false);
  const navHref = useDashboardNavHref();
  const siteSlug = activeSite?.slug ?? routeState.siteSlug;

  const siteItemHref = (key: SiteNavKey) =>
    siteSlug
      ? key === "settings"
        ? buildSitePath(locale, siteSlug, "settings")
        : navHref(
            buildSitePath(
              locale,
              siteSlug,
              key === "overview" ? undefined : key,
            ),
          )
      : "";

  return (
    <Sidebar variant="inset" collapsible="offcanvas" className="md:!p-0">
      <SidebarHeader className="gap-0 px-3 pt-2 pb-1">
        {/* The way back up, first in the sidebar as in every Every App app. */}
        <a
          href={gatewayUrl}
          aria-label={messages.sidebarHeader.backToEveryApp}
          className="mb-1 inline-flex h-7 w-fit items-center gap-0.5 rounded-md pl-0.5 pr-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          <span>{messages.sidebarHeader.everyApp}</span>
        </a>
        <Link
          href={`/${locale}/app`}
          onClick={closeMobile}
          className="px-1 pb-2 text-base font-semibold text-sidebar-foreground"
        >
          {messages.appName}
        </Link>
        <SiteSwitcher
          locale={locale}
          messages={messages}
          sites={sites}
          activeSite={activeSite}
          activeSection={routeState.siteSection}
          canManage={canManage}
          navHref={navHref}
          onNavigate={closeMobile}
        />
      </SidebarHeader>

      <VerticalScrollMask
        className="min-h-0 flex-1"
        contentClassName="flex min-h-0 flex-col"
        maskClassName="from-sidebar via-sidebar/80 to-transparent"
        syncKey={`${siteSlug ?? ""}:${sites.length}`}
      >
        <SidebarContent className="flex-none">
          <nav aria-label={messages.appNav.mainNavigation}>
            <SidebarGroup className="py-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarNavLink
                    href={`/${locale}/app/inbox`}
                    icon={BellIcon}
                    label={messages.appNav.inbox}
                    isActive={routeState.orgPage === "inbox"}
                    badge={unreadAttentionCount}
                    onNavigate={closeMobile}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {siteSlug ? (
              <SidebarGroup className="py-1">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {siteNavItemsFor(canManage).map((item) => (
                      <SidebarNavLink
                        key={item.key}
                        href={siteItemHref(item.sections[0])}
                        icon={siteNavItemIcon(item)}
                        label={siteNavItemLabel(item, messages)}
                        isActive={
                          routeState.siteSection !== undefined &&
                          siteNavItemFor(routeState.siteSection) === item
                        }
                        onNavigate={closeMobile}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : null}

            {siteSlug || sites.length === 0 ? null : (
              <SidebarGroup className="py-1">
                <SidebarGroupLabel className={GROUP_LABEL_CLASS}>
                  {messages.appNav.sites}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sites.map((site) => (
                      <SidebarMenuItem key={site.id}>
                        <SidebarMenuButton
                          asChild
                          className={SIDEBAR_NAV_BUTTON_CLASS}
                        >
                          <Link
                            href={navHref(buildSitePath(locale, site.slug))}
                            onClick={closeMobile}
                          >
                            <SiteBrandIcon
                              siteId={site.id}
                              siteName={site.name}
                              domain={site.domain}
                              iconSrc={site.iconPath}
                            />
                            <span>{site.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </nav>
        </SidebarContent>
      </VerticalScrollMask>

      <SidebarFootLinks
        locale={locale}
        messages={messages}
        settingsActive={routeState.orgPage === "settings"}
        onNavigate={closeMobile}
      />
    </Sidebar>
  );
}
