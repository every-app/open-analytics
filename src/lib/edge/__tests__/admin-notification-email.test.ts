import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Actor, requireActor } from "@/lib/edge/admin/auth";
import { handleNotificationEmailConfigAdmin } from "@/lib/edge/admin/notifications/email";
import type { Env } from "@/lib/edge/types";

const integrationStatus = vi.hoisted(() => vi.fn());

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  integrationStatus,
}));
vi.mock("@/lib/edge/admin/auth", () => ({ requireActor: vi.fn() }));

const actor = {
  user: { id: "admin-1", email: "admin@example.test" },
  teamId: "org-1",
  role: "admin",
  isAdmin: true,
} as Actor;
const env = {} as Env;

describe("admin notification email handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireActor).mockResolvedValue(actor);
    integrationStatus.mockResolvedValue({
      ready: true,
      sender: { address: "noreply@example.test", name: "Every App" },
    });
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
});
