import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Button } from "@insightflare/ui/button";
import { PageHeading } from "@insightflare/ui/page-heading";
import { Spinner } from "@insightflare/ui/spinner";
import { GlobeIcon, PlusIcon } from "lucide-react";

import Link from "@/lib/router";

import { useTeamManagementContext } from "./context";
import { TeamManagementCreateSiteDialog } from "./create-site-dialog";
import { TeamManagementSitesPanel } from "./sites-panel";
export function TeamManagementPageContent() {
  const {
    canManage,
    canManageSites,
    copy,
    isPageDataLoading,
    locale,
    setCreateSiteDialogOpen,
    setCreateSiteDomain,
    setCreateSiteError,
    setCreateSiteName,
    setCreateSitePublicSlug,
    siteCount,
    siteCreateCopy,
  } = useTeamManagementContext();
  return (
    <div className="space-y-6">
      <PageHeading
        title={copy.sites.title}
        subtitle={copy.sites.subtitle}
        actions={
          canManage ? (
            <>
              <Button variant="outline" asChild>
                <Link href={`/${locale}/app/sites`}>
                  <GlobeIcon data-icon="inline-start" />
                  <span className="inline-flex items-center gap-[var(--button-content-gap)]">
                    {copy.stats.sites}:
                    <AutoResizer
                      initial
                      animateWidth
                      animateHeight={false}
                      className="inline-flex items-center"
                    >
                      <AutoTransition
                        initial
                        className="inline-flex items-center"
                      >
                        {isPageDataLoading ? (
                          <span
                            key="sites-loading"
                            className="inline-flex items-center"
                          >
                            <Spinner data-icon="inline-end" />
                          </span>
                        ) : (
                          <span key="sites-value">{siteCount}</span>
                        )}
                      </AutoTransition>
                    </AutoResizer>
                  </span>
                </Link>
              </Button>
              {canManageSites ? (
                <Button
                  type="button"
                  onClick={() => {
                    setCreateSiteName("");
                    setCreateSiteDomain("");
                    setCreateSitePublicSlug("");
                    setCreateSiteError("");
                    setCreateSiteDialogOpen(true);
                  }}
                >
                  <PlusIcon data-icon="inline-start" />
                  <span>{siteCreateCopy.create}</span>
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <TeamManagementCreateSiteDialog />
      <div className="space-y-4">
        <TeamManagementSitesPanel />
      </div>
    </div>
  );
}
