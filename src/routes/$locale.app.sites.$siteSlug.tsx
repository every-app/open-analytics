import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/app/sites/$siteSlug")({
  beforeLoad: ({ context, params }) => {
    const activeSite = context.teamContext.sites.find(
      (site) => site.slug === params.siteSlug || site.id === params.siteSlug,
    );
    if (!activeSite) throw notFound();
    return { siteContext: { ...context.teamContext, activeSite } };
  },
  head: ({ match }) => ({
    meta: [{ title: match.context.siteContext.activeSite.name }],
  }),
  component: Outlet,
});
