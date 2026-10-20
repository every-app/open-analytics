import type { ReactNode } from "react";

import { ShareHeader } from "@/components/dashboard/sharing/share-header";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import { useDashboardNavHref } from "@/components/dashboard/shell/dashboard-shell/navigation";
import { NavTabs } from "@/components/dashboard/shell/nav-tabs";
import { PageTransition } from "@/components/page-transition";
import { publicDashboardSiteId } from "@/lib/dashboard/client/request";
import { parseFilterDocumentFromSearchParams } from "@/lib/dashboard/query-state";
import { sharePath } from "@/lib/dashboard/share-path";
import { parseFilterScopePreference } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { usePathname, useSearchParams } from "@/lib/router";

interface ShareDashboardShellProps {
  locale: Locale;
  messages: AppMessages;
  slug: string;
  siteName: string;
  children: ReactNode;
}

const SHARE_TABS = [
  "overview",
  "pages",
  "referrers",
  "campaigns",
  "retention",
  "geo",
  "devices",
  "browsers",
  "performance",
] as const;

function shareTabHref(locale: Locale, slug: string, key: string): string {
  return sharePath(locale, slug, key === "overview" ? undefined : key);
}

export function ShareDashboardShell({
  locale,
  messages,
  slug,
  siteName,
  children,
}: ShareDashboardShellProps) {
  const publicSiteId = publicDashboardSiteId(slug);
  const pathname = usePathname() || "";
  const routeSearchParams = useSearchParams();
  const initialFilters = parseFilterDocumentFromSearchParams(routeSearchParams);
  const initialScopePreference = parseFilterScopePreference(routeSearchParams);
  const isGeoRoute = pathname.endsWith("/geo");
  const navHref = useDashboardNavHref();
  const overviewPath = shareTabHref(locale, slug, "overview");
  const tabs = SHARE_TABS.map((key) => {
    const href = shareTabHref(locale, slug, key);
    return {
      key,
      href: navHref(href),
      label: messages.navigation[key],
      active:
        key === "overview"
          ? pathname === overviewPath
          : pathname.startsWith(href),
    };
  });
  const rootClassName = isGeoRoute
    ? "flex h-svh min-h-0 flex-col bg-background text-foreground"
    : "flex min-h-svh flex-col bg-background text-foreground";
  const contentClassName = isGeoRoute
    ? "flex min-h-0 w-full min-w-0 flex-1 flex-col md:overflow-hidden [&>[data-page-transition]]:flex [&>[data-page-transition]]:h-full [&>[data-page-transition]]:min-h-0 [&>[data-page-transition]]:flex-1 [&>[data-page-transition]]:flex-col"
    : "mx-auto flex w-full max-w-8xl flex-1 flex-col px-4 py-4 md:px-6 md:py-6";

  return (
    <DashboardQueryProvider
      scopeKey={publicSiteId}
      maxRangeDays={365}
      initialFilters={initialFilters}
      initialScopePreference={initialScopePreference}
    >
      <div className={rootClassName}>
        <div className="sticky top-0 z-20 shrink-0 bg-background/90 backdrop-blur">
          <div className="px-4 pt-3 md:px-6">
            <ShareHeader
              locale={locale}
              messages={messages}
              publicSiteId={publicSiteId}
              siteName={siteName}
            />
          </div>
          <NavTabs
            label={messages.appNav.sections}
            items={tabs}
            className="mt-2 px-2 md:px-4"
          />
        </div>
        <main className={contentClassName}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </DashboardQueryProvider>
  );
}
