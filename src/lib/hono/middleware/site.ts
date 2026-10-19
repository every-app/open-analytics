import type { MiddlewareHandler } from "hono";

import {
  fetchPublicSite,
  resolvePrivateSiteForSession,
} from "@/lib/edge/auth/site-access";
import type { AppEnv } from "@/lib/hono/types";
import { requestUrl } from "@/lib/hono/utils/context";

export function resolvePrivateSiteMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = c.get("session");
    if (!session) {
      throw new Error("private session context missing");
    }
    const site = await resolvePrivateSiteForSession(
      c.req.raw,
      c.env,
      requestUrl(c),
      session,
    );
    if (site instanceof Response) {
      c.res = site;
      return site;
    }
    c.set("privateSite", site);
    c.set("site", site);
    await next();
  };
}
export function resolvePublicSiteMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const site = await fetchPublicSite(c.env, requestUrl(c));
    if (site instanceof Response) {
      c.res = site;
      return site;
    }
    c.set("publicSite", {
      ...site,
      slug: c.req.param("slug"),
    });
    await next();
  };
}
