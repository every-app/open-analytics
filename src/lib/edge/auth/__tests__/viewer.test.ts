import type { DatabaseSync } from "node:sqlite";

import { type EveryAppUser, getEveryAppUser } from "@every-app/sdk/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { resolveViewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

vi.mock("@every-app/sdk/server", () => ({ getEveryAppUser: vi.fn() }));

// resolveViewer skips re-mirroring a person it has already written in this
// isolate, so each test signs in a different user.
function gatewayUser(id: string, orgRole: string, orgId = "org-1") {
  return { id, email: `${id}@example.test`, orgId, orgRole } as EveryAppUser;
}

function request() {
  return new Request("https://app.test/api/private/site");
}

describe("resolveViewer", () => {
  let database: DatabaseSync;
  let env: Env;

  beforeEach(() => {
    database = createMigratedDatabase();
    env = { DB: createSqliteD1Database(database) } as Env;
    vi.mocked(getEveryAppUser).mockResolvedValue(null);
  });

  afterEach(() => {
    database.close();
  });

  it("maps owners and admins to admins and everyone else to members", async () => {
    for (const [orgRole, role, isAdmin] of [
      ["owner", "owner", true],
      ["ADMIN", "admin", true],
      ["member", "member", false],
      ["billing", "member", false],
    ] as const) {
      vi.mocked(getEveryAppUser).mockResolvedValueOnce(
        gatewayUser(`role-${orgRole}`, orgRole),
      );
      await expect(resolveViewer(request(), env)).resolves.toMatchObject({
        teamId: "org-1",
        role,
        isAdmin,
      });
    }
  });

  it("mirrors the person, their organization's workspace and their role in it", async () => {
    vi.mocked(getEveryAppUser).mockResolvedValue(
      gatewayUser("mirror-user", "admin"),
    );

    await resolveViewer(request(), env);

    expect(database.prepare("SELECT id, email FROM users").all()).toEqual([
      { id: "mirror-user", email: "mirror-user@example.test" },
    ]);
    expect(
      database.prepare("SELECT team_id, user_id, role FROM members").all(),
    ).toEqual([{ team_id: "org-1", user_id: "mirror-user", role: "admin" }]);
    expect(database.prepare("SELECT id FROM teams").all()).toEqual([
      { id: "org-1" },
    ]);
  });

  it("refuses an organization other than the pinned one", async () => {
    env.EVERY_APP_ORG_ID = "org-1";
    vi.mocked(getEveryAppUser).mockResolvedValue(
      gatewayUser("pinned-user", "owner", "org-2"),
    );

    await expect(resolveViewer(request(), env)).resolves.toBeNull();
    expect(database.prepare("SELECT id FROM users").all()).toEqual([]);
  });

  it("returns null without a verified identity", async () => {
    await expect(resolveViewer(request(), env)).resolves.toBeNull();

    vi.mocked(getEveryAppUser).mockRejectedValue(new Error("bad signature"));
    await expect(resolveViewer(request(), env)).resolves.toBeNull();
  });
});
