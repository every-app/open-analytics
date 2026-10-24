import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import { fetchEdgeJson } from "@/lib/dashboard-api/client/edge";

vi.mock("@/lib/dashboard-api/client/edge", () => ({
  fetchEdgeJson: vi.fn(),
}));

const fetchEdgeJsonMock = vi.mocked(fetchEdgeJson);

describe("admin service client", () => {
  beforeEach(() => {
    fetchEdgeJsonMock.mockReset();
  });

  it("uses the shared management route contract", async () => {
    fetchEdgeJsonMock.mockResolvedValue({
      ok: true,
      data: [{ id: "site-1" }],
    });
    const controller = new AbortController();

    await expect(
      requestAdminService<{ id: string }[]>("sites", {
        params: { teamId: "team-1", includeArchived: false },
        signal: controller.signal,
      }),
    ).resolves.toEqual([{ id: "site-1" }]);

    expect(fetchEdgeJsonMock).toHaveBeenCalledWith({
      path: "/api/private/admin/sites",
      params: { teamId: "team-1", includeArchived: "false" },
      signal: controller.signal,
    });
  });

  it("accepts diagnostic payloads that intentionally omit the data envelope", async () => {
    fetchEdgeJsonMock.mockResolvedValue({
      ok: true,
      summary: { healthy: true },
    });

    await expect(
      requestAdminService<{ ok: boolean; summary: { healthy: boolean } }>(
        "system-performance",
      ),
    ).resolves.toEqual({ ok: true, summary: { healthy: true } });
  });

  it("raises the shared API error message for unsuccessful responses", async () => {
    fetchEdgeJsonMock.mockResolvedValue({
      ok: false,
      error: { message: "Site access denied" },
    });

    await expect(requestAdminService("sites")).rejects.toThrow(
      "Site access denied",
    );
  });

  it("reads the server's sentence out of a failed transport", async () => {
    fetchEdgeJsonMock.mockRejectedValue(
      new Error(
        'Edge API failed (404 POST /api/private/admin/notification-rules/run): {"ok":false,"requestId":"req-1","timestamp":"2026-10-24T00:00:00.000Z","error":{"code":"not_found","message":"Not Found"}}',
      ),
    );

    await expect(
      requestAdminService("notification-rules/run", {
        method: "POST",
        body: { ruleId: "gone" },
      }),
    ).rejects.toThrow(/^Not Found$/);
  });

  it("keeps a transport error that carries no envelope", async () => {
    const error = new Error(
      "Edge API failed (502 GET /api/private/admin/sites): <html>Bad Gateway</html>",
    );
    fetchEdgeJsonMock.mockRejectedValue(error);

    await expect(requestAdminService("sites")).rejects.toBe(error);
  });
});
