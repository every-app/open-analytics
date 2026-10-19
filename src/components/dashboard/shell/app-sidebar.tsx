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
import { InboxIcon, LayoutGridIcon, SettingsIcon } from "lucide-react";

import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { buildSettingsPath, buildSitePath } from "@/lib/dashboard/paths";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

import {
  type ShellRouteState,
  type SidebarSite,
  SITE_NAV_GROUPS,
  siteNavIcon,
  type SiteNavKey,
  siteNavLabel,
  useDashboardNavHref,
} from "./dashboard-shell/navigation";
import { AccountFooter } from "./account-footer";
import { SIDEBAR_NAV_BUTTON_CLASS, SidebarNavLink } from "./sidebar-nav";
import { SiteSwitcher } from "./site-switcher";

const GROUP_LABEL_CLASS =
  "h-7 uppercase tracking-wider text-sidebar-foreground/40";

/**
 * OpenSEO's sidebar: the wordmark and the site switcher, the site's pages
 * when one is open, the organization's pages, and the account menu.
 */
export function AppSidebar({
  locale,
  messages,
  pathname,
  routeState,
  sites,
  activeSite,
  canManage,
  unreadAttentionCount,
  user,
  gatewayUrl,
}: {
  locale: Locale;
  messages: AppMessages;
  pathname: string;
  routeState: ShellRouteState;
  sites: SidebarSite[];
  activeSite?: SidebarSite;
  canManage: boolean;
  unreadAttentionCount: number;
  user: { name: string; email: string };
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
      <SidebarHeader className="gap-0 px-3 pt-3 pb-1">
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
            {siteSlug
              ? SITE_NAV_GROUPS.map((group) => {
                  const items = group.items.filter(
                    (key) => key !== "settings" || canManage,
                  );
                  if (items.length === 0) return null;
                  return (
                    <SidebarGroup key={group.label} className="py-1">
                      <SidebarGroupLabel className={GROUP_LABEL_CLASS}>
                        {messages.appNav[group.label]}
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {items.map((key) => (
                            <SidebarNavLink
                              key={key}
                              href={siteItemHref(key)}
                              icon={siteNavIcon(key)}
                              label={siteNavLabel(key, messages)}
                              isActive={routeState.siteSection === key}
                              onNavigate={closeMobile}
                            />
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  );
                })
              : null}

            {siteSlug ? null : (
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

      <AccountFooter
        links={
          <>
            <SidebarNavLink
              href={navHref(`/${locale}/app`)}
              icon={LayoutGridIcon}
              label={messages.appNav.allSites}
              isActive={routeState.orgPage === "all-sites"}
              onNavigate={closeMobile}
            />
            <SidebarNavLink
              href={`/${locale}/app/inbox`}
              icon={InboxIcon}
              label={messages.appNav.inbox}
              isActive={routeState.orgPage === "inbox"}
              badge={unreadAttentionCount}
              onNavigate={closeMobile}
            />
            <SidebarNavLink
              href={buildSettingsPath(locale)}
              icon={SettingsIcon}
              label={messages.appNav.settings}
              isActive={routeState.orgPage === "settings"}
              onNavigate={closeMobile}
            />
          </>
        }
        locale={locale}
        messages={messages}
        pathname={pathname}
        user={user}
        gatewayUrl={gatewayUrl}
        onNavigate={closeMobile}
      />
    </Sidebar>
  );
}
