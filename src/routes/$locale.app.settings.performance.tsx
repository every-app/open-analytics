import { createFileRoute, notFound } from "@tanstack/react-router";

import { SystemPerformanceClient } from "@/components/dashboard/admin/system-performance-client";
import { SettingsFrame } from "@/components/settings/settings-section";
import { loadSystemPerformanceInitialData } from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";
export const Route = createFileRoute("/$locale/app/settings/performance")({
  beforeLoad: async ({ context }) => {
    if (context.teamContext.user.systemRole !== "admin") throw notFound();
    return {
      systemPerformanceInitialData: await loadSystemPerformanceInitialData(),
    };
  },
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.systemPerformance.title,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
function Page() {
  const { locale, messages, systemPerformanceInitialData } =
    Route.useRouteContext();
  return (
    <SettingsFrame width="wide">
      <SystemPerformanceClient
        locale={locale}
        messages={messages}
        initialData={systemPerformanceInitialData}
      />
    </SettingsFrame>
  );
}
