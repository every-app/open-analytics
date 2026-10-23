import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canManageSite,
  canManageTeam,
  canReadSite,
  canReadTeam,
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
import type { DoDiagnosticPayload } from "@/lib/system-performance";
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
      DAILY_SALT_SECRET: "daily-salt",
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
function diagnosticPayload(
  overrides: Partial<DoDiagnosticPayload> = {},
): DoDiagnosticPayload {
  return {
    ok: true,
    snapshotAt: 1_000,
    thresholds: {
      staleMs: 1,
      timeoutMs: 2,
      hardAgedMs: 3,
      stuckFlushAttempts: 4,
    },
    visits: {
      total: 12,
      byStatus: { open: 4, closed: 8 },
      open: {
        total: 4,
        stale: 1,
        timedOut: 2,
        hardAged: 3,
        futureSkewed: 1,
        oldestStartedAt: 900,
        newestActivityAt: 990,
        futureMaxActivityAt: 1_100,
      },
      dirty: {
        total: 3,
        stuck: 2,
        maxFlushAttempts: 7,
      },
    },
    customEvents: {
      total: 5,
      dirty: 2,
      stuck: 1,
      maxFlushAttempts: 6,
      oldestOccurredAt: 800,
    },
    alarm: {
      scheduledAt: 1_200,
      nextDueAt: 1_200,
      nextDueKind: "flush",
      nextDueEntity: "visit",
    },
    ...overrides,
  };
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

    const diagnostic = await dispatch("/api/private/admin/do-diagnostic", env);
    expect(diagnostic.status).toBe(401);
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
            preferredLocale: "",
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
        "",
        "user-1",
      );
    });

    it("updates and validates profile preferred locale", async () => {
      setSession(userSession);

      for (const locale of ["en", "zh", "zh-tw", "ja", ""] as const) {
        const actor = { ...memberRow(), preferred_locale: "zh" };
        const update = statement();
        const { env } = createEnv([
          statement({ first: actor }),
          update,
          statement({ first: { ...actor, preferred_locale: locale } }),
        ]);

        const response = await dispatch(
          "/api/private/admin/profile",
          env,
          jsonInit({ preferredLocale: locale }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
          ok: true,
          data: { preferredLocale: locale },
        });
        expect(update.bind).toHaveBeenCalledWith(
          "Admin User",
          "UTC",
          locale,
          "user-1",
        );
      }

      const invalidLocale = await dispatch(
        "/api/private/admin/profile",
        createEnv([statement({ first: memberRow() })]).env,
        jsonInit({ preferredLocale: "fr" }),
      );

      expect(invalidLocale.status).toBe(400);
      expect(await invalidLocale.json()).toMatchObject({
        ok: false,
        error: { message: "Invalid preferred locale" },
      });
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
        error: { message: "Only organization admins can create sites" },
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
        error: { message: "Only organization admins can update sites" },
      });
      expect(unsupported.status).toBe(405);
    });

    it("removes sites and ignores best-effort settings cleanup failures", async () => {
      setSession(adminSession);
      deleteSiteScriptSettingsMock.mockRejectedValue(new Error("kv down"));
      const deleteStatements = Array.from({ length: 12 }, () => statement());
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
        ...deleteStatements,
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
      expect(deleteStatements[8].bind).toHaveBeenCalledWith("site-1");
      expect(deleteStatements[9].bind).toHaveBeenCalledWith("site-1");
      expect(deleteStatements[10].bind).toHaveBeenCalledWith("site-1");
      expect(deleteSiteScriptSettingsMock).toHaveBeenCalledWith(env, "site-1");
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
        error: { message: "Only organization admins can update site config" },
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

  describe("system performance route", () => {
    it("requires system admin access", async () => {
      setSession(userSession);
      const { env } = createEnv([statement({ first: memberRow() })]);

      const response = await dispatch(
        "/api/private/admin/system-performance",
        env,
      );

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Only system admin can view system performance" },
      });
    });

    it("rejects unsupported methods after admin authorization", async () => {
      setSession(adminSession);
      const { env, prepare } = createEnv([statement({ first: userRow() })]);

      const response = await dispatch(
        "/api/private/admin/system-performance",
        env,
        { method: "POST" },
      );

      expect(response.status).toBe(405);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Method Not Allowed" },
      });
      expect(prepare).toHaveBeenCalledTimes(1);
    });

    it("aggregates system performance rows into API response data", async () => {
      setSession(adminSession);
      vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
      const trendRows = [
        {
          bucketSec: 1_799_998_200,
          visits: "2",
          customEvents: 3,
          totalEvents: 5,
          avgLatencyMs: 100.5,
          p50LatencyMs: 80,
          p75LatencyMs: 110,
          p95LatencyMs: 150,
          delayedEvents: 1,
          futureSkewedEvents: 0,
        },
      ];
      const topSiteRows = [
        {
          siteId: "site-1",
          siteName: "Site",
          siteDomain: "site.example.test",
          totalEvents: 10,
          visits: 6,
          customEvents: 4,
          avgLatencyMs: "50",
          delayedEvents: 1,
          futureSkewedEvents: 2,
        },
      ];
      const slowRows = [
        {
          kind: "custom_event",
          siteId: "site-1",
          siteName: "Site",
          siteDomain: "site.example.test",
          eventAtMs: 100,
          serverAtMs: 800,
          latencyMs: 700,
        },
        {
          kind: "other",
          siteId: "site-2",
          siteName: "Site 2",
          siteDomain: "",
          eventAtMs: 200,
          serverAtMs: 300,
          latencyMs: 100,
        },
      ];
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            totalEvents: 20,
            visits: 12,
            customEvents: 8,
            activeSites: 3,
            avgLatencyMs: 75,
            trustedLatencySamples: 19,
            delayedEvents: 2,
            futureSkewedEvents: 1,
            latestCreatedAtSec: 1_799_999_990,
          },
        }),
        statement({
          first: {
            p50LatencyMs: 50,
            p75LatencyMs: 90,
            p95LatencyMs: 200,
          },
        }),
        statement({ all: trendRows }),
        statement({ all: topSiteRows }),
        statement({ all: slowRows }),
        statement({
          first: {
            total: 4,
            stale: 1,
            timedOut: 2,
            oldestStartedAt: 1_799_900_000_000,
            newestActivityAt: 1_799_999_000_000,
          },
        }),
      ]);

      const response = await dispatch(
        "/api/private/admin/system-performance?minutes=360",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        generatedAt: 1_800_000_000_000,
        window: {
          from: 1_799_978_400_000,
          to: 1_800_000_000_000,
          minutes: 360,
          bucketSizeMs: 1_800_000,
        },
        summary: {
          totalEvents: 20,
          visits: 12,
          customEvents: 8,
          activeSites: 3,
          eventsPerMinute: 20 / 360,
          latestCreatedAt: 1_799_999_990_000,
          dataFreshnessMs: 10_000,
          avgLatencyMs: 75,
          p50LatencyMs: 50,
          p75LatencyMs: 90,
          p95LatencyMs: 200,
          trustedLatencySamples: 19,
          delayedEvents: 2,
          futureSkewedEvents: 1,
          anomalyRate: 3 / 20,
        },
        openVisits: {
          total: 4,
          stale: 1,
          timedOut: 2,
          oldestStartedAt: 1_799_900_000_000,
          newestActivityAt: 1_799_999_000_000,
        },
        trend: [
          {
            bucket: 1_799_998_200,
            timestampMs: 1_799_998_200_000,
            visits: 2,
            customEvents: 3,
            totalEvents: 5,
            avgLatencyMs: 100.5,
            delayedEvents: 1,
            futureSkewedEvents: 0,
          },
        ],
        topSites: [
          {
            ...topSiteRows[0],
            avgLatencyMs: 50,
          },
        ],
        slowEvents: [
          {
            kind: "custom_event",
            siteId: "site-1",
            latencyMs: 700,
          },
          {
            kind: "visit",
            siteId: "site-2",
            latencyMs: 100,
          },
        ],
      });
    });

    it("defaults invalid windows and normalizes empty system performance rows", async () => {
      setSession(adminSession);
      vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({
          first: {
            totalEvents: "not-a-number",
            visits: null,
            customEvents: undefined,
            activeSites: Number.POSITIVE_INFINITY,
            avgLatencyMs: "bad",
            trustedLatencySamples: "0",
            delayedEvents: 0,
            futureSkewedEvents: 0,
            latestCreatedAtSec: "bad",
          },
        }),
        statement({ first: {} }),
        statement({ all: [] }),
        statement({ all: [] }),
        statement({ all: [] }),
        statement({ first: {} }),
      ]);

      const response = await dispatch(
        "/api/private/admin/system-performance?minutes=999",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        window: {
          from: 1_799_996_400_000,
          to: 1_800_000_000_000,
          minutes: 60,
          bucketSizeMs: 300_000,
        },
        summary: {
          totalEvents: 0,
          visits: 0,
          customEvents: 0,
          activeSites: 0,
          eventsPerMinute: 0,
          latestCreatedAt: null,
          dataFreshnessMs: null,
          avgLatencyMs: null,
          p50LatencyMs: null,
          p75LatencyMs: null,
          p95LatencyMs: null,
          trustedLatencySamples: 0,
          delayedEvents: 0,
          futureSkewedEvents: 0,
          anomalyRate: 0,
        },
        openVisits: {
          total: 0,
          stale: 0,
          timedOut: 0,
          oldestStartedAt: null,
          newestActivityAt: null,
        },
        trend: [],
        topSites: [],
        slowEvents: [],
      });
    });

    it("uses hourly buckets for the 1440 minute system performance window", async () => {
      setSession(adminSession);
      vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({ first: { totalEvents: 0 } }),
        statement({ first: {} }),
        statement({ all: [] }),
        statement({ all: [] }),
        statement({ all: [] }),
        statement({ first: {} }),
      ]);

      const response = await dispatch(
        "/api/private/admin/system-performance?minutes=1440",
        env,
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        window: {
          from: 1_799_913_600_000,
          to: 1_800_000_000_000,
          minutes: 1440,
          bucketSizeMs: 3_600_000,
        },
      });
    });
  });

  describe("DO diagnostics route", () => {
    it("requires system admin access for DO diagnostics", async () => {
      setSession(userSession);
      const { env } = createEnv([statement({ first: memberRow() })]);

      const response = await dispatch("/api/private/admin/do-diagnostic", env);

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Only system admin can view DO diagnostics" },
      });
    });

    it("rejects unsupported DO diagnostic methods after admin authorization", async () => {
      setSession(adminSession);
      const { env } = createEnv([statement({ first: userRow() })]);

      const response = await dispatch("/api/private/admin/do-diagnostic", env, {
        method: "POST",
      });

      expect(response.status).toBe(405);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { message: "Method Not Allowed" },
      });
    });

    it("aggregates reachable and unreachable durable object diagnostics", async () => {
      setSession(adminSession);
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(5_000)
        .mockReturnValueOnce(5_010)
        .mockReturnValueOnce(5_020)
        .mockReturnValueOnce(5_030)
        .mockReturnValueOnce(5_040)
        .mockReturnValue(5_050);
      const goodDiagnostic = diagnosticPayload();
      const secondDiagnostic = diagnosticPayload({
        visits: {
          total: 6,
          byStatus: { open: 1 },
          open: {
            total: 1,
            stale: 0,
            timedOut: 0,
            hardAged: 0,
            futureSkewed: 2,
            oldestStartedAt: 700,
            newestActivityAt: 800,
            futureMaxActivityAt: 1_500,
          },
          dirty: {
            total: 4,
            stuck: 1,
            maxFlushAttempts: 9,
          },
        },
        customEvents: {
          total: 3,
          dirty: 1,
          stuck: 4,
          maxFlushAttempts: 8,
          oldestOccurredAt: null,
        },
        alarm: {
          scheduledAt: null,
          nextDueAt: null,
          nextDueKind: null,
          nextDueEntity: null,
        },
      });
      const ingestDo = createIngestDo({
        "site-1": {
          fetch: vi.fn().mockResolvedValue(Response.json(goodDiagnostic)),
        },
        "site-2": {
          fetch: vi
            .fn()
            .mockResolvedValue(new Response("bad", { status: 503 })),
        },
        "site-3": {
          fetch: vi
            .fn()
            .mockResolvedValue(
              Response.json({ ok: false, error: "not_ready" }),
            ),
        },
        "site-4": {
          fetch: vi.fn().mockRejectedValue(new Error("network down")),
        },
        "site-5": {
          fetch: vi.fn().mockResolvedValue(Response.json(secondDiagnostic)),
        },
      });
      const { env } = createEnv(
        [
          statement({ first: userRow() }),
          statement({
            all: [
              { id: "site-1", name: "Site 1", domain: "one.example.test" },
              { id: "site-2", name: "Site 2", domain: "two.example.test" },
              { id: "site-3", name: "Site 3", domain: "three.example.test" },
              { id: "site-4", name: "", domain: "" },
              { id: "site-5", name: "Site 5", domain: "five.example.test" },
            ],
          }),
        ],
        {
          ingestDo,
        },
      );

      const response = await dispatch("/api/private/admin/do-diagnostic", env);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        generatedAt: 5_000,
        totalSites: 5,
        reachableSites: 2,
        unreachableSites: 3,
        thresholds: goodDiagnostic.thresholds,
        totals: {
          bufferedVisits: 18,
          openVisits: 5,
          openStale: 1,
          openTimedOut: 2,
          openHardAged: 3,
          openFutureSkewed: 3,
          dirtyVisits: 7,
          stuckDirtyVisits: 3,
          bufferedCustomEvents: 8,
          dirtyCustomEvents: 3,
          stuckDirtyCustomEvents: 5,
          activeAlarms: 1,
          maxVisitFlushAttempts: 9,
          maxCustomEventFlushAttempts: 8,
        },
        oldestOpenStartedAt: 700,
        futureMaxActivityAt: 1_500,
        sites: [
          {
            siteId: "site-5",
            ok: true,
            diagnostic: secondDiagnostic,
          },
          {
            siteId: "site-1",
            ok: true,
            diagnostic: goodDiagnostic,
          },
          {
            siteId: "site-2",
            ok: false,
            error: "do_status_503",
          },
          {
            siteId: "site-3",
            ok: false,
            error: "not_ready",
          },
          {
            siteId: "site-4",
            siteName: "site-4",
            siteDomain: "",
            ok: false,
            error: "network down",
          },
        ],
      });
      expect(ingestDo.idFromName).toHaveBeenCalledWith("site-1");
      expect(ingestDo.get).toHaveBeenCalledWith("stub:site-1");
    });

    it("uses default diagnostic thresholds when no sites are reachable", async () => {
      setSession(adminSession);
      vi.spyOn(Date, "now").mockReturnValue(10_000);
      const { env } = createEnv([
        statement({ first: userRow() }),
        statement({ all: [] }),
      ]);

      const response = await dispatch("/api/private/admin/do-diagnostic", env);

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        generatedAt: 10_000,
        totalSites: 0,
        reachableSites: 0,
        unreachableSites: 0,
        thresholds: {
          staleMs: 30 * 60 * 1000,
          timeoutMs: 12 * 60 * 60 * 1000,
          hardAgedMs: 36 * 60 * 60 * 1000,
          stuckFlushAttempts: 5,
        },
        totals: {
          bufferedVisits: 0,
          openVisits: 0,
          openStale: 0,
          openTimedOut: 0,
          openHardAged: 0,
          openFutureSkewed: 0,
          dirtyVisits: 0,
          stuckDirtyVisits: 0,
          bufferedCustomEvents: 0,
          dirtyCustomEvents: 0,
          stuckDirtyCustomEvents: 0,
          activeAlarms: 0,
          maxVisitFlushAttempts: 0,
          maxCustomEventFlushAttempts: 0,
        },
        oldestOpenStartedAt: null,
        futureMaxActivityAt: null,
        sites: [],
      });
    });
  });
});
