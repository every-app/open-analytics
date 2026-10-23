import { createFileRoute } from "@tanstack/react-router";

import { DevicesClientPage } from "@/components/dashboard/site-pages/devices/devices-client-page";
export const Route = createFileRoute("/$locale/share/$slug/devices")({
  component: Page,
});
function Page() {
  const { locale, messages, shareContext: c } = Route.useRouteContext();
  return (
    <DevicesClientPage
      locale={locale}
      messages={messages}
      siteId={c.publicSiteId}
    />
  );
}
