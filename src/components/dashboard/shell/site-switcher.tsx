import { Button } from "@insightflare/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LayoutGridIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";

import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { buildSettingsPath, buildSitePath } from "@/lib/dashboard/paths";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { cn } from "@/lib/utils";

import type { SidebarSite, SiteNavKey } from "./dashboard-shell/navigation";

/**
 * The site the sidebar's pages belong to, and the way to another: each site
 * opens on the page you're on, all sites on the organization's dashboard.
 */
export function SiteSwitcher({
  locale,
  messages,
  sites,
  activeSite,
  activeSection,
  canManage,
  navHref,
  onNavigate,
}: {
  locale: Locale;
  messages: AppMessages;
  sites: SidebarSite[];
  activeSite?: SidebarSite;
  activeSection?: SiteNavKey;
  canManage: boolean;
  navHref: (path: string) => string;
  onNavigate: () => void;
}) {
  // Detail pages belong to the old site; the section's own page stays.
  const section =
    activeSection && activeSection !== "overview" ? activeSection : undefined;
  const allSitesHref = navHref(`/${locale}/app`);

  return (
    <div className="flex items-stretch rounded-lg border border-sidebar-border bg-card">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={messages.appNav.switchSite}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
            activeSite && canManage ? "rounded-l-lg" : "rounded-lg",
          )}
        >
          {activeSite ? (
            <SiteBrandIcon
              siteId={activeSite.id}
              siteName={activeSite.name}
              domain={activeSite.domain}
              iconSrc={activeSite.iconPath}
            />
          ) : (
            <LayoutGridIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {activeSite?.name ?? messages.appNav.allSites}
            </span>
            {activeSite?.domain ? (
              <span className="truncate text-xs text-muted-foreground">
                {activeSite.domain}
              </span>
            ) : null}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        >
          <DropdownMenuItem asChild>
            <Link href={allSitesHref} onClick={onNavigate}>
              <LayoutGridIcon />
              <span className="flex-1">{messages.appNav.allSites}</span>
              {activeSite ? null : <CheckIcon className="ml-auto" />}
            </Link>
          </DropdownMenuItem>
          {sites.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="max-h-[min(60vh,21rem)] overflow-y-auto">
                {sites.map((site) => (
                  <DropdownMenuItem key={site.id} asChild>
                    <Link
                      href={navHref(buildSitePath(locale, site.slug, section))}
                      onClick={onNavigate}
                    >
                      <SiteBrandIcon
                        siteId={site.id}
                        siteName={site.name}
                        domain={site.domain}
                        iconSrc={site.iconPath}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{site.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {site.domain}
                        </span>
                      </span>
                      {site.id === activeSite?.id ? (
                        <CheckIcon className="ml-auto" />
                      ) : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          ) : null}
          {canManage ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={buildSettingsPath(locale, "sites")}
                  onClick={onNavigate}
                >
                  <PlusIcon />
                  <span>{messages.appNav.addSite}</span>
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {activeSite && canManage ? (
        <Button
          asChild
          variant="ghost"
          className="h-auto w-10 self-stretch rounded-l-none border-0 border-l border-sidebar-border"
        >
          <Link
            href={buildSitePath(locale, activeSite.slug, "settings")}
            aria-label={messages.appNav.siteSettings}
            title={messages.appNav.siteSettings}
            onClick={onNavigate}
          >
            <SettingsIcon className="size-4" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
