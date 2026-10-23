import { createFileRoute } from "@tanstack/react-router";

import { ConversionsClientPage } from "@/components/dashboard/site-pages/funnels/conversions-client-page";
import { buildSitePath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/sites/$siteSlug/funnels")({
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.navigation.funnels,
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
    <ConversionsClientPage
      locale={locale}
      messages={messages}
      siteId={c.activeSite.id}
      pathname={buildSitePath(locale, c.activeSite.slug, "funnels")}
      canManage={canManageTeam(c.activeTeam.membershipRole, c.user.systemRole)}
    />
  );
}
