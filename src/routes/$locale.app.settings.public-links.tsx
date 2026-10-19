import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { LinkIcon } from "lucide-react";

import { CopyButton } from "@/components/common/copy-button";
import { EmptyState } from "@/components/common/empty-state";
import {
  SettingsCard,
  SettingsPage,
  SettingsRow,
} from "@/components/settings/settings-section";
import { buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { loadRequestOrigin } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";
import Link from "@/lib/router";
export const Route = createFileRoute("/$locale/app/settings/public-links")({
  beforeLoad: ({ context }) => {
    if (
      !canManageTeam(
        context.teamContext.activeTeam.membershipRole,
        context.teamContext.user.systemRole,
      )
    ) {
      throw notFound();
    }
  },
  loader: () => loadRequestOrigin(),
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.publicLinks,
          match.context,
        ),
      },
    ],
  }),
  component: PublicLinksPage,
});
function PublicLinksPage() {
  const { locale, messages, teamContext } = Route.useRouteContext();
  const origin = Route.useLoaderData();
  const copy = messages.teamManagement.publicLinks;

  return (
    <SettingsPage title={messages.settingsNav.publicLinks}>
      <SettingsCard>
        {teamContext.sites.length === 0 ? (
          <EmptyState
            variant="plain"
            media="rows"
            icon={LinkIcon}
            title={copy.noSites}
          />
        ) : (
          teamContext.sites.map((site) => {
            const enabled = Boolean(site.publicEnabled && site.publicSlug);
            const publicUrl = enabled
              ? `${origin}/share/${encodeURIComponent(site.publicSlug || "")}`
              : "";
            return (
              <SettingsRow
                key={site.id}
                label={site.name}
                description={
                  enabled ? (
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all hover:text-foreground hover:underline"
                    >
                      {publicUrl}
                    </a>
                  ) : (
                    site.domain
                  )
                }
              >
                <Badge variant={enabled ? "success" : "secondary"}>
                  {enabled ? copy.enabled : copy.disabled}
                </Badge>
                {enabled ? (
                  <CopyButton
                    value={publicUrl}
                    label={copy.copyLink}
                    copiedLabel={copy.linkCopied}
                    size="icon-sm"
                    variant="ghost"
                  />
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={buildSitePath(locale, site.slug, "settings")}>
                    {copy.viewSettings}
                  </Link>
                </Button>
              </SettingsRow>
            );
          })
        )}
      </SettingsCard>
    </SettingsPage>
  );
}
