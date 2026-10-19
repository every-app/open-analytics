import { PageHeading } from "@insightflare/ui/page-heading";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotificationEmailSettingsClient } from "@/components/dashboard/system-settings/notification-email-settings-client";
import { ScheduledTaskRetentionSettingsClient } from "@/components/dashboard/system-settings/scheduled-task-retention-settings-client";
import { loadSystemSettingsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";
export const Route = createFileRoute("/$locale/app/manage/system-settings")({
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
          match.context.messages.systemSettings.title,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { locale, messages, teamContext, systemSettingsInitialData } =
    Route.useRouteContext();
  return (
    <div className="space-y-4">
      <PageHeading
        title={messages.systemSettings.title}
        subtitle={messages.systemSettings.subtitle}
      />
      <NotificationEmailSettingsClient
        locale={locale}
        messages={messages}
        currentUserEmail={teamContext.user.email}
        showHeading={false}
        initialData={systemSettingsInitialData}
      />
      <ScheduledTaskRetentionSettingsClient
        messages={messages}
        initialData={systemSettingsInitialData}
      />
    </div>
  );
}
