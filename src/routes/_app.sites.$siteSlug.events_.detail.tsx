import { createFileRoute, redirect } from "@tanstack/react-router";

import { buildSitePath } from "@/lib/dashboard/paths";

export const Route = createFileRoute("/_app/sites/$siteSlug/events_/detail")({
  beforeLoad: ({ context, location }) => {
    const { siteContext: c } = context;
    const search = new URLSearchParams(location.searchStr);
    const detail =
      search.get("detail")?.trim() || search.get("eventName")?.trim() || "";
    search.delete("detail");
    search.delete("eventName");
    if (detail) search.set("detail", detail);
    const base = buildSitePath(c.activeSite.slug, "events");
    throw redirect({ href: search.size ? `${base}?${search}` : base });
  },
});
