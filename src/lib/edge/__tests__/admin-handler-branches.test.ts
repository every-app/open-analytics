import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as AccessModule from "@/lib/edge/admin/access";
import { canManageSite, canReadSite } from "@/lib/edge/admin/access";
import type * as AuthModule from "@/lib/edge/admin/auth";
import {
  type Actor,
  byId,
  listMembers,
  requireActor,
} from "@/lib/edge/admin/auth";
import {
  handleScriptSnippetAdmin,
  handleSiteConfigAdmin,
  handleSitesAdmin,
} from "@/lib/edge/admin/sites/handler";
import {
  handleDoDiagnosticAdmin,
  handleSystemPerformanceAdmin,
} from "@/lib/edge/admin/system/handler";
import {
  handleMembersAdmin,
  handleProfileAdmin,
} from "@/lib/edge/admin/users/handlers";
import {
  readSiteTrackingConfig,
  upsertSiteScriptSettings,
  upsertSiteTrackingConfig,
} from "@/lib/edge/sites/settings-store";
import type { Env } from "@/lib/edge/types";
import { DEFAULT_SITE_SCRIPT_SETTINGS } from "@/lib/site-settings";

vi.mock("@/lib/edge/admin/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof AuthModule>()),
  byId: vi.fn(),
  listMembers: vi.fn(),
  requireActor: vi.fn(),
}));
vi.mock("@/lib/edge/admin/access", async (importOriginal) => ({
  ...(await importOriginal<typeof AccessModule>()),
  canManageSite: vi.fn(),
  canReadSite: vi.fn(),
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
const actor: Actor = {
  user: {
    id: "actor-1",
    email: "actor@example.test",
    name: "Actor",
    timezone: "UTC",
    created_at: 100,
    updated_at: 200,
  },
  teamId: "team-1",
  role: "admin",
  isAdmin: true,
};
const memberActor: Actor = {
  ...actor,
  user: { ...actor.user, id: "member-1" },
  role: "member",
  isAdmin: false,
};
const requireActorMock = vi.mocked(requireActor);
const byIdMock = vi.mocked(byId);
const readSiteTrackingConfigMock = vi.mocked(readSiteTrackingConfig);
const upsertSiteScriptSettingsMock = vi.mocked(upsertSiteScriptSettings);
function statement(
  input: {
    first?: unknown;
    all?: Record<string, unknown>[];
    run?: unknown;
  } = {},
): MockStatement {
  const stmt = {
    bind: vi.fn(function (this: MockStatement) {
      return this;
    }),
    first: vi.fn().mockResolvedValue("first" in input ? input.first : null),
    all: vi.fn().mockResolvedValue({ results: input.all ?? [] }),
    run: vi.fn().mockResolvedValue(input.run ?? { success: true }),
  } satisfies MockStatement;
  return stmt;
}
function createEnv(statements: MockStatement[] = []): {
  env: Env;
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
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
  return {
    env: {
      DB: { prepare, batch } as unknown as D1Database,
      DAILY_SALT_SECRET: "daily-salt",
    } as Env,
    prepare,
    batch,
  };
}
function request(path: string, init?: RequestInit): Request {
  return new Request(`https://edge.test${path}`, init);
}
function jsonInit(
  body: unknown,
  method: "POST" | "PATCH" = "POST",
): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
async function jsonOf(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}
describe("admin handler low branches", () => {
  beforeEach(() => {
    requireActorMock.mockResolvedValue(actor);
    byIdMock.mockResolvedValue(actor.user);
    vi.mocked(listMembers).mockResolvedValue([
      {
        userId: "actor-1",
        email: "actor@example.test",
        name: "Actor",
        role: "admin",
        lastSeenAt: 100,
      },
      {
        userId: "member-1",
        email: "actor@example.test",
        name: "Actor",
        role: "member",
        lastSeenAt: 100,
      },
    ]);
    vi.mocked(canManageSite).mockResolvedValue(true);
    vi.mocked(canReadSite).mockResolvedValue(true);
    readSiteTrackingConfigMock.mockResolvedValue(null);
    vi.mocked(upsertSiteTrackingConfig).mockResolvedValue({
      siteId: "site-1",
      siteDomain: "example.com",
      allowedHostnames: [],
      ...DEFAULT_SITE_SCRIPT_SETTINGS,
    });
    upsertSiteScriptSettingsMock.mockResolvedValue(
      DEFAULT_SITE_SCRIPT_SETTINGS,
    );
  });

  it("passes through actor responses before members, profile, and sites do work", async () => {
    const authResponse = new Response(JSON.stringify({ ok: false }), {
      status: 401,
    });
    requireActorMock.mockResolvedValue(authResponse);
    const env = createEnv();

    await expect(
      handleMembersAdmin(request("/admin/members"), env.env),
    ).resolves.toBe(authResponse);
    await expect(
      handleProfileAdmin(request("/admin/profile"), env.env),
    ).resolves.toBe(authResponse);
    await expect(
      handleSitesAdmin(
        request("/admin/sites?teamId=team-1"),
        env.env,
        new URL("https://edge.test/admin/sites?teamId=team-1"),
      ),
    ).resolves.toBe(authResponse);
    expect(env.prepare).not.toHaveBeenCalled();
  });

  it("lists mirrored members for organization admins only", async () => {
    const listed = await handleMembersAdmin(
      request("/admin/members"),
      createEnv().env,
    );
    await expect(jsonOf(listed)).resolves.toMatchObject({
      ok: true,
      data: [
        { teamId: "team-1", userId: "actor-1", role: "admin" },
        { teamId: "team-1", userId: "member-1", role: "member" },
      ],
    });

    requireActorMock.mockResolvedValue(memberActor);
    const denied = await handleMembersAdmin(
      request("/admin/members"),
      createEnv().env,
    );
    expect(denied.status).toBe(403);
  });

  it("rejects unsupported profile methods", async () => {
    const profileResponse = await handleProfileAdmin(
      request("/admin/profile", { method: "DELETE" }),
      createEnv().env,
    );
    expect(profileResponse.status).toBe(405);
  });

  it("updates the profile's name, time zone, and locale only", async () => {
    const updateStatement = statement();

    const response = await handleProfileAdmin(
      request(
        "/admin/profile",
        jsonInit({
          name: "Updated Actor",
          timeZone: "UTC",
          email: "ignored@example.test",
        }),
      ),
      createEnv([updateStatement]).env,
    );

    expect(response.status).toBe(200);
    expect(updateStatement.bind).toHaveBeenCalledWith(
      "Updated Actor",
      "UTC",
      "",
      "actor-1",
    );
  });

  it("covers site defaults, public slug fallback, config fallback, and snippet base trimming", async () => {
    const siteUuid = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000456");
    const insertSite = statement();

    const created = await handleSitesAdmin(
      request(
        "/admin/sites",
        jsonInit({
          teamId: "team-1",
          name: "Docs Site",
          domain: "docs.example.test",
        }),
      ),
      createEnv([insertSite]).env,
      new URL("https://edge.test/admin/sites"),
    );
    expect(created.status).toBe(200);
    expect(siteUuid).toHaveBeenCalled();
    expect(insertSite.bind).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000456",
      "team-1",
      "Docs Site",
      "docs.example.test",
      0,
      null,
    );
    expect(upsertSiteScriptSettingsMock).toHaveBeenCalledWith(
      expect.anything(),
      "00000000-0000-4000-8000-000000000456",
      {
        siteDomain: "docs.example.test",
        settings: DEFAULT_SITE_SCRIPT_SETTINGS,
      },
    );

    const existingSite = statement({
      first: {
        id: "site-1",
        teamId: "team-1",
        name: "Docs",
        domain: "docs.example.test",
        publicEnabled: 0,
        publicSlug: null,
      },
    });
    const slugCheckUpdate = statement({ first: null });
    const updateSite = statement();
    const published = await handleSitesAdmin(
      request(
        "/admin/sites",
        jsonInit({ siteId: "site-1", publicEnabled: true }, "PATCH"),
      ),
      createEnv([existingSite, slugCheckUpdate, updateSite]).env,
      new URL("https://edge.test/admin/sites"),
    );
    expect(published.status).toBe(200);
    expect(updateSite.bind).toHaveBeenCalledWith(
      "Docs",
      "docs.example.test",
      1,
      "docs",
      "site-1",
    );

    const configResponse = await handleSitesAdmin(
      request("/admin/sites?teamId=team-1", { method: "OPTIONS" }),
      createEnv().env,
      new URL("https://edge.test/admin/sites?teamId=team-1"),
    );
    expect(configResponse.status).toBe(405);
  });

  it("returns default site config and builds script snippets from trimmed edge base URLs", async () => {
    readSiteTrackingConfigMock.mockResolvedValueOnce(null);
    const config = await handleSiteConfigAdmin(
      request("/admin/site-config?siteId=site-1", { method: "GET" }),
      createEnv().env,
      new URL("https://edge.test/admin/site-config?siteId=site-1"),
    );
    expect(config.status).toBe(200);
    await expect(jsonOf(config)).resolves.toMatchObject({
      ok: true,
      data: expect.objectContaining(DEFAULT_SITE_SCRIPT_SETTINGS),
    });

    const snippet = await handleScriptSnippetAdmin(
      request("/admin/script-snippet?siteId=site 1", { method: "GET" }),
      createEnv().env,
      new URL("https://edge.test/admin/script-snippet?siteId=site%201"),
    );
    expect(snippet.status).toBe(200);
    await expect(jsonOf(snippet)).resolves.toMatchObject({
      ok: true,
      data: {
        siteId: "site 1",
        src: "https://edge.test/script.js?siteId=site%201",
        snippet:
          '<script defer src="https://edge.test/script.js?siteId=site%201"></script>',
      },
    });
  });

  it("rejects non-admin and unsupported methods before system admin database work", async () => {
    const env = createEnv();
    const nonAdminResolver = vi.fn().mockResolvedValue({ isAdmin: false });
    const adminResolver = vi.fn().mockResolvedValue({ isAdmin: true });
    const performanceUrl = new URL(
      "https://edge.test/admin/system-performance",
    );
    const diagnosticUrl = new URL("https://edge.test/admin/do-diagnostic");

    const performanceForbidden = await handleSystemPerformanceAdmin(
      request("/admin/system-performance", { method: "GET" }),
      env.env,
      performanceUrl,
      nonAdminResolver,
    );
    expect(performanceForbidden.status).toBe(403);
    await expect(jsonOf(performanceForbidden)).resolves.toMatchObject({
      error: { message: "Only system admin can view system performance" },
    });

    const performanceMethod = await handleSystemPerformanceAdmin(
      request("/admin/system-performance", { method: "POST" }),
      env.env,
      performanceUrl,
      adminResolver,
    );
    expect(performanceMethod.status).toBe(405);

    const diagnosticForbidden = await handleDoDiagnosticAdmin(
      request("/admin/do-diagnostic", { method: "GET" }),
      env.env,
      diagnosticUrl,
      nonAdminResolver,
    );
    expect(diagnosticForbidden.status).toBe(403);
    await expect(jsonOf(diagnosticForbidden)).resolves.toMatchObject({
      error: { message: "Only system admin can view DO diagnostics" },
    });

    const diagnosticMethod = await handleDoDiagnosticAdmin(
      request("/admin/do-diagnostic", { method: "POST" }),
      env.env,
      diagnosticUrl,
      adminResolver,
    );
    expect(diagnosticMethod.status).toBe(405);
    expect(env.prepare).not.toHaveBeenCalled();
  });
});
