import type { MiddlewareHandler } from "hono";

import type { AppEnv } from "@/lib/hono/types";

export const API_NO_CACHE_HEADERS = {
  "cache-control": "no-store, no-cache, must-revalidate",
  pragma: "no-cache",
};

function shouldSkipHeaderMutation(path: string, response: Response): boolean {
  return path === "/api/private/realtime/ws" || response.status === 101;
}

export function apiNoCacheMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    await next();
    const path = c.req.path;
    if (shouldSkipHeaderMutation(path, c.res)) return;

    const shouldDisableCache =
      path.startsWith("/api/private/") || path === "/api/private";
    if (!shouldDisableCache) return;
    for (const [key, value] of Object.entries(API_NO_CACHE_HEADERS)) {
      c.res.headers.set(key, value);
    }
  };
}
