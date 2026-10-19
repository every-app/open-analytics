import { GatewayRefusalError } from "@every-app/sdk/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Actor, requireActor } from "@/lib/edge/admin/auth";
import {
  handleNotificationEmailConfigAdmin,
  handleNotificationEmailTestAdmin,
} from "@/lib/edge/admin/notifications/email";
import type { Env } from "@/lib/edge/types";

const integrationStatus = vi.hoisted(() => vi.fn());
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  integrationStatus,
  sendEmail,
}));
vi.mock("@/lib/edge/admin/auth", () => ({ requireActor: vi.fn() }));

const actor = {
  user: { id: "admin-1", email: "admin@example.test" },
  teamId: "org-1",
  role: "admin",
  isAdmin: true,
} as Actor;
const env = {} as Env;

function testRequest(body: unknown = {}) {
  return new Request(
    "https://app.test/api/private/admin/notification-email/test",
    { method: "POST", body: JSON.stringify(body) },
  );
}

describe("admin notification email handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireActor).mockResolvedValue(actor);
    integrationStatus.mockResolvedValue({
      ready: true,
      sender: { address: "noreply@example.test", name: "Every App" },
    });
    sendEmail.mockResolvedValue({ messageId: "gw-1", status: "delivered" });
  });

  it("reports whether the gateway can send, and as whom", async () => {
    const response = await handleNotificationEmailConfigAdmin(
      new Request("https://app.test/api/private/admin/notification-email"),
      env,
    );

    expect(await response.json()).toMatchObject({
      ok: true,
      data: { enabled: true, sender: "noreply@example.test" },
    });
  });

  it("sends a test message to the admin through the gateway", async () => {
    const request = testRequest();
    const response = await handleNotificationEmailTestAdmin(request, env);

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        for: request,
        message: expect.objectContaining({ to: "admin@example.test" }),
      }),
    );
  });

  it("only lets owners and admins send a test", async () => {
    vi.mocked(requireActor).mockResolvedValue({ ...actor, isAdmin: false });

    const response = await handleNotificationEmailTestAdmin(testRequest(), env);

    expect(response.status).toBe(403);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("answers the gateway's refusal as a bad request", async () => {
    sendEmail.mockRejectedValue(
      new GatewayRefusalError({
        status: 503,
        code: "integration_not_configured",
        message: "The gateway has no sender",
      }),
    );

    const response = await handleNotificationEmailTestAdmin(testRequest(), env);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "integration_not_configured" },
    });
  });
});
