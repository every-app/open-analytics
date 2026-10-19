import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotificationEmailSettingsClient } from "@/components/dashboard/system-settings/notification-email-settings-client";
import { ScheduledTaskRetentionSettingsClient } from "@/components/dashboard/system-settings/scheduled-task-retention-settings-client";
import { SettingsPage } from "@/components/settings/settings-section";
import { loadSystemSettingsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";
export const Route = createFileRoute("/$locale/app/settings/general")({
  beforeLoad: async ({ context }) => {
    if (context.teamContext.user.systemRole !== "admin") throw notFound();
    return {
      systemSettingsInitialData: await loadSystemSettingsInitialData(),
    };
  },
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.general,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { messages, teamContext, systemSettingsInitialData } =
    Route.useRouteContext();
  return (
    <SettingsPage title={messages.settingsNav.general}>
      <NotificationEmailSettingsClient
        messages={messages}
        currentUserEmail={teamContext.user.email}
        initialData={systemSettingsInitialData}
      />
      <ScheduledTaskRetentionSettingsClient
        messages={messages}
        initialData={systemSettingsInitialData}
      />
    </SettingsPage>
  );
}
