// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleMembersAdmin } from "@/lib/edge/admin/users/handlers";
import { handleAdminWs } from "@/lib/edge/admin/ws";
import { handleOverviewContract } from "@/lib/edge/analytics/interfaces/dashboard/protocol/overview";
import type * as QueryRouterModule from "@/lib/edge/analytics/interfaces/dashboard/protocol/router";
import { requireSession } from "@/lib/edge/auth/session-auth";
import type * as SiteAccessModule from "@/lib/edge/auth/site-access";
import {
  fetchPublicSite,
  resolvePrivateSiteForSession,
} from "@/lib/edge/auth/site-access";
import {
  handleCollectOptionsRequest,
  handleCollectRequest,
} from "@/lib/edge/collector/collect";
import { handleTrackerScriptRequest } from "@/lib/edge/collector/script-endpoint";
import { handleMapRelayRequest } from "@/lib/edge/resources/map-relay";
import { handleWikiSummaryRequest } from "@/lib/edge/resources/wiki-summary";
import { handleWorldCountriesRequest } from "@/lib/edge/resources/world-countries";
import apiApp from "@/lib/hono/app";
vi.mock("@/lib/edge/admin/ws", () => ({
  handleAdminWs: vi.fn(),
}));
vi.mock("@/lib/edge/admin/users/handlers", () => ({
  handleAuthMeAdmin: vi.fn(),
  handleMembersAdmin: vi.fn(),
  handleProfileAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/setup/get-started", () => ({
  readSiteHasData: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/edge/collector/collect", () => ({
  handleCollectOptionsRequest: vi.fn(),
  handleCollectRequest: vi.fn(),
}));
vi.mock("@/lib/edge/auth/site-access", async (importOriginal) => {
  const actual = await importOriginal<typeof SiteAccessModule>();
  return {
    ...actual,
    fetchPublicSite: vi.fn(),
    resolvePrivateSiteForSession: vi.fn(),
  };
});
vi.mock(
  "@/lib/edge/analytics/interfaces/dashboard/protocol/router",
  async (importOriginal) => {
    const actual = await importOriginal<typeof QueryRouterModule>();
    return {
      ...actual,
    };
  },
);
vi.mock("@/lib/edge/analytics/interfaces/dashboard/protocol/overview", () => ({
  handleOverviewContract: vi.fn(),
  handleTrendContract: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/interfaces/dashboard/protocol/pages", () => ({
  handlePagesContract: vi.fn(),
  handleReferrersContract: vi.fn(),
}));
vi.mock("@/lib/edge/collector/script-endpoint", () => ({
  handleTrackerScriptRequest: vi.fn(),
}));
vi.mock("@/lib/edge/resources/world-countries", () => ({
  handleWorldCountriesRequest: vi.fn(),
}));
vi.mock("@/lib/edge/resources/map-relay", () => ({
  handleMapRelayRequest: vi.fn(),
}));
vi.mock("@/lib/edge/resources/wiki-summary", () => ({
  handleWikiSummaryRequest: vi.fn(),
}));
vi.mock("@/lib/edge/auth/session-auth", () => ({
  requireSession: vi.fn(),
}));
// Site access imports the gateway SDK through the viewer, which can't load
// under Node.
vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));
const env = { DB: {}, INGEST_DO: {} };
const dispatchQueryRoute = vi.fn();
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
const executionCtx = ctx as unknown as ExecutionContext;
const session = {
  userId: "user-1",
  email: "user@example.com",
  teamId: "team-1",
  systemRole: "admin" as const,
};
function request(path: string, init?: RequestInit): Request {
  return new Request(`https://app.test${path}`, init);
}
function publicBrowserRequest(path: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  headers.set(
    "user-agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  );
  headers.set("sec-fetch-site", "same-origin");
  headers.set("sec-fetch-mode", "cors");
  headers.set("sec-fetch-dest", "empty");
  return request(path, { ...init, headers });
}
describe("Hono API app routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleCollectOptionsRequest).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    vi.mocked(handleCollectRequest).mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    vi.mocked(handleTrackerScriptRequest).mockResolvedValue(
      new Response("script"),
    );
    vi.mocked(handleWorldCountriesRequest).mockResolvedValue(
      new Response("countries"),
    );
    vi.mocked(handleMapRelayRequest).mockResolvedValue(new Response("map"));
    vi.mocked(handleWikiSummaryRequest).mockResolvedValue(new Response("wiki"));
    vi.mocked(handleMembersAdmin).mockResolvedValue(new Response("admin"));
    vi.mocked(requireSession).mockResolvedValue(session);
    vi.mocked(resolvePrivateSiteForSession).mockResolvedValue({
      id: "site-1",
      name: "Site",
      domain: "app.test",
    });
    vi.mocked(fetchPublicSite).mockResolvedValue({
      id: "public-site",
      name: "Public Site",
      domain: "public.test",
    });
    vi.mocked(dispatchQueryRoute).mockResolvedValue(
      new Response("private-query"),
    );
    vi.mocked(handleOverviewContract).mockResolvedValue(
      new Response("private-query"),
    );
    vi.mocked(handleAdminWs).mockResolvedValue(new Response("ws"));
  });

  it("serves healthz directly from Hono bindings", async () => {
    const response = await apiApp.fetch(
      request("/healthz"),
      env as any,
      executionCtx,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "open-analytics",
      bindings: { d1: true, durableObject: true },
    });
  });

  it("routes edge endpoints to their shared handlers", async () => {
    await apiApp.fetch(
      request("/collect", { method: "OPTIONS" }),
      env as any,
      executionCtx,
    );
    await apiApp.fetch(
      request("/collect", { method: "POST" }),
      env as any,
      executionCtx,
    );
    await apiApp.fetch(request("/script.js"), env as any, executionCtx);
    await apiApp.fetch(
      request("/api/private/realtime/ws"),
      env as any,
      executionCtx,
    );

    expect(handleCollectOptionsRequest).toHaveBeenCalled();
    expect(handleCollectRequest).toHaveBeenCalledWith(
      expect.any(Request),
      env,
      executionCtx,
      new URL("https://app.test/collect"),
      expect.anything(),
    );
    expect(handleTrackerScriptRequest).toHaveBeenCalledWith(
      expect.any(Request),
      env,
    );
    expect(handleAdminWs).toHaveBeenCalledWith(expect.any(Request), env);
  });

  it("routes private and public API groups through Hono", async () => {
    await apiApp.fetch(
      request("/api/private/admin/members"),
      env as any,
      executionCtx,
    );
    await apiApp.fetch(
      request("/api/private/overview"),
      env as any,
      executionCtx,
    );
    await apiApp.fetch(
      publicBrowserRequest("/api/public/share/demo/site"),
      env as any,
      executionCtx,
    );

    expect(handleMembersAdmin).toHaveBeenCalled();
    expect(resolvePrivateSiteForSession).toHaveBeenCalled();
    expect(handleOverviewContract).toHaveBeenCalledWith(
      env,
      "site-1",
      new URL("https://app.test/api/private/overview"),
      expect.objectContaining({ requestId: expect.any(String) }),
      expect.objectContaining({ subject: { kind: "site", siteId: "site-1" } }),
    );
    expect(fetchPublicSite).toHaveBeenCalled();
  });

  it("emits one aggregate Worker record with route and query diagnostics", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(handleOverviewContract).mockResolvedValueOnce(
      new Response("overview", {
        headers: {
          "x-insightflare-cache": "MISS",
          "x-insightflare-data-source": "raw",
          "x-insightflare-d1-rows-read": "42",
        },
      }),
    );

    await apiApp.fetch(
      request("/api/private/overview"),
      env as any,
      executionCtx,
    );

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "worker",
        trigger: "request",
        request: expect.objectContaining({
          method: "GET",
          status: 200,
          outcome: "ok",
        }),
        performance: expect.objectContaining({
          cache: "MISS",
          dataSource: "raw",
          handlerD1RowsRead: 42,
        }),
        logs: expect.arrayContaining([
          expect.objectContaining({ message: "request.started" }),
          expect.objectContaining({ message: "route.handler.started" }),
          expect.objectContaining({ message: "route.handler.completed" }),
          expect.objectContaining({ message: "request.completed" }),
        ]),
      }),
    );
    logSpy.mockRestore();
  });

  it("adds no-cache headers to private API responses", async () => {
    const response = await apiApp.fetch(
      request("/api/private/overview"),
      env as any,
      executionCtx,
    );

    expect(response.headers.get("cache-control")).toBe(
      "no-store, no-cache, must-revalidate",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("does not add global no-cache headers to public resource responses", async () => {
    const response = await apiApp.fetch(
      publicBrowserRequest("/api/public/resources/world-countries"),
      env as any,
      executionCtx,
    );

    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("pragma")).toBeNull();
  });

  it("routes private endpoints only after session authentication", async () => {
    await apiApp.fetch(
      request("/api/private/realtime/ws?siteId=site-1"),
      env as any,
      executionCtx,
    );

    expect(requireSession).toHaveBeenCalled();
    expect(handleAdminWs).toHaveBeenCalled();
  });

  it("reuses the authenticated session for private site resolution", async () => {
    vi.mocked(requireSession).mockClear();

    await apiApp.fetch(
      request("/api/private/overview?siteId=site-1"),
      env as any,
      executionCtx,
    );

    expect(requireSession).toHaveBeenCalledTimes(1);
    expect(resolvePrivateSiteForSession).toHaveBeenCalledWith(
      expect.any(Request),
      env,
      new URL("https://app.test/api/private/overview?siteId=site-1"),
      session,
    );
  });

  it("returns 401 for private endpoints without a session", async () => {
    vi.mocked(requireSession).mockResolvedValueOnce(null);

    const response = await apiApp.fetch(
      request("/api/private/admin/members"),
      env as any,
      executionCtx,
    );

    expect(response.status).toBe(401);
    expect(handleMembersAdmin).not.toHaveBeenCalled();
  });

  it("does not mount legacy private API aliases", async () => {
    const legacyAdmin = await apiApp.fetch(
      request("/api" + "/admin/user", { method: "POST" }),
      env as any,
      executionCtx,
    );
    const legacyArchive = await apiApp.fetch(
      request("/api" + "/archive/file?key=a"),
      env as any,
      executionCtx,
    );
    const legacyWs = await apiApp.fetch(
      request("/admin" + "/ws?siteId=site-1"),
      env as any,
      executionCtx,
    );

    expect(legacyAdmin.status).toBe(404);
    expect(legacyArchive.status).toBe(404);
    expect(legacyWs.status).toBe(404);
  });

  it("routes world countries through Hono", async () => {
    const original = publicBrowserRequest(
      "/api/public/resources/world-countries",
    );

    const response = await apiApp.fetch(original, env as any, executionCtx);

    expect(await response.text()).toBe("countries");
    expect(handleWorldCountriesRequest).toHaveBeenCalledWith(
      original,
      expect.anything(),
    );
  });

  it("routes map resources through the backend relay handler", async () => {
    const original = publicBrowserRequest(
      "/api/public/resources/map/v1/styles/dark/style.json",
    );

    const response = await apiApp.fetch(original, env as any, executionCtx);

    expect(await response.text()).toBe("map");
    expect(handleMapRelayRequest).toHaveBeenCalledWith(
      original,
      expect.anything(),
    );
  });

  it("routes wiki summary through Hono", async () => {
    const original = publicBrowserRequest(
      "/api/public/resources/wiki-summary?wikidataId=Q42",
    );

    const response = await apiApp.fetch(original, env as any, executionCtx);

    expect(await response.text()).toBe("wiki");
    expect(handleWikiSummaryRequest).toHaveBeenCalledWith(
      original,
      expect.anything(),
    );
  });
});
