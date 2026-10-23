import { createFileRoute } from "@tanstack/react-router";

import { NotificationCenterClient } from "@/components/dashboard/notifications/notification-center-client";
import {
  loadAccountNotificationPreferences,
  loadNotificationCenterInitialData,
} from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/inbox")({
  beforeLoad: async ({ context }) => {
    const [notifications, preferences] = await Promise.all([
      loadNotificationCenterInitialData({ data: { locale: context.locale } }),
      loadAccountNotificationPreferences(),
    ]);
    return { notifications, preferences };
  },
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.notificationCenter.title,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { locale, messages, teamContext, notifications, preferences } =
    Route.useRouteContext();
  return (
    <NotificationCenterClient
      locale={locale}
      messages={messages}
      userId={teamContext.user.id}
      sites={teamContext.sites}
      initialData={notifications}
      preferencesInitialData={preferences}
    />
  );
}
