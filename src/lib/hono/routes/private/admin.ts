import type { Context } from "hono";
import { Hono } from "hono";

import { nf } from "@/lib/edge/admin/response";
import {
  type AdminServiceRoute,
  executeAdminService,
} from "@/lib/edge/admin/service/index";
import type { AppEnv } from "@/lib/hono/types";
import { requestUrl } from "@/lib/hono/utils/context";
export const privateAdminRoutes = new Hono<AppEnv>();
function adminServiceRoute(route: AdminServiceRoute) {
  return (c: Context<AppEnv>) =>
    executeAdminService({
      route,
      request: c.req.raw,
      env: c.env,
      url: requestUrl(c),
    });
}
privateAdminRoutes.all("/profile", adminServiceRoute("profile"));
privateAdminRoutes.all("/sites", adminServiceRoute("sites"));
privateAdminRoutes.all("/members", adminServiceRoute("members"));
privateAdminRoutes.all("/site-config", adminServiceRoute("site-config"));
privateAdminRoutes.all("/script-snippet", adminServiceRoute("script-snippet"));
privateAdminRoutes.all(
  "/notification-email",
  adminServiceRoute("notification-email"),
);
privateAdminRoutes.all(
  "/notification-rules",
  adminServiceRoute("notification-rules"),
);
privateAdminRoutes.all("/retention", adminServiceRoute("retention"));
privateAdminRoutes.all("/get-started", adminServiceRoute("get-started"));
privateAdminRoutes.all("/site-tracking", adminServiceRoute("site-tracking"));
privateAdminRoutes.all("/*", () => nf());
