import { Button } from "@insightflare/ui/button";
import { PageHeading } from "@insightflare/ui/page-heading";
import { GlobeIcon, PlusIcon } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { CreateSiteDialog } from "@/components/dashboard/admin/create-site-dialog";

import { useTeamManagementContext } from "./context";
import { GetStartedCard } from "./get-started-card";
import { TeamManagementSitesPanel } from "./sites-panel";

/**
 * All sites. Before the first site it's one empty state: owners and admins
 * add a site from it, members are told to ask for one.
 */
export function TeamManagementPageContent() {
  const {
    activeTeam,
    canManageSites,
    createSiteDialogOpen,
    dashboardSites,
    isPageDataLoading,
    locale,
    messages,
    openCreateSiteDialog,
    setCreateSiteDialogOpen,
  } = useTeamManagementContext();
  const copy = messages.getStarted;

  const addSiteButton = canManageSites ? (
    <Button type="button" onClick={openCreateSiteDialog}>
      <PlusIcon data-icon="inline-start" />
      {copy.addSite}
    </Button>
  ) : null;
  const createSiteDialog = canManageSites ? (
    <CreateSiteDialog
      open={createSiteDialogOpen}
      onOpenChange={setCreateSiteDialogOpen}
      locale={locale}
      messages={messages}
      teamId={activeTeam.id}
    />
  ) : null;

  if (!isPageDataLoading && dashboardSites.length === 0) {
    return (
      <>
        <EmptyState
          media="rows"
          icon={GlobeIcon}
          title={canManageSites ? copy.noSitesTitle : copy.memberNoSitesTitle}
          description={
            canManageSites ? undefined : copy.memberNoSitesDescription
          }
          action={addSiteButton}
        />
        {createSiteDialog}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={messages.teamManagement.sites.title}
        actions={addSiteButton}
      />
      {createSiteDialog}
      <GetStartedCard />
      <TeamManagementSitesPanel />
    </div>
  );
}
