import { createFileRoute } from "@tanstack/react-router";

import { RealtimeClientPage } from "@/components/dashboard/site-pages/realtime/realtime-client-page";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/_app/sites/$siteSlug/realtime")({
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.realtime.title,
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
    <RealtimeClientPage
      locale={locale}
      messages={messages}
      siteId={c.activeSite.id}
      siteDomain={c.activeSite.domain}
    />
  );
}
