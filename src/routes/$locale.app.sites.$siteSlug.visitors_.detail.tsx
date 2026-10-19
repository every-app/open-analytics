import { createFileRoute, redirect } from "@tanstack/react-router";

import { buildSitePath } from "@/lib/dashboard/paths";
export const Route = createFileRoute(
  "/$locale/app/sites/$siteSlug/visitors_/detail",
)({
  beforeLoad: ({ context, location }) => {
    const c = context.siteContext;
    const base = buildSitePath(context.locale, c.activeSite.slug, "visitors");
    throw redirect({ href: `${base}${location.searchStr}` });
  },
});
