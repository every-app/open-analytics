import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleNotificationEmailConfigAdmin } from "@/lib/edge/admin/notifications/email";
import { handleNotificationRulesAdmin } from "@/lib/edge/admin/notifications/handler";
import { nf } from "@/lib/edge/admin/response";
import { handleRetentionAdmin } from "@/lib/edge/admin/retention/handler";
import {
  handleScriptSnippetAdmin,
  handleSiteConfigAdmin,
  handleSitesAdmin,
} from "@/lib/edge/admin/sites/handler";
import {
  handleMembersAdmin,
  handleProfileAdmin,
} from "@/lib/edge/admin/users/handlers";
import { privateAdminRoutes } from "@/lib/hono/routes/private/admin";
import type { AppEnv } from "@/lib/hono/types";
vi.mock("@/lib/edge/admin/response", () => ({
  nf: vi.fn(() => new Response("not found", { status: 404 })),
}));
vi.mock("@/lib/edge/admin/notifications/email", () => ({
  handleNotificationEmailConfigAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/notifications/handler", () => ({
  handleNotificationRulesAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/retention/handler", () => ({
  handleRetentionAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/sites/handler", () => ({
  handleScriptSnippetAdmin: vi.fn(),
  handleSiteConfigAdmin: vi.fn(),
  handleSitesAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/users/handlers", () => ({
  handleMembersAdmin: vi.fn(),
  handleProfileAdmin: vi.fn(),
}));
// The admin service imports the gateway SDK through the viewer, which can't
// load under Node.
vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));
const env = { DB: {} };
const ctx = {
  passThroughOnException: vi.fn(),
  waitUntil: vi.fn(),
} as unknown as ExecutionContext;
const routeCases = [
  ["/profile", handleProfileAdmin, false],
  ["/sites", handleSitesAdmin, true],
  ["/members", handleMembersAdmin, false],
  ["/site-config", handleSiteConfigAdmin, true],
  ["/script-snippet", handleScriptSnippetAdmin, true],
  ["/notification-email", handleNotificationEmailConfigAdmin, false],
  ["/notification-rules", handleNotificationRulesAdmin, true],
  ["/retention", handleRetentionAdmin, false],
] as const;
function request(path: string, init?: RequestInit): Request {
  return new Request(`https://app.test${path}`, init);
}
function createApp() {
  const app = new Hono<AppEnv>();
  app.route("/api/private/admin", privateAdminRoutes);
  return app;
}
describe("Hono private admin routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const [, handler] of routeCases) {
      vi.mocked(handler).mockResolvedValue(new Response("ok"));
    }
  });

  it("routes each admin path directly to its handler", async () => {
    for (const [path, handler, includesUrl] of routeCases) {
      const app = createApp();
      const response = await app.fetch(
        request(`/api/private/admin${path}`),
        env as never,
        ctx,
      );

      expect(response.status).toBe(200);
      if (includesUrl) {
        expect(handler).toHaveBeenCalledWith(
          expect.any(Request),
          env,
          new URL(`https://app.test/api/private/admin${path}`),
        );
      } else {
        expect(handler).toHaveBeenCalledWith(expect.any(Request), env);
      }
    }
  });

  it("returns the shared admin not found response for unknown admin paths", async () => {
    const app = createApp();

    const response = await app.fetch(
      request("/api/private/admin/unknown"),
      env as never,
      ctx,
    );

    expect(response.status).toBe(404);
    expect(nf).toHaveBeenCalled();
  });
});
