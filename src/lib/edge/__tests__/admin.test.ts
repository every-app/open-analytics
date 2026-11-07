import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canManageSite,
  canManageTeam,
  canReadSite,
  canReadTeam,
  ManagerOnly,
} from "@/lib/edge/admin/access";
import { type Actor, requireActor, type UserRow } from "@/lib/edge/admin/auth";
import type * as ViewerModule from "@/lib/edge/auth/viewer";
import { resolveViewer, type Viewer } from "@/lib/edge/auth/viewer";
import {
  deleteSiteScriptSettings,
  readSiteScriptSettings,
  readSiteTrackingConfig,
  upsertSiteScriptSettings,
  upsertSiteTrackingConfig,
} from "@/lib/edge/sites/settings-store";
import type { Env } from "@/lib/edge/types";
import { privateAdminRoutes } from "@/lib/hono/routes/private/admin";
import { privateSessionRoutes } from "@/lib/hono/routes/private/session";
import { DEFAULT_SITE_SCRIPT_SETTINGS } from "@/lib/site-settings";
vi.mock("@/lib/edge/auth/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof ViewerModule>()),
  resolveViewer: vi.fn(),
}));
vi.mock("@/lib/edge/sites/settings-store", () => ({
  deleteSiteScriptSettings: vi.fn(),
  readSiteTrackingConfig: vi.fn(),
  readSiteScriptSettings: vi.fn(),
  upsertSiteTrackingConfig: vi.fn(),
  upsertSiteScriptSettings: vi.fn(),
}));
interface MockStatement {
  sql?: string;
  bind: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
}
interface MockDurableObjectNamespace {
  idFromName: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}
const resolveViewerMock = vi.mocked(resolveViewer);
const readSiteScriptSettingsMock = vi.mocked(readSiteScriptSettings);
const upsertSiteScriptSettingsMock = vi.mocked(upsertSiteScriptSettings);
const readSiteTrackingConfigMock = vi.mocked(readSiteTrackingConfig);
const upsertSiteTrackingConfigMock = vi.mocked(upsertSiteTrackingConfig);
const deleteSiteScriptSettingsMock = vi.mocked(deleteSiteScriptSettings);
const adminSession: Viewer = {
  userId: "admin-1",
  email: "admin@example.test",
  teamId: "team-1",
  role: "owner",
  isAdmin: true,
};
const userSession: Viewer = {
  userId: "user-1",
  email: "user@example.test",
  teamId: "team-1",
  role: "member",
  isAdmin: false,
};
const uuid = (value: string) =>
  value as `${string}-${string}-${string}-${string}-${string}`;
function userRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "admin-1",
    email: "admin@example.test",
    name: "Admin User",
    timezone: "UTC",
    created_at: 100,
    updated_at: 200,
    ...overrides,
  };
}
function statement(
  input: {
    first?: unknown;
    all?: Record<string, unknown>[];
    run?: unknown;
    firstReject?: unknown;
    allReject?: unknown;
    runReject?: unknown;
  } = {},
): MockStatement {
  const stmt = {
    bind: vi.fn(function (this: MockStatement) {
      return this;
    }),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  } satisfies MockStatement;

  if ("firstReject" in input) {
    stmt.first.mockRejectedValue(input.firstReject);
  } else {
    stmt.first.mockResolvedValue("first" in input ? input.first : null);
  }

  if ("allReject" in input) {
    stmt.all.mockRejectedValue(input.allReject);
  } else {
    stmt.all.mockResolvedValue({ results: input.all ?? [] });
  }

  if ("runReject" in input) {
    stmt.run.mockRejectedValue(input.runReject);
  } else {
    stmt.run.mockResolvedValue(input.run ?? { success: true });
  }

  return stmt;
}
function createIngestDo(
  handlers: Record<
    string,
    | { fetch: ReturnType<typeof vi.fn> }
    | (() => { fetch: ReturnType<typeof vi.fn> })
  > = {},
): MockDurableObjectNamespace {
  const idFromName = vi.fn((name: string) => `stub:${name}`);
  const get = vi.fn((id: string) => {
    const siteId = id.replace(/^stub:/, "");
    const handler = handlers[siteId];
    if (!handler) {
      return {
        fetch: vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ ok: false }), { status: 500 }),
          ),
      };
    }
    return typeof handler === "function" ? handler() : handler;
  });
  return { idFromName, get };
}
function createEnv(
  statements: MockStatement[] = [],
  input: {
    env?: Partial<Env>;
    ingestDo?: MockDurableObjectNamespace;
  } = {},
): {
  env: Env;
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  ingestDo: MockDurableObjectNamespace;
} {
  let index = 0;
  const prepare = vi.fn((sql: string) => {
    const stmt = statements[index];
    index += 1;
    if (!stmt) {
      throw new Error(`Unexpected SQL #${index}: ${sql}`);
    }
    stmt.sql = sql;
    return stmt;
  });
  const batch = vi.fn().mockResolvedValue([]);
  const ingestDo = input.ingestDo ?? createIngestDo();
  return {
    env: {
      DB: { prepare, batch } as unknown as D1Database,
      INGEST_DO: ingestDo as unknown as DurableObjectNamespace,
      MAIN_SECRET: "daily-salt",
      ...input.env,
    } as Env,
    prepare,
    batch,
    ingestDo,
  };
}
function memberRow(): UserRow {
  return userRow({
    id: "user-1",
    email: "user@example.test",
  });
}
function setSession(session: Viewer | null = adminSession) {
  return resolveViewerMock.mockResolvedValue(session);
}
function jsonInit(
  body: Record<string, unknown>,
  method: "POST" | "PATCH" = "POST",
): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
function edgeRequest(path: string, init?: RequestInit): Request {
  return new Request(`https://edge.test${path}`, init);
}
async function dispatch(path: string, env: Env, init?: RequestInit) {
  if (path === "/api/private/session") {
    return privateSessionRoutes.fetch(edgeRequest("/", init), env);
  }
  const adminPrefix = "/api/private/admin";
  if (path.startsWith(`${adminPrefix}/`)) {
    return privateAdminRoutes.fetch(
      edgeRequest(path.slice(adminPrefix.length), init),
      env,
    );
  }
  return new Response("Not Found", { status: 404 });
}
function mockUuid(...ids: string[]) {
  const spy = vi.spyOn(crypto, "randomUUID");
  for (const id of ids) spy.mockReturnValueOnce(uuid(id));
  if (ids.length > 0) spy.mockReturnValue(uuid(ids[ids.length - 1]));
  return spy;
}
describe("private admin edge handler", () => {
  beforeEach(() => {
    resolveViewerMock.mockReset();
    readSiteTrackingConfigMock.mockReset();
    readSiteScriptSettingsMock.mockReset();
    upsertSiteTrackingConfigMock.mockReset();
    upsertSiteScriptSettingsMock.mockReset();
    deleteSiteScriptSettingsMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scopes team and site access to the actor's organization", async () => {
    const member: Actor = {
      user: memberRow(),
      teamId: "team-1",
      role: "member",
      isAdmin: false,
    };
    const admin: Actor = { ...member, user: userRow(), isAdmin: true };
    const siteOf = (teamId: string | null) =>
      createEnv([statement({ first: teamId ? { team_id: teamId } : null })])
        .env;

    expect(canReadTeam(member, "team-1")).toBe(true);
    expect(canReadTeam(member, "team-2")).toBe(false);
    expect(canManageTeam(member, "team-1")).toBe(false);
    expect(canManageTeam(admin, "team-1")).toBe(true);
    expect(canManageTeam(admin, "team-2")).toBe(false);
    await expect(canReadSite(siteOf("team-1"), member, "site-1")).resolves.toBe(
      true,
    );
    await expect(canReadSite(siteOf("team-2"), admin, "site-2")).resolves.toBe(
      false,
    );
    await expect(canReadSite(siteOf(null), admin, "missing")).resolves.toBe(
      false,
    );
    await expect(
      canManageSite(siteOf("team-1"), member, "site-1"),
    ).resolves.toBe(false);
    await expect(
      canManageSite(siteOf("team-1"), admin, "site-1"),
    ).resolves.toBe(true);
  });

  it("returns not found for unknown admin routes without authenticating", async () => {
    const { env, prepare } = createEnv();

    const response = await dispatch("/api/private/admin/unknown", env);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { message: "Not Found" },
    });
    expect(resolveViewerMock).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
  });

  it("serves gateway-era admin routes and no longer serves account management", async () => {
    const { env, prepare } = createEnv();
    setSession(null);

    const retention = await dispatch("/api/private/admin/retention", env);
    expect(retention.status).toBe(401);
    for (const route of ["users", "teams", "team-invites", "api-keys"]) {
      const response = await dispatch(`/api/private/admin/${route}`, env);
      expect(response.status).toBe(404);
    }

    expect(prepare).not.toHaveBeenCalled();
  });

  describe("auth routes", () => {
    it("returns not found for unsupported auth/me methods", async () => {
      const { env, prepare } = createEnv();

      const me = await dispatch("/api/private/session", env, {
        method: "POST",
      });

      expect(me.status).toBe(404);
      expect(await me.json()).toMatchObject({
        ok: false,
        error: { message: "Not Found" },
      });
      expect(resolveViewerMock).not.toHaveBeenCalled();
      expect(prepare).not.toHaveBeenCalled();
    });

    it("returns the current user and their organization's workspace", async () => {
      setSession(adminSession);
      const actor = userRow();
      const workspace = {
        id: "team-1",
        name: "team-1",
        slug: "team-1",
        createdAt: 1,
        updatedAt: 2,
        siteCount: 3,
      };
      const { env } = createEnv([
        statement({ first: actor }),
        statement({ first: workspace }),
      ]);

      const response = await dispatch("/api/private/session", env);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          user: {
            id: "admin-1",
            email: "admin@example.test",
            name: "Admin User",
            systemRole: "admin",
            timeZone: "UTC",
            createdAt: 100,
            updatedAt: 200,
          },
          teams: [{ ...workspace, membershipRole: "owner" }],
        },
      });
    });

    it("rejects absent identities and unmirrored users", async () => {
      setSession(null);
      const absent = await dispatch("/api/private/session", createEnv().env);

      setSession(adminSession);
      const stale = await dispatch(
        "/api/private/session",
        createEnv([statement({ first: null })]).env,
      );

      expect(absent.status).toBe(401);
      expect(await absent.json()).toMatchObject({
        ok: false,
        error: { message: "Unauthorized" },
      });
      expect(stale.status).toBe(401);
      expect(await stale.json()).toMatchObject({
        ok: false,
        error: { message: "User not found" },
      });
    });
  });

  describe("profile route", () => {
    it("returns the authenticated profile", async () => {
      setSession(userSession);
      const { env } = createEnv([statement({ first: memberRow() })]);

      const response = await dispatch("/api/private/admin/profile", env);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: { user: { id: "user-1", systemRole: "user" } },
      });
    });

    it("validates profile time zones, failed reloads, and unsupported methods", async () => {
      setSession(userSession);
      const actor = memberRow();

      const invalidTimeZone = await dispatch(
        "/api/private/admin/profile",
        createEnv([statement({ first: actor })]).env,
        jsonInit({ timeZone: "Mars/Base" }),
      );
      const failedReload = await dispatch(
        "/api/private/admin/profile",
        createEnv([
          statement({ first: actor }),
          statement(),
          statement({ first: null }),
        ]).env,
        jsonInit({ name: "New Name" }),
      );
      const unsupported = await dispatch(
        "/api/private/admin/profile",
        createEnv([statement({ first: actor })]).env,
        { method: "DELETE" },
      );

      expect(invalidTimeZone.status).toBe(400);
      expect(await invalidTimeZone.json()).toMatchObject({
        ok: false,
        error: { message: "Invalid timezone" },
      });
      expect(failedReload.status).toBe(400);
      expect(await failedReload.json()).toMatchObject({
        ok: false,
        error: { message: "Failed to update profile" },
      });
      expect(unsupported.status).toBe(405);
    });

    it("updates the profile name and timezone", async () => {
      setSession(userSession);
      const actor = memberRow();
      const updated = {
        ...actor,
        name: "New Name",
        timezone: "Asia/Shanghai",
        updated_at: 301,
      };
      const update = statement();
      const { env } = createEnv([
        statement({ first: actor }),
        update,
        statement({ first: updated }),
      ]);

      const response = await dispatch(
        "/api/private/admin/profile",
        env,
        jsonInit({ name: "New Name", timeZone: "Asia/Shanghai" }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: { name: "New Name", timeZone: "Asia/Shanghai", updatedAt: 301 },
      });
      expect(update.bind).toHaveBeenCalledWith(
        "New Name",
        "Asia/Shanghai",
        "user-1",
      );
    });
  });

  describe("sites route", () => {
    it("requires team ids when listing sites", async () => {
      setSession(adminSession);
      const { env, prepare } = createEnv([statement({ first: userRow() })]);

      const response = await dispatch("/api/private/admin/sites", env);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Missing teamId" },
      });
      expect(prepare).toHaveBeenCalledTimes(1);
    });

    it("lists sites for readable teams", async () => {
      setSession(userSession);
      const rows = [
        {
          id: "site-1",
          teamId: "team-1",
          name: "Docs",
          domain: "docs.example.test",
        },
      ];
      const { env } = createEnv([
        statement({ first: memberRow() }),
        statement({ all: rows }),
      ]);

      const response = await dispatch(
        "/api/private/admin/sites?teamId=team-1",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ ok: true, data: rows });
    });

    it("denies listing another organization's sites", async () => {
      setSession(userSession);
      const { env } = createEnv([statement({ first: memberRow() })]);

      const response = await dispatch(
        "/api/private/admin/sites?teamId=team-2",
        env,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Team access denied" },
      });
    });

    it("creates sites from a normalized domain and initializes script settings", async () => {
      setSession(adminSession);
      mockUuid("00000000-0000-4000-8000-000000000301");
      upsertSiteScriptSettingsMock.mockResolvedValue(
        DEFAULT_SITE_SCRIPT_SETTINGS,
      );
      const insertSite = statement();
      const { env } = createEnv([statement({ first: userRow() }), insertSite]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit({
          teamId: "team-1",
          name: " ",
          domain: " HTTPS://Docs.Example.test/pricing/ ",
        }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          id: "00000000-0000-4000-8000-000000000301",
          teamId: "team-1",
          name: "docs.example.test",
          domain: "docs.example.test",
          publicEnabled: false,
          publicSlug: "",
        },
      });
      expect(insertSite.bind).toHaveBeenCalledWith(
        "00000000-0000-4000-8000-000000000301",
        "team-1",
        "docs.example.test",
        "docs.example.test",
        0,
        null,
      );
      expect(upsertSiteScriptSettingsMock).toHaveBeenCalledWith(
        env,
        "00000000-0000-4000-8000-000000000301",
        {
          siteDomain: "docs.example.test",
          settings: DEFAULT_SITE_SCRIPT_SETTINGS,
        },
      );
    });

    it("validates site creation payloads and team permissions", async () => {
      setSession(userSession);
      const missingFieldsEnv = createEnv([
        statement({ first: memberRow() }),
      ]).env;
      const missingFields = await dispatch(
        "/api/private/admin/sites",
        missingFieldsEnv,
        jsonInit({ teamId: "team-1", name: "Docs", domain: "*.example" }),
      );

      const forbiddenEnv = createEnv([statement({ first: memberRow() })]).env;
      const forbidden = await dispatch(
        "/api/private/admin/sites",
        forbiddenEnv,
        jsonInit({
          teamId: "team-1",
          name: "Docs",
          domain: "docs.example.test",
        }),
      );

      expect(missingFields.status).toBe(400);
      expect(await missingFields.json()).toMatchObject({
        ok: false,
        error: { message: "domain must be a hostname, like example.com" },
      });
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toMatchObject({
        ok: false,
        error: {
          code: "owner_or_admin_required",
          message: ManagerOnly.Sites,
        },
      });
    });

    it("rolls back newly inserted sites when settings initialization fails", async () => {
      setSession(adminSession);
      mockUuid("00000000-0000-4000-8000-000000000302");
      upsertSiteScriptSettingsMock.mockRejectedValue(new Error("kv down"));
      const insertSite = statement();
      const deleteSite = statement();
      const { env } = createEnv([
        statement({ first: userRow() }),
        insertSite,
        deleteSite,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit({
          teamId: "team-1",
          name: "Docs",
          domain: "docs.example.test",
        }),
      );

      expect(response.status).toBe(500);

      expect(insertSite.bind).toHaveBeenCalled();
      expect(deleteSite.bind).toHaveBeenCalledWith(
        "00000000-0000-4000-8000-000000000302",
      );
    });

    it("updates sites and syncs script settings domain", async () => {
      setSession(adminSession);
      upsertSiteScriptSettingsMock.mockResolvedValue(
        DEFAULT_SITE_SCRIPT_SETTINGS,
      );
      const update = statement();
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            id: "site-1",
            teamId: "team-1",
            name: "Old",
            domain: "old.example.test",
            publicEnabled: 0,
            publicSlug: null,
          },
        }),
        update,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit(
          {
            siteId: "site-1",
            name: "New Site",
            domain: "new.example.test",
            publicEnabled: false,
            publicSlug: "public-new",
          },
          "PATCH",
        ),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          id: "site-1",
          teamId: "team-1",
          name: "New Site",
          domain: "new.example.test",
          publicEnabled: false,
          publicSlug: "",
        },
      });
      expect(update.bind).toHaveBeenCalledWith(
        "New Site",
        "new.example.test",
        0,
        null,
        "site-1",
      );
      expect(upsertSiteScriptSettingsMock).toHaveBeenCalledWith(env, "site-1", {
        siteDomain: "new.example.test",
      });
    });

    it("renames a site whose stored domain predates normalization", async () => {
      setSession(adminSession);
      upsertSiteScriptSettingsMock.mockResolvedValue(
        DEFAULT_SITE_SCRIPT_SETTINGS,
      );
      const update = statement();
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            id: "site-1",
            teamId: "team-1",
            name: "Local",
            domain: "localhost:3000",
            publicEnabled: 0,
            publicSlug: null,
          },
        }),
        update,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit(
          { siteId: "site-1", name: "Renamed", domain: "localhost:3000" },
          "PATCH",
        ),
      );

      expect(response.status).toBe(200);
      expect(update.bind).toHaveBeenCalledWith(
        "Renamed",
        "localhost:3000",
        0,
        null,
        "site-1",
      );
    });

    it("updates sites with public slugs when publishing", async () => {
      setSession(adminSession);
      upsertSiteScriptSettingsMock.mockResolvedValue(
        DEFAULT_SITE_SCRIPT_SETTINGS,
      );
      const slugCheck = statement({ first: null });
      const update = statement();
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            id: "site-1",
            teamId: "team-1",
            name: "Docs",
            domain: "docs.example.test",
            publicEnabled: 0,
            publicSlug: null,
          },
        }),
        slugCheck,
        update,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit({ siteId: "site-1", publicEnabled: true }, "PATCH"),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          id: "site-1",
          teamId: "team-1",
          name: "Docs",
          domain: "docs.example.test",
          publicEnabled: true,
          publicSlug: "docs",
        },
      });
      expect(update.bind).toHaveBeenCalledWith(
        "Docs",
        "docs.example.test",
        1,
        "docs",
        "site-1",
      );
    });

    it("returns site patch validation and not found errors", async () => {
      setSession(adminSession);
      const missingIdEnv = createEnv([statement({ first: userRow() })]).env;
      const missingId = await dispatch(
        "/api/private/admin/sites",
        missingIdEnv,
        jsonInit({ name: "Docs" }, "PATCH"),
      );

      const missingSiteEnv = createEnv([
        statement({ first: userRow() }),
        statement({ first: null }),
      ]).env;
      const missingSite = await dispatch(
        "/api/private/admin/sites",
        missingSiteEnv,
        jsonInit({ siteId: "missing-1" }, "PATCH"),
      );

      expect(missingId.status).toBe(400);
      expect(await missingId.json()).toMatchObject({
        ok: false,
        error: { message: "siteId is required" },
      });
      expect(missingSite.status).toBe(404);
      expect(await missingSite.json()).toMatchObject({
        ok: false,
        error: { message: "Site not found" },
      });
    });

    it("denies site updates to members and other organizations and rejects unsupported methods", async () => {
      const site = {
        id: "site-1",
        teamId: "team-1",
        name: "Docs",
        domain: "docs.example.test",
        publicEnabled: 0,
        publicSlug: null,
      };
      setSession(userSession);
      const memberUpdate = await dispatch(
        "/api/private/admin/sites",
        createEnv([
          statement({ first: memberRow() }),
          statement({ first: site }),
        ]).env,
        jsonInit({ siteId: "site-1", name: "Renamed" }, "PATCH"),
      );

      setSession(adminSession);
      const otherOrgUpdate = await dispatch(
        "/api/private/admin/sites",
        createEnv([
          statement({ first: userRow() }),
          statement({ first: { ...site, teamId: "team-2" } }),
        ]).env,
        jsonInit({ siteId: "site-1", intent: "remove" }, "PATCH"),
      );
      const unsupported = await dispatch(
        "/api/private/admin/sites",
        createEnv([statement({ first: userRow() })]).env,
        { method: "DELETE" },
      );

      expect(memberUpdate.status).toBe(403);
      expect(otherOrgUpdate.status).toBe(403);
      expect(await otherOrgUpdate.json()).toMatchObject({
        ok: false,
        error: { message: ManagerOnly.Sites },
      });
      expect(unsupported.status).toBe(405);
    });

    it("removes sites and ignores best-effort settings cleanup failures", async () => {
      setSession(adminSession);
      deleteSiteScriptSettingsMock.mockRejectedValue(new Error("kv down"));
      const identity = statement({ first: { sitePk: 7 } });
      const recordDeletes = Array.from({ length: 3 }, () => statement());
      // Each purge step deletes nothing, so it runs once.
      const purgeDeletes = Array.from({ length: 14 }, () =>
        statement({ run: { success: true, meta: { changes: 0 } } }),
      );
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            id: "site-1",
            teamId: "team-1",
            name: "Site",
            domain: "site.example.test",
            publicEnabled: 0,
            publicSlug: null,
          },
        }),
        identity,
        ...recordDeletes,
        ...purgeDeletes,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit({ intent: "remove", siteId: "site-1" }, "PATCH"),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: { siteId: "site-1", teamId: "team-1", removed: true },
      });
      expect(identity.bind).toHaveBeenCalledWith("site-1");
      expect(recordDeletes[0].bind).toHaveBeenCalledWith("site:site-1");
      expect(recordDeletes[1].sql).toContain("analysis_definitions");
      expect(recordDeletes[1].bind).toHaveBeenCalledWith("site-1");
      expect(recordDeletes[2].bind).toHaveBeenCalledWith("site-1");
      for (const purge of purgeDeletes) {
        expect(purge.bind).toHaveBeenCalledWith(7, 1000);
      }
      expect(deleteSiteScriptSettingsMock).toHaveBeenCalledWith(env, "site-1");
    });

    it("puts retention on the next cron tick when a large site's purge goes on after the answer", async () => {
      setSession(adminSession);
      deleteSiteScriptSettingsMock.mockResolvedValue(undefined);
      // Every delete removes a full batch: more is left after the request's.
      const purgeDeletes = Array.from({ length: 100 }, () =>
        statement({ run: { success: true, meta: { changes: 1000 } } }),
      );
      const runOnNextTick = statement();
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            id: "site-1",
            teamId: "team-1",
            name: "Site",
            domain: "site.example.test",
            publicEnabled: 0,
            publicSlug: null,
          },
        }),
        statement({ first: { sitePk: 7 } }),
        ...Array.from({ length: 3 }, () => statement()),
        ...purgeDeletes,
        runOnNextTick,
      ]);

      const response = await dispatch(
        "/api/private/admin/sites",
        env,
        jsonInit({ intent: "remove", siteId: "site-1" }, "PATCH"),
      );

      expect(response.status).toBe(200);
      expect(runOnNextTick.sql).toContain("scheduled_task_schedule_state");
      expect(runOnNextTick.bind).toHaveBeenCalledWith(
        expect.any(Number),
        "analytics_retention",
        expect.any(Number),
      );
    });
  });

  describe("members route", () => {
    it("lists mirrored organization members for admins only", async () => {
      setSession(adminSession);
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          all: [
            { userId: "admin-1", email: "admin@example.test", role: "owner" },
            { userId: "user-1", email: "user@example.test", role: "member" },
          ],
        }),
      ]);

      const response = await dispatch("/api/private/admin/members", env);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: [
          { teamId: "team-1", userId: "admin-1", role: "owner" },
          { teamId: "team-1", userId: "user-1", role: "member" },
        ],
      });

      setSession(userSession);
      const denied = await dispatch(
        "/api/private/admin/members",
        createEnv([statement({ first: memberRow() })]).env,
      );
      expect(denied.status).toBe(403);
    });
  });

  describe("site config and script snippet routes", () => {
    it("loads default script settings for readable sites", async () => {
      setSession(userSession);
      readSiteTrackingConfigMock.mockResolvedValue(null);
      const { env } = createEnv([
        statement({ first: memberRow() }),
        statement({ first: { team_id: "team-1" } }),
      ]);

      const response = await dispatch(
        "/api/private/admin/site-config?siteId=site-1",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: DEFAULT_SITE_SCRIPT_SETTINGS,
      });
      expect(readSiteTrackingConfigMock).toHaveBeenCalledWith(env, "site-1");
    });

    it("returns read and write site config storage errors as 500 responses", async () => {
      setSession(adminSession);
      readSiteTrackingConfigMock.mockRejectedValue(new Error("read failed"));
      const readEnv = createEnv([
        statement({ first: userRow() }),
        statement({ first: { team_id: "team-1" } }),
      ]).env;
      const readResponse = await dispatch(
        "/api/private/admin/site-config?siteId=site-1",
        readEnv,
      );

      upsertSiteTrackingConfigMock.mockRejectedValue(new Error("write failed"));
      const writeEnv = createEnv([
        statement({ first: userRow() }),
        statement({ first: { team_id: "team-1" } }),
        statement({ first: { domain: "site.example.test" } }),
      ]).env;
      const writeResponse = await dispatch(
        "/api/private/admin/site-config",
        writeEnv,
        jsonInit({ siteId: "site-1", config: { trackHash: false } }),
      );

      expect(readResponse.status).toBe(500);
      expect(await readResponse.json()).toMatchObject({
        ok: false,
        error: "read failed",
      });
      expect(writeResponse.status).toBe(500);
      expect(await writeResponse.json()).toMatchObject({
        ok: false,
        error: "write failed",
      });
    });

    it("validates site config inputs, access, and fallback storage errors", async () => {
      setSession(userSession);
      const missingRead = await dispatch(
        "/api/private/admin/site-config",
        createEnv([statement({ first: memberRow() })]).env,
      );

      const deniedRead = await dispatch(
        "/api/private/admin/site-config?siteId=site-1",
        createEnv([
          statement({ first: memberRow() }),
          statement({ first: { team_id: "team-2" } }),
        ]).env,
      );

      const missingWrite = await dispatch(
        "/api/private/admin/site-config",
        createEnv([statement({ first: memberRow() })]).env,
        jsonInit({ config: { trackHash: false } }),
      );

      setSession(adminSession);
      const missingSite = await dispatch(
        "/api/private/admin/site-config",
        createEnv([
          statement({ first: userRow() }),
          statement({ first: { team_id: "team-1" } }),
          statement({ first: null }),
        ]).env,
        jsonInit({ siteId: "missing-1" }),
      );

      upsertSiteTrackingConfigMock.mockRejectedValue("kv failed");
      const fallbackWriteError = await dispatch(
        "/api/private/admin/site-config",
        createEnv([
          statement({ first: userRow() }),
          statement({ first: { team_id: "team-1" } }),
          statement({ first: { domain: "site.example.test" } }),
        ]).env,
        jsonInit({ siteId: "site-1", config: null }),
      );

      expect(missingRead.status).toBe(400);
      expect(await missingRead.json()).toMatchObject({
        ok: false,
        error: { message: "Missing siteId" },
      });
      expect(deniedRead.status).toBe(403);
      expect(await deniedRead.json()).toMatchObject({
        ok: false,
        error: { message: "Site access denied" },
      });
      expect(missingWrite.status).toBe(400);
      expect(await missingWrite.json()).toMatchObject({
        ok: false,
        error: { message: "siteId is required" },
      });
      expect(missingSite.status).toBe(404);
      expect(await missingSite.json()).toMatchObject({
        ok: false,
        error: { message: "Site not found" },
      });
      expect(fallbackWriteError.status).toBe(500);
      expect(await fallbackWriteError.json()).toMatchObject({
        ok: false,
        error: "save_site_config_failed",
      });
      expect(upsertSiteTrackingConfigMock).toHaveBeenLastCalledWith(
        expect.anything(),
        "site-1",
        {
          siteDomain: "site.example.test",
          settings: {},
        },
      );
    });

    it("saves site config after confirming site ownership and domain", async () => {
      setSession(adminSession);
      const saved = { ...DEFAULT_SITE_SCRIPT_SETTINGS, trackHash: false };
      upsertSiteTrackingConfigMock.mockResolvedValue({
        siteId: "site-1",
        siteDomain: "site.example.test",
        allowedHostnames: [],
        ...saved,
      });
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({ first: { team_id: "team-1" } }),
        statement({ first: { domain: "site.example.test" } }),
      ]);

      const response = await dispatch(
        "/api/private/admin/site-config",
        env,
        jsonInit({ siteId: "site-1", config: { trackHash: false } }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ ok: true, data: saved });
      expect(upsertSiteTrackingConfigMock).toHaveBeenCalledWith(env, "site-1", {
        siteDomain: "site.example.test",
        settings: { trackHash: false },
      });
    });

    it("denies site config writes to organization members", async () => {
      setSession(userSession);
      const { env } = createEnv([statement({ first: memberRow() })]);

      const response = await dispatch(
        "/api/private/admin/site-config",
        env,
        jsonInit({ siteId: "site-1", config: { trackHash: false } }),
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: ManagerOnly.TrackingSettings },
      });
      expect(upsertSiteScriptSettingsMock).not.toHaveBeenCalled();
    });

    it("rejects unsupported site config methods after authentication", async () => {
      setSession(adminSession);
      const { env } = createEnv([statement({ first: userRow() })]);

      const response = await dispatch(
        "/api/private/admin/site-config?siteId=site-1",
        env,
        { method: "PATCH" },
      );

      expect(response.status).toBe(405);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Method Not Allowed" },
      });
    });

    it("builds script snippets from the request origin", async () => {
      setSession(adminSession);
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({ first: { team_id: "team-1" } }),
      ]);

      const response = await dispatch(
        "/api/private/admin/script-snippet?siteId=site 1",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          siteId: "site 1",
          src: "https://edge.test/script.js?siteId=site%201",
          snippet:
            '<script defer src="https://edge.test/script.js?siteId=site%201"></script>',
        },
      });
    });

    it("uses request origin for snippets and validates snippet access", async () => {
      setSession(adminSession);
      const defaultBase = await dispatch(
        "/api/private/admin/script-snippet?siteId=site-1",
        createEnv([
          statement({ first: userRow() }),
          statement({ first: { team_id: "team-1" } }),
        ]).env,
      );

      const missingSiteId = await dispatch(
        "/api/private/admin/script-snippet",
        createEnv([statement({ first: userRow() })]).env,
      );

      setSession(userSession);
      const denied = await dispatch(
        "/api/private/admin/script-snippet?siteId=site-1",
        createEnv([
          statement({ first: memberRow() }),
          statement({ first: { team_id: "team-2" } }),
        ]).env,
      );

      expect(defaultBase.status).toBe(200);
      expect(await defaultBase.json()).toMatchObject({
        ok: true,
        data: {
          siteId: "site-1",
          src: "https://edge.test/script.js?siteId=site-1",
          snippet:
            '<script defer src="https://edge.test/script.js?siteId=site-1"></script>',
        },
      });
      expect(missingSiteId.status).toBe(400);
      expect(await missingSiteId.json()).toMatchObject({
        ok: false,
        error: { message: "Missing siteId" },
      });
      expect(denied.status).toBe(403);
      expect(await denied.json()).toMatchObject({
        ok: false,
        error: { message: "Site access denied" },
      });
    });

    it("rejects unsupported script snippet methods before authentication", async () => {
      const { env, prepare } = createEnv();

      const response = await dispatch(
        "/api/private/admin/script-snippet?siteId=site-1",
        env,
        { method: "POST" },
      );

      expect(response.status).toBe(405);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Method Not Allowed" },
      });
      expect(resolveViewerMock).not.toHaveBeenCalled();
      expect(prepare).not.toHaveBeenCalled();
    });
  });
});
