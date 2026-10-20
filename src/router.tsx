import { createRouter } from "@tanstack/react-router";

import { getQueryClient } from "@/components/query-client-provider";
import { notifyUrlStateChange } from "@/lib/dashboard/client/history";
import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
import { ErrorPage, NotFoundPage } from "@/routes/__root";
import { routeTree } from "@/routeTree.gen";

export function getRouter() {
  const queryClient = getQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () => ({
      dashboardShell: queryClient.getQueryData(
        dashboardShellQueryOptions.queryKey,
      ),
      dashboardShellUpdatedAt: queryClient.getQueryState(
        dashboardShellQueryOptions.queryKey,
      )?.dataUpdatedAt,
    }),
    hydrate: (dehydrated) => {
      if (dehydrated.dashboardShell) {
        queryClient.setQueryData(
          dashboardShellQueryOptions.queryKey,
          dehydrated.dashboardShell,
          { updatedAt: dehydrated.dashboardShellUpdatedAt },
        );
      }
    },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultNotFoundComponent: NotFoundPage,
    defaultErrorComponent: ErrorPage,
  });
  router.subscribe("onResolved", notifyUrlStateChange);
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
