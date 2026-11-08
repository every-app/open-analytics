import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { FilterPills } from "@/components/dashboard/filters/filter-pills";
import { ShareHeader } from "@/components/dashboard/sharing/share-header";
import { DashboardQueryProvider } from "@/components/dashboard/shell/dashboard-query-provider";
import { PageTransition } from "@/components/page-transition";
import { publicDashboardSiteId } from "@/lib/dashboard/client/request";
import { parseFilterDocumentFromSearchParams } from "@/lib/dashboard/query-state";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { useSearchParams } from "@/lib/router";

interface ShareDashboardShellProps {
  locale: Locale;
  messages: AppMessages;
  slug: string;
  siteName: string;
  /** Whether the site has received a page view yet. */
  hasData: boolean;
  /** When its first page view happened; All time starts there. */
  firstDataAt: number | null;
  children: ReactNode;
}

export function ShareDashboardShell({
  locale,
  messages,
  slug,
  siteName,
  hasData,
  firstDataAt,
  children,
}: ShareDashboardShellProps) {
  const publicSiteId = publicDashboardSiteId(slug);
  const routeSearchParams = useSearchParams();
  const initialFilters = parseFilterDocumentFromSearchParams(routeSearchParams);

  return (
    <DashboardQueryProvider
      scopeKey={publicSiteId}
      dataStart={firstDataAt}
      initialFilters={initialFilters}
    >
      <div className="flex min-h-svh flex-col bg-background text-foreground">
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background/90 backdrop-blur">
          <div className="px-4 py-3 md:px-6">
            <ShareHeader
              locale={locale}
              messages={messages}
              publicSiteId={publicSiteId}
              siteName={siteName}
              showControls={hasData}
            />
            {hasData ? (
              <FilterPills
                locale={locale}
                messages={messages}
                className="pt-2.5 empty:hidden"
              />
            ) : null}
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-8xl flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
          {hasData ? (
            <PageTransition>{children}</PageTransition>
          ) : (
            <EmptyState
              title={messages.share.noData}
              variant="card"
              className="min-h-64"
            />
          )}
        </main>
      </div>
    </DashboardQueryProvider>
  );
}
