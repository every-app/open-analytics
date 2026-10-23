// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleNotificationPreferences,
  handleNotificationRead,
  handleNotificationRulePreviewAdmin,
  handleNotifications,
  handleNotificationsReadAll,
} from "@/lib/edge/admin/notifications/handler";
import { handleAuthMeAdmin } from "@/lib/edge/admin/users/handlers";
import { handleAdminWs } from "@/lib/edge/admin/ws";
import { handleMapRelayRequest } from "@/lib/edge/resources/map-relay";
import { privateAdminRoutes } from "@/lib/hono/routes/private/admin";
import { privateNotificationRoutes } from "@/lib/hono/routes/private/notifications";
import { privateRealtimeRoutes } from "@/lib/hono/routes/private/realtime";
import { privateSessionRoutes } from "@/lib/hono/routes/private/session";
import { publicResourceRoutes } from "@/lib/hono/routes/public/resources";
vi.mock("@/lib/edge/admin/ws", () => ({
  handleAdminWs: vi.fn(),
}));
vi.mock("@/lib/edge/resources/map-relay", () => ({
  handleMapRelayRequest: vi.fn(),
}));
vi.mock("@/lib/edge/admin/users/handlers", () => ({
  handleAuthMeAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/notifications/handler", () => ({
  handleNotificationPreferences: vi.fn(),
  handleNotificationRead: vi.fn(),
  handleNotificationRulePreviewAdmin: vi.fn(),
  handleNotifications: vi.fn(),
  handleNotificationsReadAll: vi.fn(),
}));
// The admin service imports the gateway SDK through the viewer, which can't
// load under Node.
vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));
const env = { DB: {} };
function request(path: string, init?: RequestInit) {
  return new Request(`https://app.test${path}`, init);
}
describe("thin Hono route modules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleAdminWs).mockResolvedValue(new Response("ws"));
    vi.mocked(handleMapRelayRequest).mockResolvedValue(new Response("map"));
    vi.mocked(handleAuthMeAdmin).mockResolvedValue(new Response("me"));
    vi.mocked(handleNotifications).mockResolvedValue(
      new Response("notifications"),
    );
    vi.mocked(handleNotificationPreferences).mockResolvedValue(
      new Response("preferences"),
    );
    vi.mocked(handleNotificationRead).mockResolvedValue(new Response("read"));
    vi.mocked(handleNotificationsReadAll).mockResolvedValue(
      new Response("read-all"),
    );
    vi.mocked(handleNotificationRulePreviewAdmin).mockResolvedValue(
      new Response("rule-preview"),
    );
  });

  it("forwards private realtime and resource routes to edge handlers", async () => {
    await privateRealtimeRoutes.fetch(request("/ws"), env as never);
    await publicResourceRoutes.fetch(
      request("/map/v1/styles/light/style.json"),
      env as never,
    );

    expect(handleAdminWs).toHaveBeenCalledTimes(1);
    expect(handleMapRelayRequest).toHaveBeenCalledWith(
      expect.any(Request),
      env,
    );
  });

  it("returns not found from private wildcard routes", async () => {
    const sessionMiss = await privateSessionRoutes.fetch(
      request("/missing"),
      env as never,
    );
    const realtimeMiss = await privateRealtimeRoutes.fetch(
      request("/missing"),
      env as never,
    );

    expect(sessionMiss.status).toBe(404);
    expect(realtimeMiss.status).toBe(404);
  });

  it("forwards private session and notification routes", async () => {
    await privateSessionRoutes.fetch(request("/"), env as never);
    await privateNotificationRoutes.fetch(request("/"), env as never);
    await privateNotificationRoutes.fetch(
      request("/preferences"),
      env as never,
    );
    await privateNotificationRoutes.fetch(
      request("/preferences", { method: "PATCH" }),
      env as never,
    );
    await privateNotificationRoutes.fetch(
      request("/message-1", { method: "PATCH" }),
      env as never,
    );
    await privateNotificationRoutes.fetch(
      request("/", { method: "PATCH" }),
      env as never,
    );

    expect(handleAuthMeAdmin).toHaveBeenCalled();
    expect(handleNotifications).toHaveBeenCalled();
    expect(handleNotificationPreferences).toHaveBeenCalledTimes(2);
    expect(handleNotificationRead).toHaveBeenCalledWith(
      expect.any(Request),
      env,
      "message-1",
    );
    expect(handleNotificationsReadAll).toHaveBeenCalled();
  }, 10_000);

  it("forwards the private admin rule preview", async () => {
    await privateAdminRoutes.fetch(
      request("/notification-rules/preview"),
      env as never,
    );

    expect(handleNotificationRulePreviewAdmin).toHaveBeenCalled();
  });
});
