import { createFileRoute } from "@tanstack/react-router";

import { OverviewClientPage } from "@/components/dashboard/site-pages/overview/overview-client-page";
import { APP_NAME } from "@/lib/constants";
export const Route = createFileRoute("/share/$slug/")({
  head: ({ match }) => ({
    meta: [{ title: `${match.context.shareContext.site.name} · ${APP_NAME}` }],
  }),
  component: Page,
});
function Page() {
  const { locale, messages, shareContext: c } = Route.useRouteContext();
  return (
    <OverviewClientPage
      locale={locale}
      messages={messages}
      siteId={c.publicSiteId}
      siteDomain={c.site.domain}
    />
  );
}
