import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import type { EdgeSessionClaims } from "@/lib/edge/auth/session-auth";
import {
  fetchPublicSite,
  resolvePrivateSiteForSession,
  resolvePrivateTeamForSession,
} from "@/lib/edge/auth/site-access";
import type { Env } from "@/lib/edge/types";

const adminSession: EdgeSessionClaims = {
  userId: "admin-user",
  email: "admin@example.test",
  teamId: "team-1",
  systemRole: "admin",
};

const memberSession: EdgeSessionClaims = {
  ...adminSession,
  userId: "member-user",
  systemRole: "user",
};

const otherOrgSession: EdgeSessionClaims = {
  ...adminSession,
  teamId: "team-2",
};

describe("typed site access DAL", () => {
  let database: DatabaseSync;
  let env: Env;

  beforeEach(() => {
    database = createMigratedDatabase();
    env = { DB: createSqliteD1Database(database) } as Env;

    const insertTeam = database.prepare(
      "INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)",
    );
    insertTeam.run("team-1", "Team One", "team-one");
    insertTeam.run("team-2", "Team Two", "team-two");

    const insertSite = database.prepare(
      "INSERT INTO sites (id, team_id, name, domain, public_enabled, public_slug) VALUES (?, ?, ?, ?, ?, ?)",
    );
    insertSite.run("site-1", "team-1", "Private One", "one.example", 0, null);
    insertSite.run(
      "site-2",
      "team-1",
      "Public Two",
      "two.example",
      1,
      "public-two",
    );
  });

  afterEach(() => {
    database.close();
  });

  it("resolves organization sites, with manage rights for admins only", async () => {
    const request = new Request("https://app.test/api/private/site");
    const siteUrl = new URL("https://app.test/api/private/site?siteId=site-1");

    await expect(
      resolvePrivateSiteForSession(request, env, siteUrl, adminSession),
    ).resolves.toEqual({
      id: "site-1",
      name: "Private One",
      domain: "one.example",
      canManage: true,
    });
    await expect(
      resolvePrivateSiteForSession(request, env, siteUrl, memberSession),
    ).resolves.toMatchObject({ id: "site-1", canManage: false });

    const otherOrg = await resolvePrivateSiteForSession(
      request,
      env,
      siteUrl,
      otherOrgSession,
    );
    expect((otherOrg as Response).status).toBe(404);
  });

  it("resolves the session's workspace and refuses another team", async () => {
    const request = new Request("https://app.test/api/private/team");

    await expect(
      resolvePrivateTeamForSession(
        request,
        env,
        new URL("https://app.test/api/private/team"),
        memberSession,
      ),
    ).resolves.toEqual({ id: "team-1" });
    await expect(
      resolvePrivateTeamForSession(
        request,
        env,
        new URL("https://app.test/api/private/team?teamId=team-1"),
        memberSession,
      ),
    ).resolves.toEqual({ id: "team-1" });

    const otherTeam = await resolvePrivateTeamForSession(
      request,
      env,
      new URL("https://app.test/api/private/team?teamId=team-2"),
      adminSession,
    );
    expect((otherTeam as Response).status).toBe(404);
  });

  it("exposes enabled public sites by slug and hides disabled or missing sites", async () => {
    await expect(
      fetchPublicSite(
        env,
        new URL("https://app.test/api/public-sites/share/public-two/overview"),
      ),
    ).resolves.toEqual({
      id: "site-2",
      name: "Public Two",
      domain: "two.example",
    });

    const disabled = await fetchPublicSite(
      env,
      new URL("https://app.test/api/public-sites/share/site-1/overview"),
    );
    const missing = await fetchPublicSite(
      env,
      new URL("https://app.test/api/public-sites/share/missing/overview"),
    );
    expect((disabled as Response).status).toBe(404);
    expect((missing as Response).status).toBe(404);
  });
});
