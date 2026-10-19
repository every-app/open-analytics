import { createFileRoute, notFound } from "@tanstack/react-router";

import { TeamNotificationsClient } from "@/components/dashboard/admin/team-notifications/client";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { loadTeamNotificationsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/settings/notifications")({
  beforeLoad: async ({ context }) => {
    const c = context.teamContext;
    if (!canManageTeam(c.activeTeam.membershipRole, c.user.systemRole)) {
      throw notFound();
    }
    return {
      teamNotificationsInitialData: await loadTeamNotificationsInitialData({
        data: { teamId: c.activeTeam.id },
      }),
    };
  },
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.notifications,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const {
    locale,
    messages,
    teamContext: c,
    teamNotificationsInitialData,
  } = Route.useRouteContext();
  return (
    <TeamNotificationsClient
      locale={locale}
      messages={messages}
      teamId={c.activeTeam.id}
      currentUserId={c.user.id}
      initialData={teamNotificationsInitialData}
    />
  );
}
