import { APP_NAME } from "@/lib/constants";

type DashboardTitleContext = {
  [key: string]: unknown;
  siteContext?: {
    activeSite: { name: string };
  };
};

/**
 * A tab's title: the page, the site it belongs to, then the app, as
 * OpenCRM's are. The organization stays out: the gateway names it to the app
 * only by its id.
 */
export function dashboardPageTitle(
  pageTitle: string,
  context: DashboardTitleContext,
): string {
  const site = context.siteContext?.activeSite.name;
  return site
    ? `${pageTitle} · ${site} · ${APP_NAME}`
    : `${pageTitle} · ${APP_NAME}`;
}
