import { createFileRoute, notFound } from "@tanstack/react-router";

import { DataRetentionSettings } from "@/components/dashboard/system-settings/data-retention-settings";
import { EmailSenderStatus } from "@/components/dashboard/system-settings/email-sender-status";
import { SettingsPage } from "@/components/settings/settings-section";
import { loadSystemSettingsInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/_app/settings/system")({
  beforeLoad: ({ context }) => {
    if (context.teamContext.user.systemRole !== "admin") throw notFound();
  },
  loader: () => loadSystemSettingsInitialData(),
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.system,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { messages } = Route.useRouteContext();
  const settings = Route.useLoaderData();

  return (
    <SettingsPage title={messages.settingsNav.system}>
      <DataRetentionSettings messages={messages} initialData={settings} />
      <EmailSenderStatus messages={messages} initialData={settings} />
    </SettingsPage>
  );
}
