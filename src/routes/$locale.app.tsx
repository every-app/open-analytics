import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";
import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
import { usePathname } from "@/lib/router";

export const Route = createFileRoute("/$locale/app")({
  beforeLoad: async ({ context }) => {
    const { teamContext, initialDashboardWindow } =
      await context.queryClient.ensureQueryData({
        ...dashboardShellQueryOptions,
        revalidateIfStale: true,
      });
    // The gateway signs everyone in before the app; without a workspace the
    // request had no identity this deployment serves.
    if (!teamContext) throw notFound();
    return { teamContext, initialDashboardWindow };
  },
  component: AppLayout,
});

function AppLayout() {
  const { locale, messages, teamContext, initialDashboardWindow } =
    Route.useRouteContext();
  const pathname = usePathname();
  return (
    <DashboardShell
      locale={locale}
      pathname={pathname}
      messages={messages}
      user={teamContext.user}
      team={teamContext.activeTeam}
      gatewayUrl={teamContext.gatewayUrl}
      sites={teamContext.sites}
      unreadAttentionCount={teamContext.unreadAttentionCount}
      initialQueryWindow={initialDashboardWindow}
    >
      <Outlet />
    </DashboardShell>
  );
}
