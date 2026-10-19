import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { handleAdminWs } from "@/lib/edge/admin/ws";
import { resolveViewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));

const databases: DatabaseSync[] = [];

function createEnv() {
  const database = createMigratedDatabase();
  databases.push(database);
  database.exec(`
    INSERT INTO teams (id, name, slug) VALUES
      ('org-1', 'Org One', 'org-1'),
      ('org-2', 'Org Two', 'org-2');
    INSERT INTO sites (id, team_id, name, domain) VALUES
      ('site-1', 'org-1', 'Site One', 'one.example.test'),
      ('site-2', 'org-2', 'Site Two', 'two.example.test');
  `);
  const fetch = vi.fn(async (_request: Request) => new Response("upgraded"));
  const ingest = {
    idFromName: vi.fn(() => "do-id"),
    get: vi.fn(() => ({ fetch })),
  };
  const env = {
    DB: createSqliteD1Database(database),
    INGEST_DO: ingest,
  } as unknown as Env;
  return { env, ingest, fetch };
}

function wsRequest(search: string): Request {
  return new Request(`https://app.test/api/private/realtime/ws${search}`);
}

beforeEach(() => {
  vi.mocked(resolveViewer).mockReset();
  vi.mocked(resolveViewer).mockResolvedValue({
    userId: "user-1",
    email: "member@example.test",
    teamId: "org-1",
    role: "member",
    isAdmin: false,
  });
});

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe("handleAdminWs", () => {
  it("rejects requests without a gateway viewer", async () => {
    vi.mocked(resolveViewer).mockResolvedValue(null);
    const { env, ingest } = createEnv();

    const response = await handleAdminWs(wsRequest("?siteId=site-1"), env);

    expect(response.status).toBe(401);
    expect(ingest.get).not.toHaveBeenCalled();
  });

  it("requires a site id", async () => {
    const { env } = createEnv();

    const response = await handleAdminWs(wsRequest(""), env);

    expect(response.status).toBe(400);
  });

  it("forbids sites outside the viewer's organization", async () => {
    const { env, ingest } = createEnv();

    const otherOrg = await handleAdminWs(wsRequest("?siteId=site-2"), env);
    const missing = await handleAdminWs(wsRequest("?siteId=missing"), env);

    expect(otherOrg.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(ingest.get).not.toHaveBeenCalled();
  });

  it("forwards an organization member's request to the site's ingest DO", async () => {
    const { env, ingest, fetch } = createEnv();

    const response = await handleAdminWs(wsRequest("?siteId=site-1"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("upgraded");
    expect(ingest.idFromName).toHaveBeenCalledWith("site-1");
    expect(fetch.mock.calls[0]?.[0].url).toBe(
      "https://ingest.internal/ws?siteId=site-1",
    );
  });
});
