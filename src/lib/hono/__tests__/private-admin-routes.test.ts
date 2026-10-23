import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleNotificationEmailConfigAdmin } from "@/lib/edge/admin/notifications/email";
import {
  handleNotificationRulePreviewAdmin,
  handleNotificationRuleRunAdmin,
  handleNotificationRulesAdmin,
  handleNotificationTestAdmin,
} from "@/lib/edge/admin/notifications/handler";
import { nf } from "@/lib/edge/admin/response";
import { handleScheduledTasksAdmin } from "@/lib/edge/admin/scheduled-tasks/handler";
import {
  handleScriptSnippetAdmin,
  handleSiteConfigAdmin,
  handleSitesAdmin,
} from "@/lib/edge/admin/sites/handler";
import {
  handleDoDiagnosticAdmin,
  handleSystemPerformanceAdmin,
} from "@/lib/edge/admin/system/handler";
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
  handleNotificationRulePreviewAdmin: vi.fn(),
  handleNotificationRuleRunAdmin: vi.fn(),
  handleNotificationTestAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/scheduled-tasks/handler", () => ({
  handleScheduledTasksAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/sites/handler", () => ({
  handleScriptSnippetAdmin: vi.fn(),
  handleSiteConfigAdmin: vi.fn(),
  handleSitesAdmin: vi.fn(),
}));
vi.mock("@/lib/edge/admin/system/handler", () => ({
  handleDoDiagnosticAdmin: vi.fn(),
  handleSystemPerformanceAdmin: vi.fn(),
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
  ["/notification-rules/preview", handleNotificationRulePreviewAdmin, false],
  ["/notification-rules/run", handleNotificationRuleRunAdmin, false],
  ["/notification-test", handleNotificationTestAdmin, false],
  ["/system-performance", handleSystemPerformanceAdmin, true, true],
  ["/scheduled-tasks", handleScheduledTasksAdmin, true, true],
  ["/do-diagnostic", handleDoDiagnosticAdmin, true, true],
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
    for (const [path, handler, includesUrl, includesActor] of routeCases) {
      const app = createApp();
      const response = await app.fetch(
        request(`/api/private/admin${path}`),
        env as never,
        ctx,
      );

      expect(response.status).toBe(200);
      if (includesActor) {
        expect(handler).toHaveBeenCalledWith(
          expect.any(Request),
          env,
          new URL(`https://app.test/api/private/admin${path}`),
          expect.any(Function),
        );
      } else if (includesUrl) {
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
