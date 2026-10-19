import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import {
  requireActor,
  toPublicUser,
  type UserRow,
} from "@/lib/edge/admin/auth";
import {
  bad,
  bool,
  forb,
  j,
  na,
  nf,
  parseJson,
  toRole,
  una,
} from "@/lib/edge/admin/response";
import type * as ViewerModule from "@/lib/edge/auth/viewer";
import { resolveViewer, type Viewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

vi.mock("@/lib/edge/auth/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof ViewerModule>()),
  resolveViewer: vi.fn(),
}));

async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}
describe("admin response low branches", () => {
  it("wraps JSON responses and maps status helpers, roles, and booleans", async () => {
    const accepted = j({ ok: true }, 202);
    expect(accepted.status).toBe(202);
    expect(accepted.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await accepted.json()).toEqual({ ok: true });

    await expect(jsonOf(bad("bad_input"))).resolves.toMatchObject({
      ok: false,
      error: { message: "bad_input" },
    });
    expect(bad("bad_input").status).toBe(400);
    expect(una().status).toBe(401);
    expect(forb().status).toBe(403);
    expect(nf().status).toBe(404);
    expect(na().status).toBe(405);

    expect(toRole("ADMIN")).toBe("admin");
    expect(toRole("owner")).toBe("user");
    expect(toRole(null)).toBe("user");

    expect(bool(true, false)).toBe(true);
    expect(bool(false, true)).toBe(false);
    expect(bool(2)).toBe(true);
    expect(bool(0, true)).toBe(false);
    expect(bool(" YES ")).toBe(true);
    expect(bool("off", true)).toBe(false);
    expect(bool({ enabled: true }, true)).toBe(true);
  });

  it("parses object JSON and falls back to an empty record for invalid bodies", async () => {
    await expect(
      parseJson(
        new Request("https://edge.test/admin", {
          method: "POST",
          body: JSON.stringify({ teamId: "team-1" }),
        }),
      ),
    ).resolves.toEqual({ teamId: "team-1" });

    await expect(
      parseJson(
        new Request("https://edge.test/admin", {
          method: "POST",
          body: "not-json",
        }),
      ),
    ).resolves.toEqual({});

    await expect(
      parseJson(
        new Request("https://edge.test/admin", {
          method: "POST",
          body: "null",
        }),
      ),
    ).resolves.toEqual({});
  });
});
describe("admin auth", () => {
  const request = new Request("https://edge.test/admin");
  const viewer: Viewer = {
    userId: "user-1",
    email: "member@example.test",
    teamId: "org-1",
    role: "member",
    isAdmin: false,
  };
  let database: DatabaseSync;
  let env: Env;

  beforeEach(() => {
    database = createMigratedDatabase();
    env = { DB: createSqliteD1Database(database) } as Env;
    vi.mocked(resolveViewer).mockResolvedValue(viewer);
  });

  afterEach(() => {
    database.close();
  });

  it("maps owners and admins to the admin system role in public users", () => {
    const user: UserRow = {
      id: "user-1",
      email: "owner@example.test",
      name: null,
      timezone: "",
      created_at: 100,
      updated_at: 200,
    };

    expect(toPublicUser(user, "owner")).toMatchObject({
      name: "",
      systemRole: "admin",
      timeZone: "",
    });
    expect(toPublicUser(user, "member").systemRole).toBe("user");
  });

  it("returns 401 without a gateway identity or a mirrored user", async () => {
    vi.mocked(resolveViewer).mockResolvedValueOnce(null);
    const anonymous = await requireActor(env, request);
    expect((anonymous as Response).status).toBe(401);

    const unmirrored = await requireActor(env, request);
    expect((unmirrored as Response).status).toBe(401);
    await expect((unmirrored as Response).json()).resolves.toMatchObject({
      error: { message: "User not found" },
    });
  });

  it("takes the workspace and role from the viewer, not the mirror", async () => {
    database
      .prepare("INSERT INTO users (id, email) VALUES (?, ?)")
      .run("user-1", "member@example.test");
    database
      .prepare("INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)")
      .run("org-1", "org-1", "org-1");
    database
      .prepare("INSERT INTO members (team_id, user_id, role) VALUES (?, ?, ?)")
      .run("org-1", "user-1", "admin");

    await expect(requireActor(env, request)).resolves.toEqual({
      user: expect.objectContaining({ id: "user-1" }),
      teamId: "org-1",
      role: "member",
      isAdmin: false,
    });
  });
});
