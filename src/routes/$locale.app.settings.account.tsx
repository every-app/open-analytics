import { createFileRoute } from "@tanstack/react-router";

import { AccountSettingsClient } from "@/components/dashboard/admin/account-settings-client";
import { loadAccountNotificationPreferences } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/settings/account")({
  beforeLoad: async () => {
    return {
      accountNotificationPreferencesInitialData:
        await loadAccountNotificationPreferences(),
    };
  },
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.account,
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
    teamContext,
    accountNotificationPreferencesInitialData,
  } = Route.useRouteContext();
  return (
    <AccountSettingsClient
      locale={locale}
      messages={messages}
      user={teamContext.user}
      initialData={accountNotificationPreferencesInitialData}
    />
  );
}
