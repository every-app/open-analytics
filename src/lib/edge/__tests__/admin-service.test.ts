import { describe, expect, it, vi } from "vitest";

import {
  adminServicePath,
  adminServiceRouteForPath,
} from "@/lib/dashboard-api/contract/admin-service";
import {
  executeAdminService,
  readAdminService,
} from "@/lib/edge/admin/service/index";
import { executeRealAdminService } from "@/lib/edge/admin/service/real";
vi.mock("@/lib/edge/admin/service/real", () => ({
  executeRealAdminService: vi.fn(),
}));
const executeRealAdminServiceMock = vi.mocked(executeRealAdminService);
describe("admin service route contract", () => {
  it("round-trips static management routes", () => {
    const routes = [
      "session",
      "members",
      "notification-rules",
      "system-performance",
    ] as const;

    for (const route of routes) {
      expect(adminServiceRouteForPath(adminServicePath(route))).toBe(route);
    }
  });

  it("maps notification collection methods to distinct service operations", () => {
    expect(adminServiceRouteForPath("/api/private/notifications", "GET")).toBe(
      "notifications",
    );
    expect(
      adminServiceRouteForPath("/api/private/notifications", "PATCH"),
    ).toBe("notifications/read-all");
    expect(
      adminServiceRouteForPath(
        "/api/private/notifications/preferences",
        "PATCH",
      ),
    ).toBe("notifications/preferences");
  });

  it("rejects notification identifiers that escape their route segment", () => {
    expect(
      adminServiceRouteForPath(
        "/api/private/notifications/message%2Fid",
        "PATCH",
      ),
    ).toBeNull();
  });

  it("rejects non-management and unknown management paths", () => {
    expect(adminServiceRouteForPath("/api/private/overview")).toBeNull();
    expect(adminServiceRouteForPath("/api/private/admin/unknown")).toBeNull();
    expect(
      adminServiceRouteForPath("/api/private/admin/notifications/read-all"),
    ).toBeNull();
    expect(adminServiceRouteForPath("/api/public/session")).toBeNull();
  });

  it("delegates admin service requests to the real adapter", async () => {
    const delegatedResponse = new Response(
      JSON.stringify({ ok: true, data: { source: "real" } }),
      { headers: { "content-type": "application/json" } },
    );
    executeRealAdminServiceMock.mockResolvedValue(delegatedResponse);
    const request = new Request("https://app.test/api/private/admin/members");

    await expect(
      executeAdminService({
        route: "members",
        request,
        env: {} as never,
        url: new URL(request.url),
      }),
    ).resolves.toBe(delegatedResponse);
    expect(executeRealAdminServiceMock).toHaveBeenCalledWith({
      route: "members",
      request,
      env: {},
      url: new URL(request.url),
    });
  });

  it("returns null for non-OK admin responses", async () => {
    executeRealAdminServiceMock.mockResolvedValue(
      new Response("denied", { status: 403 }),
    );

    await expect(
      readAdminService({
        route: "members",
        request: new Request("https://app.test/api/private/admin/members"),
        env: {} as never,
        url: new URL("https://app.test/api/private/admin/members"),
      }),
    ).resolves.toBeNull();
  });

  it("returns null when a successful response has a non-true ok value", async () => {
    executeRealAdminServiceMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: "yes", data: [] }), {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      readAdminService({
        route: "members",
        request: new Request("https://app.test/api/private/admin/members"),
        env: {} as never,
        url: new URL("https://app.test/api/private/admin/members"),
      }),
    ).resolves.toBeNull();
  });

  it("preserves the undefined data value when the envelope omits data", async () => {
    executeRealAdminServiceMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      readAdminService({
        route: "members",
        request: new Request("https://app.test/api/private/admin/members"),
        env: {} as never,
        url: new URL("https://app.test/api/private/admin/members"),
      }),
    ).resolves.toBeUndefined();
  });

  it("returns null when the successful response is not valid JSON", async () => {
    executeRealAdminServiceMock.mockResolvedValue(
      new Response("{", {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      readAdminService({
        route: "members",
        request: new Request("https://app.test/api/private/admin/members"),
        env: {} as never,
        url: new URL("https://app.test/api/private/admin/members"),
      }),
    ).resolves.toBeNull();
  });
});
