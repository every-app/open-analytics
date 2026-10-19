import { Button } from "@insightflare/ui/button";
import { PageHeading } from "@insightflare/ui/page-heading";
import { PlusIcon } from "lucide-react";

import { CreateSiteDialog } from "@/components/dashboard/admin/create-site-dialog";

import { useTeamManagementContext } from "./context";
import { GetStartedCard } from "./get-started-card";
import { TeamManagementSitesPanel } from "./sites-panel";

export function TeamManagementPageContent() {
  const {
    activeTeam,
    canManageSites,
    createSiteDialogOpen,
    locale,
    messages,
    openCreateSiteDialog,
    setCreateSiteDialogOpen,
  } = useTeamManagementContext();
  return (
    <div className="space-y-6">
      <PageHeading
        title={messages.teamManagement.sites.title}
        actions={
          canManageSites ? (
            <Button type="button" onClick={openCreateSiteDialog}>
              <PlusIcon data-icon="inline-start" />
              {messages.getStarted.addSite}
            </Button>
          ) : null
        }
      />
      <CreateSiteDialog
        open={createSiteDialogOpen}
        onOpenChange={setCreateSiteDialogOpen}
        locale={locale}
        messages={messages}
        teamId={activeTeam.id}
      />
      <GetStartedCard />
      <TeamManagementSitesPanel />
    </div>
  );
}
