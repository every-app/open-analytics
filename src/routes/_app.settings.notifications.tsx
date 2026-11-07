import { createFileRoute } from "@tanstack/react-router";

import { TeamNotificationsClient } from "@/components/dashboard/admin/team-notifications/client";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { loadTeamNotificationsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/_app/settings/notifications")({
  // Everyone sets up their own reports and alerts; owners and admins see and
  // manage everyone's (src/lib/notifications/edge/rule-store.ts).
  beforeLoad: async ({ context }) => {
    const c = context.teamContext;
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
      canManage={canManageTeam(c.activeTeam.membershipRole)}
      initialData={teamNotificationsInitialData}
    />
  );
}
