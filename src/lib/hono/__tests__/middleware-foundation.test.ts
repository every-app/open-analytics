import { type Handler, Hono, type MiddlewareHandler } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { withDashboardCache } from "@/lib/edge/analytics/composition/dashboard-cache";
import { requireSession } from "@/lib/edge/auth/session-auth";
import {
  fetchPublicSite,
  resolvePrivateSiteForSession,
} from "@/lib/edge/auth/site-access";
import type { Env } from "@/lib/edge/types";
import { apiNoCacheMiddleware } from "@/lib/hono/middleware/api-cache";
import { dashboardCacheMiddleware } from "@/lib/hono/middleware/dashboard-cache";
import {
  errorBoundaryMiddleware,
  handleHonoError,
} from "@/lib/hono/middleware/error-boundary";
import {
  requireMethodMiddleware,
  requireMethodsMiddleware,
} from "@/lib/hono/middleware/method";
import { requestIdMiddleware } from "@/lib/hono/middleware/request-id";
import { requireSessionMiddleware } from "@/lib/hono/middleware/session";
import {
  resolvePrivateSiteMiddleware,
  resolvePublicSiteMiddleware,
} from "@/lib/hono/middleware/site";
import type { AppEnv } from "@/lib/hono/types";
import { responseContext } from "@/lib/hono/utils/context";
vi.mock("@/lib/edge/analytics/composition/dashboard-cache", () => ({
  withDashboardCache: vi.fn(
    async (
      _ctx: ExecutionContext,
      _url: URL,
      loader: () => Promise<Response>,
    ) => loader(),
  ),
}));
vi.mock("@/lib/edge/auth/site-access", () => ({
  fetchPublicSite: vi.fn(),
  resolvePrivateSiteForSession: vi.fn(),
}));
vi.mock("@/lib/edge/auth/session-auth", () => ({
  requireSession: vi.fn(),
}));
const ctx = {
  passThroughOnException: vi.fn(),
  waitUntil: vi.fn(),
} as unknown as ExecutionContext;
const session = {
  userId: "user-1",
  email: "user@example.com",
  teamId: "team-1",
  systemRole: "user" as const,
};
function request(path: string, init?: RequestInit): Request {
  return new Request(`https://app.test${path}`, init);
}
function createApp(
  middleware: MiddlewareHandler<AppEnv>,
  handler: Handler<AppEnv>,
) {
  const app = new Hono<AppEnv>();
  app.use("*", middleware);
  app.all("*", handler);
  return app;
}
function createPrivateSiteApp(handler: Handler<AppEnv>) {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("session", session);
    await next();
  });
  app.use("*", resolvePrivateSiteMiddleware());
  app.all("*", handler);
  return app;
}
function createEnv(): Env {
  return {} as Env;
}
function responseWithThrowingHeaderSet(): Response {
  const response = new Response("upgraded");
  const headers = new Headers(response.headers);
  const set = vi.spyOn(headers, "set").mockImplementation(() => {
    throw new TypeError("Can't modify immutable headers.");
  });
  Object.defineProperty(response, "headers", { value: headers });
  set.mockClear();
  return response;
}
describe("Hono middleware foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the shared request id value", async () => {
    const app = createApp(requestIdMiddleware(), (c) =>
      c.json({ requestId: c.get("requestId") }),
    );

    const response = await app.fetch(
      request("/api/private/overview", {
        headers: { "x-request-id": "req-123" },
      }),
      createEnv(),
      ctx,
    );

    await expect(response.json()).resolves.toEqual({ requestId: "req-123" });
  });

  it("returns the shared response context from Hono variables", () => {
    expect(
      responseContext({
        get: (key: string) => (key === "requestId" ? "req-ctx" : undefined),
      } as never),
    ).toEqual({ requestId: "req-ctx" });
  });

  it("maps thrown errors through the shared error response", async () => {
    const app = new Hono<AppEnv>();
    app.onError(handleHonoError);
    app.get("*", () => {
      throw new Error("boom");
    });

    const response = await app.fetch(request("/api/private/overview"), {}, ctx);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_server_error");
  });

  it("passes thrown Response values through the error boundary middleware", async () => {
    const app = createApp(errorBoundaryMiddleware(), () => {
      throw new Response("teapot", { status: 418 });
    });

    const response = await app.fetch(request("/api/private/overview"), {}, ctx);

    expect(response.status).toBe(418);
    await expect(response.text()).resolves.toBe("teapot");
  });

  it("maps non-Response errors through the error boundary middleware", async () => {
    const app = createApp(errorBoundaryMiddleware(), () => {
      throw "boom";
    });

    const response = await app.fetch(request("/api/private/overview"), {}, ctx);
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_server_error");
  });

  it("logs an error but answers without its message", async () => {
    const middleware = errorBoundaryMiddleware();
    const logger = { error: vi.fn() };
    const c = {
      req: { raw: request("/api/private/overview") },
      get: vi.fn(() => logger),
    } as never;

    const response = (await middleware(c, async () => {
      throw new Error("middleware boom");
    })) as Response;

    const body = (await response.json()) as { error: { message: string } };

    expect(response.status).toBe(500);
    // Logged in full, answered without the error's text.
    expect(body.error.message).toBe("Internal Server Error");
    expect(logger.error).toHaveBeenCalledWith(
      "request.unhandled_error",
      expect.objectContaining({
        errorName: "Error",
        errorMessage: "middleware boom",
      }),
    );
  });

  it("guards exact and grouped methods with the shared 405 response", async () => {
    const exact = createApp(requireMethodMiddleware("POST"), () =>
      Response.json({ ok: true }),
    );
    const grouped = createApp(requireMethodsMiddleware(["GET", "HEAD"]), () =>
      Response.json({ ok: true }),
    );

    const exactResponse = await exact.fetch(
      request("/api/private/overview", { method: "GET" }),
      createEnv(),
      ctx,
    );
    const groupedResponse = await grouped.fetch(
      request("/api/private/overview", { method: "POST" }),
      createEnv(),
      ctx,
    );

    expect(exactResponse.status).toBe(405);
    expect(groupedResponse.status).toBe(405);
    await expect(exactResponse.json()).resolves.toMatchObject({
      error: { code: "method_not_allowed" },
    });
  });

  it("continues allowed method middleware branches", async () => {
    const exact = createApp(requireMethodMiddleware("POST"), () =>
      Response.json({ ok: true }),
    );
    const grouped = createApp(requireMethodsMiddleware(["GET", "HEAD"]), () =>
      Response.json({ ok: true }),
    );

    const exactResponse = await exact.fetch(
      request("/api/private/overview", { method: "POST" }),
      createEnv(),
      ctx,
    );
    const groupedResponse = await grouped.fetch(
      request("/api/private/overview", { method: "HEAD" }),
      createEnv(),
      ctx,
    );

    expect(exactResponse.status).toBe(200);
    expect(groupedResponse.status).toBe(200);
  });

  it("stores authenticated session claims", async () => {
    vi.mocked(requireSession).mockResolvedValue(session);
    const app = createApp(requireSessionMiddleware(), (c) =>
      c.json({ userId: c.get("session")?.userId }),
    );

    const response = await app.fetch(
      request("/api/private/overview"),
      createEnv(),
      ctx,
    );

    await expect(response.json()).resolves.toEqual({ userId: "user-1" });
  });

  it("short-circuits missing sessions with the shared unauthorized response", async () => {
    vi.mocked(requireSession).mockResolvedValue(null);
    const app = createApp(requireSessionMiddleware(), () =>
      Response.json({ ok: true }),
    );

    const response = await app.fetch(
      request("/api/private/overview"),
      createEnv(),
      ctx,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "unauthorized" },
    });
  });

  it("resolves private and public site context", async () => {
    vi.mocked(resolvePrivateSiteForSession).mockResolvedValue({
      id: "private-site",
      name: "Private Site",
      domain: "app.test",
    });
    vi.mocked(fetchPublicSite).mockResolvedValue({
      id: "public-site",
      name: "Public Site",
      domain: "app.test",
    });

    const privateApp = createPrivateSiteApp((c) =>
      c.json({ id: c.get("privateSite")?.id }),
    );
    const publicApp = new Hono<AppEnv>();
    publicApp.use("/:slug/*", resolvePublicSiteMiddleware());
    publicApp.get("/:slug/site", (c) =>
      c.json({ slug: c.get("publicSite")?.slug }),
    );

    const privateResponse = await privateApp.fetch(
      request("/api/private/overview"),
      createEnv(),
      ctx,
    );
    const publicResponse = await publicApp.fetch(
      request("/demo/site"),
      createEnv(),
      ctx,
    );

    await expect(privateResponse.json()).resolves.toEqual({
      id: "private-site",
    });
    expect(resolvePrivateSiteForSession).toHaveBeenCalledWith(
      expect.any(Request),
      expect.any(Object),
      new URL("https://app.test/api/private/overview"),
      session,
    );
    await expect(publicResponse.json()).resolves.toEqual({ slug: "demo" });
  });

  it("passes through site resolver response failures", async () => {
    vi.mocked(resolvePrivateSiteForSession).mockResolvedValueOnce(
      new Response("private-denied", { status: 403 }),
    );
    vi.mocked(fetchPublicSite).mockResolvedValueOnce(
      new Response("public-missing", { status: 404 }),
    );
    const privateApp = createPrivateSiteApp(() => Response.json({ ok: true }));
    const publicApp = createApp(resolvePublicSiteMiddleware(), () =>
      Response.json({ ok: true }),
    );

    const privateResponse = await privateApp.fetch(
      request("/api/private/overview"),
      createEnv(),
      ctx,
    );
    const publicResponse = await publicApp.fetch(
      request("/demo/site"),
      createEnv(),
      ctx,
    );

    expect(privateResponse.status).toBe(403);
    await expect(privateResponse.text()).resolves.toBe("private-denied");
    expect(publicResponse.status).toBe(404);
    await expect(publicResponse.text()).resolves.toBe("public-missing");
  });

  it("wraps responses with dashboard cache middleware", async () => {
    const app = createApp(
      dashboardCacheMiddleware({ ttlSeconds: 30 }),
      () => new Response("cached"),
    );

    const response = await app.fetch(
      request("/api/private/overview"),
      createEnv(),
      ctx,
    );

    await expect(response.text()).resolves.toBe("cached");
    expect(withDashboardCache).toHaveBeenCalledWith(
      ctx,
      new URL("https://app.test/api/private/overview"),
      expect.any(Function),
      { ttlSeconds: 30 },
    );
  });

  it("does not mutate realtime websocket response headers", async () => {
    const app = createApp(apiNoCacheMiddleware(), () =>
      responseWithThrowingHeaderSet(),
    );

    const response = await app.fetch(
      request("/api/private/realtime/ws?siteId=site-1", {
        headers: { upgrade: "websocket" },
      }),
      createEnv(),
      ctx,
    );

    await expect(response.text()).resolves.toBe("upgraded");
  });
});
