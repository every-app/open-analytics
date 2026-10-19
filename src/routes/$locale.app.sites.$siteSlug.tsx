import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { loadDashboardSite } from "@/lib/dashboard/route-data";

export const Route = createFileRoute("/$locale/app/sites/$siteSlug")({
  beforeLoad: async ({ params }) => {
    const siteContext = await loadDashboardSite({
      data: { siteSlug: params.siteSlug },
    });
    if (!siteContext) throw notFound();
    return { siteContext };
  },
  head: ({ match }) => ({
    meta: [{ title: match.context.siteContext.activeSite.name }],
  }),
  component: Outlet,
});
