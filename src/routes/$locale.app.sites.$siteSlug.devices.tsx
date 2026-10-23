import { createFileRoute } from "@tanstack/react-router";

import { DevicesClientPage } from "@/components/dashboard/site-pages/devices/devices-client-page";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/sites/$siteSlug/devices")({
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.devices.title,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { locale, messages, siteContext: c } = Route.useRouteContext();
  return (
    <DevicesClientPage
      locale={locale}
      messages={messages}
      siteId={c.activeSite.id}
    />
  );
}
