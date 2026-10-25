import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import { useRouteContext } from "@tanstack/react-router";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LayoutGridIcon,
  PlusIcon,
} from "lucide-react";

import { CreateSiteDialog } from "@/components/dashboard/admin/create-site-dialog";
import { SiteBrandIcon } from "@/components/dashboard/common/site-brand-icon";
import { buildSitePath } from "@/lib/dashboard/paths";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

import type { SidebarSite, SiteNavKey } from "./dashboard-shell/navigation";

/**
 * The site the sidebar's pages belong to, and the way to another: each site
 * opens on the page you're on, all sites on the organization's dashboard.
 * Anyone in the organization adds a site from here too.
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
  const { teamContext } = useRouteContext({ from: "/$locale/app" });
  const [createSiteOpen, setCreateSiteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={messages.appNav.switchSite}
          className="flex min-w-0 items-center gap-2 rounded-lg border border-sidebar-border bg-card px-3 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
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
            {activeSite?.domain && activeSite.domain !== activeSite.name ? (
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
                        {site.domain !== site.name ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {site.domain}
                          </span>
                        ) : null}
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
              <DropdownMenuItem onSelect={() => setCreateSiteOpen(true)}>
                <PlusIcon />
                <span>{messages.appNav.addSite}</span>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {canManage ? (
        <CreateSiteDialog
          open={createSiteOpen}
          onOpenChange={setCreateSiteOpen}
          locale={locale}
          messages={messages}
          teamId={teamContext.activeTeam.id}
        />
      ) : null}
    </>
  );
}
