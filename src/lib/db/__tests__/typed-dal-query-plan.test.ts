import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import {
  aggregate,
  and,
  compileD1Mutation,
  compileD1Query,
  count,
  eq,
  filter,
  isNull,
  limit,
  lt,
  lte,
  neq,
  or,
  param,
  project,
  scalar,
  scan,
  schema,
  sort,
  unixepoch,
  update,
} from "@/lib/db";
import { explainQueryPlan } from "@/lib/db/__tests__/query-plan";

const databases = new Set<DatabaseSync>();

function createFixture(): DatabaseSync {
  const database = createMigratedDatabase();
  databases.add(database);

  const insertUser = database.prepare(
    "INSERT INTO users (id, email) VALUES (?, ?)",
  );
  const insertTeam = database.prepare(
    "INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)",
  );
  const insertSite = database.prepare(
    "INSERT INTO sites (id, team_id, name, domain) VALUES (?, ?, ?, ?)",
  );

  for (let index = 0; index < 240; index += 1) {
    const userId = `user-${index}`;
    const teamId = `team-${index}`;
    insertUser.run(userId, `${userId}@example.test`);
    insertTeam.run(teamId, `Team ${index}`, `team-${index}`);
    insertSite.run(`site-${index}`, teamId, `Site ${index}`, `${index}.test`);
  }
  const insertScheduleState = database.prepare(
    "INSERT INTO scheduled_task_schedule_state (task_key, enabled, next_run_at) VALUES (?, ?, ?)",
  );
  for (let index = 0; index < 480; index += 1) {
    insertScheduleState.run(
      `fixture-task-${index}`,
      index % 2,
      index % 3 === 0 ? 10_000 : 1,
    );
  }
  database.exec("ANALYZE");
  return database;
}

function expectIndexSearch(plan: readonly string[], indexName: string): void {
  expect(
    plan.some(
      (detail) => detail.includes("SEARCH") && detail.includes(indexName),
    ),
    plan.join("\n"),
  ).toBe(true);
}

function expectEquivalentScan(
  legacy: readonly string[],
  typed: readonly string[],
): void {
  const hasLegacyScan = legacy.some((detail) => detail.includes("SCAN"));
  const hasTypedScan = typed.some((detail) => detail.includes("SCAN"));
  expect(hasTypedScan, JSON.stringify({ legacy, typed })).toBe(hasLegacyScan);
}

afterEach(() => {
  for (const database of databases) database.close();
  databases.clear();
});

describe("Typed DAL SQLite query-plan guards", () => {
  it("keeps public-site lookups on their existing indexes", () => {
    const database = createFixture();

    const sites = scan(schema.sites);
    const publicSlugRows = filter(
      sites,
      eq(sites.columns.public_slug, param("public-slug")),
    );
    const siteByPublicSlug = compileD1Query(
      limit(project(publicSlugRows, { id: publicSlugRows.columns.id }), 1),
    );
    expectIndexSearch(
      explainQueryPlan(database, siteByPublicSlug),
      "sqlite_autoindex_sites_2",
    );
  });

  it("keeps private-site authorization lookups indexed", () => {
    const database = createFixture();

    const sites = scan(schema.sites);
    const access = filter(
      sites,
      and(
        eq(sites.columns.id, param("site-1")),
        eq(sites.columns.team_id, param("team-1")),
      ),
    );
    const typedPrivateSite = compileD1Query(
      limit(project(access, { id: access.columns.id }), 1),
    );
    expectIndexSearch(
      explainQueryPlan(database, typedPrivateSite),
      "sqlite_autoindex_sites_1",
    );
  });

  it("keeps user and team identity lookups on their indexes", () => {
    const database = createFixture();

    const users = scan(schema.users);
    const userByIdRows = filter(users, eq(users.columns.id, param("user-1")));
    const userById = compileD1Query(
      limit(project(userByIdRows, { id: userByIdRows.columns.id }), 1),
    );
    expectIndexSearch(
      explainQueryPlan(database, userById),
      "sqlite_autoindex_users_1",
    );

    const teams = scan(schema.teams);
    const teamSlugRows = filter(
      teams,
      eq(teams.columns.slug, param("team-one")),
    );
    const teamBySlug = compileD1Query(
      limit(project(teamSlugRows, { id: teamSlugRows.columns.id }), 1),
    );
    expectIndexSearch(
      explainQueryPlan(database, teamBySlug),
      "sqlite_autoindex_teams_2",
    );
  });

  it("guards Teams and Sites admin reads against legacy access-path regressions", () => {
    const database = createFixture();
    const hasTempBTree = (plan: readonly string[]) =>
      plan.some((detail) => detail.includes("USE TEMP B-TREE"));
    const comparePlanShape = (
      legacy: readonly string[],
      typed: readonly string[],
    ) => {
      expectEquivalentScan(legacy, typed);
      expect(hasTempBTree(typed), JSON.stringify({ legacy, typed })).toBe(
        hasTempBTree(legacy),
      );
    };

    const teams = scan(schema.teams);
    const teamIdMatch = filter(teams, eq(teams.columns.id, param("team-1")));
    const typedTeamById = compileD1Query(
      limit(project(teamIdMatch, { id: teamIdMatch.columns.id }), 1),
    );
    const legacyTeamById = {
      sql: "SELECT id FROM teams WHERE id=? LIMIT 1",
      bindings: ["team-1"],
    };
    const legacyTeamByIdPlan = explainQueryPlan(database, legacyTeamById);
    const typedTeamByIdPlan = explainQueryPlan(database, typedTeamById);
    expectIndexSearch(legacyTeamByIdPlan, "sqlite_autoindex_teams_1");
    expectIndexSearch(typedTeamByIdPlan, "sqlite_autoindex_teams_1");
    comparePlanShape(legacyTeamByIdPlan, typedTeamByIdPlan);

    const siteRows = scan(schema.sites);
    const sitesForTeam = filter(
      siteRows,
      eq(siteRows.columns.team_id, param("team-1")),
    );
    const selectedSites = project(sitesForTeam, {
      id: sitesForTeam.columns.id,
      createdAt: sitesForTeam.columns.created_at,
    });
    const typedSiteList = compileD1Query(
      sort(selectedSites, [
        { expression: selectedSites.columns.createdAt, direction: "DESC" },
      ]),
    );
    const legacySiteListPlan = explainQueryPlan(database, {
      sql: "SELECT id,created_at FROM sites WHERE team_id=? ORDER BY created_at DESC",
      bindings: ["team-1"],
    });
    const typedSiteListPlan = explainQueryPlan(database, typedSiteList);
    expectIndexSearch(legacySiteListPlan, "idx_sites_team");
    expectIndexSearch(typedSiteListPlan, "idx_sites_team");
    comparePlanShape(legacySiteListPlan, typedSiteListPlan);

    const slugMatch = filter(
      siteRows,
      and(
        eq(siteRows.columns.public_slug, param("public-slug")),
        neq(siteRows.columns.id, param("site-1")),
      ),
    );
    const typedSlugCheck = compileD1Query(
      limit(project(slugMatch, { id: slugMatch.columns.id }), 1),
    );
    const legacySlugPlan = explainQueryPlan(database, {
      sql: "SELECT id FROM sites WHERE public_slug=? AND id<>? LIMIT 1",
      bindings: ["public-slug", "site-1"],
    });
    const typedSlugPlan = explainQueryPlan(database, typedSlugCheck);
    expectIndexSearch(legacySlugPlan, "sqlite_autoindex_sites_2");
    expectIndexSearch(typedSlugPlan, "sqlite_autoindex_sites_2");
    comparePlanShape(legacySlugPlan, typedSlugPlan);

    const siteCount = scalar(
      aggregate(
        filter(siteRows, eq(siteRows.columns.team_id, param("team-1"))),
        { groupBy: {}, aggregates: { count: count() } },
      ),
    );
    const typedWorkspace = compileD1Query(
      limit(
        project(teamIdMatch, {
          id: teamIdMatch.columns.id,
          name: teamIdMatch.columns.name,
          siteCount,
        }),
        1,
      ),
    );
    const legacyWorkspacePlan = explainQueryPlan(database, {
      sql: "SELECT t.id,t.name,(SELECT COUNT(*) FROM sites s WHERE s.team_id=?) AS siteCount FROM teams t WHERE t.id=? LIMIT 1",
      bindings: ["team-1", "team-1"],
    });
    const typedWorkspacePlan = explainQueryPlan(database, typedWorkspace);
    expectIndexSearch(legacyWorkspacePlan, "idx_sites_team");
    expectIndexSearch(typedWorkspacePlan, "idx_sites_team");
    expectIndexSearch(legacyWorkspacePlan, "sqlite_autoindex_teams_1");
    expectIndexSearch(typedWorkspacePlan, "sqlite_autoindex_teams_1");
  });

  it("keeps scheduled due, claim, and run updates on their existing indexes", () => {
    const database = createFixture();

    const states = scan(schema.scheduled_task_schedule_state);
    const dueStates = filter(
      states,
      and(
        eq(states.columns.enabled, param(1)),
        lte(states.columns.next_run_at, param(2_000)),
      ),
    );
    const dueQuery = compileD1Query(
      project(dueStates, {
        taskKey: dueStates.columns.task_key,
        enabled: dueStates.columns.enabled,
        nextRunAt: dueStates.columns.next_run_at,
      }),
    );
    const duePlan = explainQueryPlan(database, dueQuery);
    const legacyDuePlan = explainQueryPlan(database, {
      sql: "SELECT task_key AS taskKey, enabled, next_run_at AS nextRunAt FROM scheduled_task_schedule_state WHERE enabled=? AND next_run_at<=?",
      bindings: [1, 2_000],
    });
    expectIndexSearch(duePlan, "idx_scheduled_task_schedule_due");
    expectIndexSearch(legacyDuePlan, "idx_scheduled_task_schedule_due");

    const claim = compileD1Mutation(
      update(schema.scheduled_task_schedule_state, (columns) => ({
        set: {
          claim_token: param("claim-token"),
          claim_expires_at: param(10_000),
          updated_at: unixepoch(),
        },
        where: and(
          eq(columns.task_key, param("notification_tick")),
          eq(columns.enabled, param(1)),
          lte(columns.next_run_at, param(2_000)),
          or(
            isNull(columns.claim_token),
            isNull(columns.claim_expires_at),
            lt(columns.claim_expires_at, param(2_000)),
          ),
        ),
      })),
    );
    expectIndexSearch(
      explainQueryPlan(database, claim),
      "sqlite_autoindex_scheduled_task_schedule_state_1",
    );

    const finishRun = compileD1Mutation(
      update(schema.scheduled_task_runs, (columns) => ({
        set: {
          status: param("success"),
          finished_at_ms: param(2_000),
          duration_ms: param(10),
          summary_json: param("{}"),
          error_name: param(null),
          error_message: param(null),
          error_stack: param(null),
        },
        where: eq(columns.id, param("run-id")),
      })),
    );
    expectIndexSearch(
      explainQueryPlan(database, finishRun),
      "sqlite_autoindex_scheduled_task_runs_1",
    );
  });
});
