import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireSession } from "@/lib/edge/auth/session-auth";
import { resolveViewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));

const env = {} as Env;
const request = new Request("https://app.test/api/private/site");

describe("edge session authentication", () => {
  beforeEach(() => {
    vi.mocked(resolveViewer).mockResolvedValue(null);
  });

  it("maps organization owners and admins to the admin system role", async () => {
    vi.mocked(resolveViewer).mockResolvedValue({
      userId: "user-1",
      email: "owner@example.test",
      teamId: "org-1",
      role: "owner",
      isAdmin: true,
    });

    await expect(requireSession(request, env)).resolves.toEqual({
      userId: "user-1",
      email: "owner@example.test",
      teamId: "org-1",
      systemRole: "admin",
    });
  });

  it("maps organization members to the user system role", async () => {
    vi.mocked(resolveViewer).mockResolvedValue({
      userId: "user-2",
      email: "member@example.test",
      teamId: "org-1",
      role: "member",
      isAdmin: false,
    });

    await expect(requireSession(request, env)).resolves.toMatchObject({
      systemRole: "user",
    });
  });

  it("returns null without a gateway identity", async () => {
    await expect(requireSession(request, env)).resolves.toBeNull();
  });
});
