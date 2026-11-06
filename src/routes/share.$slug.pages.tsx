import { createFileRoute } from "@tanstack/react-router";

import { PagesClientPage } from "@/components/dashboard/site-pages/pages/pages-client-page";
import { sharePath } from "@/lib/dashboard/share-path";
export const Route = createFileRoute("/share/$slug/pages")({
  component: Page,
});
function Page() {
  const { locale, messages, shareContext: c } = Route.useRouteContext();
  const { slug } = Route.useParams();
  return (
    <PagesClientPage
      locale={locale}
      messages={messages}
      siteId={c.publicSiteId}
      siteDomain={c.site.domain}
      pathname={sharePath(slug, "pages")}
      sitePathname={sharePath(slug)}
    />
  );
}
