import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { type Actor, requireActor } from "@/lib/edge/admin/auth";
import {
  handleGetStartedAdmin,
  handleSiteTrackingAdmin,
} from "@/lib/edge/admin/setup/get-started";
import type { Env } from "@/lib/edge/types";

vi.mock("@/lib/edge/admin/auth", () => ({ requireActor: vi.fn() }));

const admin = {
  user: { id: "u1", email: "a@example.test" },
  teamId: "org-1",
  role: "admin",
  isAdmin: true,
} as Actor;

function seedTeam(database: DatabaseSync, teamId: string) {
  database
    .prepare("INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)")
    .run(teamId, teamId, teamId);
}

let sitePk = 0;
function seedSite(
  database: DatabaseSync,
  teamId: string,
  siteId: string,
  { publicEnabled = false } = {},
) {
  sitePk += 1;
  database
    .prepare(
      "INSERT INTO sites (id, team_id, name, domain, public_enabled) VALUES (?, ?, ?, 'example.com', ?)",
    )
    .run(siteId, teamId, siteId, publicEnabled ? 1 : 0);
  database
    .prepare("INSERT INTO site_identities (site_pk, site_id) VALUES (?, ?)")
    .run(sitePk, siteId);
  return sitePk;
}

function seedVisit(database: DatabaseSync, pk: number, siteId: string) {
  database
    .prepare(
      `INSERT INTO visits (visit_id, site_pk, site_id, visitor_id, session_id, status,
         started_at, last_activity_at, pathname, hostname)
       VALUES (?, ?, ?, 'v', 'x', 'complete', 1, 1, '/', 'example.com')`,
    )
    .run(`${siteId}-visit`, pk, siteId);
}

function seedMembers(database: DatabaseSync, teamId: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const userId = `${teamId}-user-${index}`;
    database
      .prepare("INSERT INTO users (id, email) VALUES (?, ?)")
      .run(userId, `${userId}@example.test`);
    database
      .prepare("INSERT INTO members (team_id, user_id) VALUES (?, ?)")
      .run(teamId, userId);
  }
}

function seedRule(database: DatabaseSync, teamId: string) {
  database
    .prepare(
      "INSERT INTO notification_rules (id, team_id, name, type) VALUES (?, ?, 'Weekly', 'report')",
    )
    .run(`${teamId}-rule`, teamId);
}

/** An organization that has done every step. */
function seedFinishedTeam(database: DatabaseSync, teamId: string) {
  seedTeam(database, teamId);
  const pk = seedSite(database, teamId, `${teamId}-site`, {
    publicEnabled: true,
  });
  seedVisit(database, pk, `${teamId}-site`);
  seedMembers(database, teamId, 2);
  seedRule(database, teamId);
}

async function getStarted(database: DatabaseSync) {
  const env = { DB: createSqliteD1Database(database) } as Env;
  const response = await handleGetStartedAdmin(
    new Request("https://analytics.example.com/api/private/admin/get-started"),
    env,
  );
  return { status: response.status, body: (await response.json()) as any };
}

async function siteTracking(database: DatabaseSync, siteId: string) {
  const env = { DB: createSqliteD1Database(database) } as Env;
  const url = new URL(
    `https://analytics.example.com/api/private/admin/site-tracking?siteId=${siteId}`,
  );
  const response = await handleSiteTrackingAdmin(new Request(url), env, url);
  return { status: response.status, body: (await response.json()) as any };
}

function doneSteps(body: { data: { steps: { id: string; done: boolean }[] } }) {
  return body.data.steps.filter((step) => step.done).map((step) => step.id);
}

describe("get started", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = createMigratedDatabase();
    vi.mocked(requireActor).mockResolvedValue(admin);
  });

  afterEach(() => {
    database.close();
  });

  it("marks each step done from the organization's sites, visits, members, rules and sharing", async () => {
    seedFinishedTeam(database, "org-1");

    const { body } = await getStarted(database);

    expect(body.data.steps).toEqual([
      { id: "site", done: true },
      { id: "tracking", done: true },
      { id: "team", done: true },
      { id: "notifications", done: true },
      { id: "sharing", done: true },
    ]);
  });

  it("offers nothing before the first site", async () => {
    seedTeam(database, "org-1");
    seedFinishedTeam(database, "org-2");

    const { body } = await getStarted(database);

    expect(body.data.steps).toEqual([]);
  });

  it("offers only installing the script until the organization's own sites get a page view", async () => {
    seedTeam(database, "org-1");
    seedSite(database, "org-1", "site-a");
    seedMembers(database, "org-1", 1);
    seedFinishedTeam(database, "org-2");

    const { body } = await getStarted(database);

    expect(body.data.steps).toEqual([
      { id: "site", done: true },
      { id: "tracking", done: false },
    ]);
  });

  it("keeps tracking done after retention deletes the visits", async () => {
    seedTeam(database, "org-1");
    const pk = seedSite(database, "org-1", "site-a");
    database
      .prepare(
        "INSERT INTO visit_hourly_rollups (site_pk, site_id, hour_bucket, views, input_cutoff_ms) VALUES (?, 'site-a', 1, 5, 0)",
      )
      .run(pk);

    const { body } = await getStarted(database);

    expect(doneSteps(body)).toEqual(["site", "tracking"]);
  });

  it("is for owners and admins", async () => {
    vi.mocked(requireActor).mockResolvedValue({ ...admin, isAdmin: false });

    const { status } = await getStarted(database);

    expect(status).toBe(403);
  });

  it("says whether one of the organization's sites has a page view yet", async () => {
    seedTeam(database, "org-1");
    seedTeam(database, "org-2");
    const tracked = seedSite(database, "org-1", "tracked");
    seedVisit(database, tracked, "tracked");
    seedSite(database, "org-1", "waiting");
    seedSite(database, "org-2", "elsewhere");

    expect((await siteTracking(database, "tracked")).body.data).toEqual({
      hasData: true,
    });
    expect((await siteTracking(database, "waiting")).body.data).toEqual({
      hasData: false,
    });
    expect((await siteTracking(database, "elsewhere")).status).toBe(403);
  });
});
