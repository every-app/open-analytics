import type { DatabaseSync } from "node:sqlite";

import { type EveryAppUser, getEveryAppUser } from "@every-app/sdk/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { ManagerOnly } from "@/lib/edge/admin/access";
import type { Env } from "@/lib/edge/types";
import { apiApp } from "@/lib/hono/app";

// Only the gateway identity is stubbed: every request below runs the real
// private API (viewer, session, access checks, handlers) on a migrated D1.
vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getEveryAppUser: vi.fn(),
}));

const PEOPLE = {
  owner: { id: "owner-1", orgRole: "owner" },
  admin: { id: "admin-1", orgRole: "admin" },
  member: { id: "member-1", orgRole: "member" },
} as const;
type Person = keyof typeof PEOPLE;

const ORG = "org-1";
const SITE = "site-1";
const weeklyReport = {
  type: "report",
  schedule: { kind: "weekly", dayOfWeek: 1, time: "08:00", timezone: "UTC" },
};

let database: DatabaseSync;
let env: Env;
const ctx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
} as unknown as ExecutionContext;

function memoryKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
    delete: async (key: string) => void store.delete(key),
  } as unknown as KVNamespace;
}

interface ApiAnswer {
  status: number;
  body: { ok: boolean; data?: unknown; error?: { message?: string } };
}

async function call(
  as: Person,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiAnswer> {
  const { id, orgRole } = PEOPLE[as];
  vi.mocked(getEveryAppUser).mockResolvedValue({
    id,
    email: `${id}@example.test`,
    orgId: ORG,
    orgRole,
  } as EveryAppUser);
  const response = await apiApp.fetch(
    new Request(`https://analytics.test/api/private${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
    ctx,
  );
  return { status: response.status, body: (await response.json()) as never };
}

function refused(message: ManagerOnly) {
  return {
    status: 403,
    body: { ok: false, error: { code: "owner_or_admin_required", message } },
  };
}

function site() {
  return database
    .prepare("SELECT name, public_enabled AS publicEnabled FROM sites")
    .all();
}

beforeEach(() => {
  database = createMigratedDatabase();
  env = {
    DB: createSqliteD1Database(database),
    SITE_SETTINGS_KV: memoryKv(),
  } as unknown as Env;
  // The viewer mirrors each person once per isolate; each test's fresh
  // database gets them here.
  const insertUser = database.prepare(
    "INSERT INTO users (id, email) VALUES (?, ?)",
  );
  for (const { id } of Object.values(PEOPLE)) {
    insertUser.run(id, `${id}@example.test`);
  }
  database.exec(`
    INSERT INTO teams (id, name, slug) VALUES ('${ORG}', 'Org', 'org');
    INSERT INTO sites (id, team_id, name, domain)
      VALUES ('${SITE}', '${ORG}', 'Site One', 'one.test');
  `);
});

afterEach(() => {
  database.close();
});

describe("private API by organization role", () => {
  it("lets a member read the organization's sites and settings", async () => {
    const session = await call("member", "GET", "/session");
    expect(session.body.data).toMatchObject({
      user: { systemRole: "user" },
      teams: [{ id: ORG, membershipRole: "member" }],
    });
    expect((await call("owner", "GET", "/session")).body.data).toMatchObject({
      user: { systemRole: "admin" },
      teams: [{ membershipRole: "owner" }],
    });

    const sites = await call("member", "GET", `/admin/sites?teamId=${ORG}`);
    expect(sites.status).toBe(200);
    expect(sites.body.data).toMatchObject([{ id: SITE, name: "Site One" }]);
    expect(
      (await call("member", "GET", `/admin/site-config?siteId=${SITE}`)).status,
    ).toBe(200);
    expect((await call("member", "GET", `/goals?siteId=${SITE}`)).status).toBe(
      200,
    );
  });

  it("refuses a member every site, goal, funnel and System change", async () => {
    const writes: Array<[string, string, unknown, ManagerOnly]> = [
      [
        "POST",
        "/admin/sites",
        { teamId: ORG, domain: "new.test" },
        ManagerOnly.Sites,
      ],
      [
        "PATCH",
        "/admin/sites",
        { siteId: SITE, name: "Renamed" },
        ManagerOnly.Sites,
      ],
      [
        "PATCH",
        "/admin/sites",
        { siteId: SITE, publicEnabled: true, publicSlug: "open-site" },
        ManagerOnly.Sites,
      ],
      [
        "PATCH",
        "/admin/sites",
        { siteId: SITE, intent: "remove" },
        ManagerOnly.Sites,
      ],
      [
        "POST",
        "/admin/site-config",
        { siteId: SITE, config: { trackHash: true } },
        ManagerOnly.TrackingSettings,
      ],
      [
        "PATCH",
        "/admin/retention",
        { retention: { analyticsDetailDays: 90 } },
        ManagerOnly.Retention,
      ],
      ["GET", "/admin/get-started", undefined, ManagerOnly.GetStarted],
      [
        "POST",
        `/goals?siteId=${SITE}`,
        { name: "Signup", filterDslVersion: 1, filterDsl: 'event.name eq "x"' },
        ManagerOnly.Goals,
      ],
      [
        "DELETE",
        `/goals?siteId=${SITE}&id=goal-1`,
        undefined,
        ManagerOnly.Goals,
      ],
      [
        "POST",
        `/funnels?siteId=${SITE}`,
        { name: "Checkout", steps: [] },
        ManagerOnly.Funnels,
      ],
    ];

    for (const [method, path, body, message] of writes) {
      expect(await call("member", method, path, body)).toMatchObject(
        refused(message),
      );
    }
    expect(site()).toEqual([{ name: "Site One", publicEnabled: 0 }]);
  });

  it("lets owners and admins make those changes", async () => {
    const created = await call("admin", "POST", "/admin/sites", {
      teamId: ORG,
      domain: "new.test",
    });
    expect(created).toMatchObject({ status: 200, body: { ok: true } });
    expect(
      await call("admin", "PATCH", "/admin/sites", {
        siteId: SITE,
        name: "Renamed",
        publicEnabled: true,
        publicSlug: "open-site",
      }),
    ).toMatchObject({ status: 200, body: { data: { publicEnabled: true } } });
    expect(
      await call("admin", "POST", "/admin/site-config", {
        siteId: SITE,
        config: { trackHash: true },
      }),
    ).toMatchObject({ status: 200, body: { data: { trackHash: true } } });
    expect(
      await call("owner", "PATCH", "/admin/retention", {
        retention: { analyticsDetailDays: 90 },
      }),
    ).toMatchObject({
      status: 200,
      body: { data: { analyticsDetailDays: 90 } },
    });
    expect(
      await call("owner", "POST", `/goals?siteId=${SITE}`, {
        name: "Signup",
        filterDslVersion: 1,
        filterDsl: 'event.name eq "signup"',
      }),
    ).toMatchObject({ status: 201 });
    expect(
      await call("owner", "PATCH", "/admin/sites", {
        siteId: (created.body.data as { id: string }).id,
        intent: "remove",
      }),
    ).toMatchObject({ status: 200, body: { data: { removed: true } } });
    expect(site()).toEqual([{ name: "Renamed", publicEnabled: 1 }]);
  });

  it("lets a member manage their own notification rules, and admins everyone's", async () => {
    const createRule = async (as: Person, name: string) => {
      const answer = await call(as, "POST", "/admin/notification-rules", {
        teamId: ORG,
        siteId: SITE,
        name,
        ...weeklyReport,
      });
      expect(answer.status).toBe(200);
      return answer.body.data as { id: string; createdByUserId: string };
    };
    const ruleIds = async (as: Person) =>
      (
        (await call(as, "GET", `/admin/notification-rules?teamId=${ORG}`)).body
          .data as Array<{ id: string }>
      ).map(({ id }) => id);

    const owners = await createRule("owner", "Owner's report");
    const mine = await createRule("member", "My report");
    expect(mine.createdByUserId).toBe("member-1");

    expect(await ruleIds("member")).toEqual([mine.id]);
    expect((await ruleIds("admin")).sort()).toEqual(
      [owners.id, mine.id].sort(),
    );

    expect(
      await call("member", "PATCH", "/admin/notification-rules", {
        ruleId: owners.id,
        enabled: false,
      }),
    ).toMatchObject({ status: 403 });
    expect(
      await call(
        "member",
        "DELETE",
        `/admin/notification-rules?id=${owners.id}`,
      ),
    ).toMatchObject({ status: 403 });
    expect(
      await call("member", "PATCH", "/admin/notification-rules", {
        ruleId: mine.id,
        enabled: false,
      }),
    ).toMatchObject({ status: 200, body: { data: { enabled: false } } });
    expect(
      await call("admin", "DELETE", `/admin/notification-rules?id=${mine.id}`),
    ).toMatchObject({ status: 200, body: { data: { removed: true } } });
  });
});
