import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { createFileRoute } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";

import { TeamNotificationsClient } from "@/components/dashboard/admin/team-notifications/client";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { loadTeamNotificationsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/notifications")({
  beforeLoad: async ({ context }) => {
    const c = context.teamContext;
    if (!canManageTeam(c.activeTeam.membershipRole, c.user.systemRole)) {
      return { teamNotificationsInitialData: null };
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
          match.context.messages.teamManagement.notifications.title,
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
  if (!canManageTeam(c.activeTeam.membershipRole, c.user.systemRole)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <BellIcon className="size-4" />
            {messages.teamManagement.notifications.forbiddenTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-prose text-sm leading-6 text-muted-foreground">
            {messages.teamManagement.notifications.forbiddenDescription}
          </p>
        </CardContent>
      </Card>
    );
  }
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
