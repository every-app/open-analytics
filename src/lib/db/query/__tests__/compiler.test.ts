import type { DatabaseSync } from "node:sqlite";
import { type SQLInputValue } from "node:sqlite";

import { describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createDatabaseClient, createDatabaseRuntime } from "@/lib/db";
import {
  add,
  aggregate,
  and,
  avg,
  caseWhen,
  coalesce,
  compileD1Mutation,
  compileD1Query,
  countDistinct,
  D1StatementBudgetError,
  deleteFrom,
  eq,
  excluded,
  filter,
  gt,
  insert,
  insertOrIgnore,
  isNotNull,
  join,
  limit,
  max,
  onConflictDoNothing,
  onConflictDoUpdate,
  param,
  project,
  scalar,
  scan,
  sort,
  sum,
  unixepoch,
  update,
} from "@/lib/db";
import { compileD1Expression } from "@/lib/db/query/compiler";
import { directScanProjectionChoices } from "@/lib/db/query/physical-plan";
import { schema } from "@/lib/db/schema";
import type { DatabaseRuntime } from "@/lib/db/types";

function executeAll(
  db: DatabaseSync,
  query: { sql: string; bindings?: readonly unknown[] },
) {
  return db
    .prepare(query.sql)
    .all(...((query.bindings ?? []) as SQLInputValue[]));
}

function executeRun(
  db: DatabaseSync,
  mutation: { sql: string; bindings?: readonly unknown[] },
) {
  return db
    .prepare(mutation.sql)
    .run(...((mutation.bindings ?? []) as SQLInputValue[]));
}

describe("typed D1 query compiler", () => {
  it("compiles excluded values and rejects columns without a SQL scope", () => {
    expect(
      compileD1Expression(
        excluded(schema.site_identities.columns.site_id),
        new Map(),
      ).text,
    ).toBe('"excluded"."site_id"');

    const relation = scan(schema.site_identities);
    expect(() =>
      compileD1Expression(relation.columns.site_id, new Map()),
    ).toThrowError(/No SQL scope is available/);
  });

  it("compiles representative query IR nodes with stable SQL and bindings", () => {
    const users = scan(schema.users);
    const lookup = limit(filter(users, eq(users.columns.id, param("u-1"))), 1);
    const query = compileD1Query(lookup, { tag: "users.lookup" });
    expect(query.sql).toContain('FROM "users"');
    expect(query.sql).toContain('WHERE ("q0"."_c0" = ?)');
    expect(query.bindings).toEqual(["u-1", 1]);
    expect(query.tag).toBe("users.lookup");
    expect(compileD1Query(lookup)).toEqual(compileD1Query(lookup));

    const visits = scan(schema.visits);
    const range = filter(
      visits,
      and(
        eq(visits.columns.site_pk, param(7)),
        gt(visits.columns.started_at, param(100)),
      ),
    );
    const rangeQuery = compileD1Query(range);
    expect(rangeQuery.sql).toContain('"site_pk"');
    expect(rangeQuery.bindings).toEqual([7, 100]);

    const totals = aggregate(visits, {
      groupBy: { country: visits.columns.country },
      aggregates: {
        visitors: countDistinct(visits.columns.visitor_id),
        averageDuration: avg(visits.columns.duration_ms),
        latestVisit: max(visits.columns.started_at),
      },
    });
    const aggregateQuery = compileD1Query(totals);
    expect(aggregateQuery.sql).toContain("COUNT(DISTINCT");
    expect(aggregateQuery.sql).toContain("GROUP BY");

    const events = scan(schema.custom_events);
    const names = scan(schema.custom_event_names);
    const joined = join(
      events,
      names,
      eq(events.columns.event_name_id, names.columns.id),
    );
    expect(compileD1Query(joined).sql).toContain("INNER JOIN");

    const pages = project(visits, {
      item_id: visits.columns.visit_id,
      occurred_at: visits.columns.started_at,
    });
    expect(
      compileD1Query(
        sort(pages, [
          { expression: pages.columns.occurred_at, direction: "DESC" },
        ]),
      ).sql,
    ).toContain("ORDER BY");

    const numeric = project(visits, {
      next_time: add(visits.columns.started_at, param(1)),
    });
    expect(compileD1Query(numeric).bindings).toEqual([1]);
  });

  it("selects direct Scan projection columns without changing DAL row semantics", () => {
    const db = createMigratedDatabase();
    try {
      for (const [id, name] of [
        ["projection-match-1", "shared-site"],
        ["projection-match-2", "shared-site"],
        ["projection-unmatched", "missing-site"],
        ["projection-null", null],
      ] as const)
        db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").run(
          id,
          `${id}@example.test`,
          name,
        );
      db.prepare("INSERT INTO site_identities (site_id) VALUES (?)").run(
        "shared-site",
      );

      const userRows = scan(schema.users);
      const namedUsers = project(userRows, {
        nameKey: userRows.columns.name,
        userId: userRows.columns.id,
        repeatedNameKey: userRows.columns.name,
        locale: userRows.columns.preferred_locale,
      });
      const filteredUsers = filter(
        namedUsers,
        eq(namedUsers.columns.locale, param("")),
      );
      const siteRows = scan(schema.site_identities);
      const namedSites = project(siteRows, {
        lookupKey: siteRows.columns.site_id,
      });
      const joined = join(
        filteredUsers,
        namedSites,
        eq(filteredUsers.columns.nameKey, namedSites.columns.lookupKey),
        "left",
      );
      const relation = project(joined, {
        matchedSite: joined.columns.right_lookupKey,
        name: joined.columns.left_nameKey,
        userId: joined.columns.left_userId,
        duplicateName: joined.columns.left_repeatedNameKey,
      });

      expect(
        [...directScanProjectionChoices(relation.node).values()].map(
          ({ sqlColumnNames }) => [...sqlColumnNames],
        ),
      ).toEqual([["name", "id", "name", "preferred_locale"], ["site_id"]]);
      const optimized = compileD1Query(relation);
      expect(optimized.sql).not.toContain('"email"');
      expect(optimized.sql).not.toContain('"notification_preferences_json"');
      expect(optimized.bindings).toEqual([""]);

      const run = (query: { sql: string; bindings?: readonly unknown[] }) =>
        db
          .prepare(query.sql)
          .all(...((query.bindings ?? []) as SQLInputValue[]));
      const optimizedRows = run(optimized).sort((left, right) =>
        String(left.userId).localeCompare(String(right.userId)),
      );
      expect(optimizedRows).toEqual([
        {
          matchedSite: "shared-site",
          name: "shared-site",
          userId: "projection-match-1",
          duplicateName: "shared-site",
        },
        {
          matchedSite: "shared-site",
          name: "shared-site",
          userId: "projection-match-2",
          duplicateName: "shared-site",
        },
        {
          matchedSite: null,
          name: null,
          userId: "projection-null",
          duplicateName: null,
        },
        {
          matchedSite: null,
          name: "missing-site",
          userId: "projection-unmatched",
          duplicateName: "missing-site",
        },
      ]);

      const duplicateProjection = project(userRows, {
        onlyName: userRows.columns.name,
      });
      const duplicateOptimizedRows = run(
        compileD1Query(duplicateProjection),
      ).sort((left, right) =>
        String(left.onlyName).localeCompare(String(right.onlyName)),
      );
      expect(duplicateOptimizedRows).toHaveLength(4);
      expect(
        duplicateOptimizedRows.filter((row) => row.onlyName === "shared-site"),
      ).toHaveLength(2);

      const computedRows = scan(schema.site_identities);
      const computedProjection = project(computedRows, {
        normalized: coalesce(computedRows.columns.site_id, param("none")),
      });
      expect(directScanProjectionChoices(computedProjection.node).size).toBe(0);

      const outerSites = scan(schema.site_identities);
      const correlatedSites = scan(schema.site_identities);
      const correlatedProjection = project(correlatedSites, {
        outerValue: outerSites.columns.site_id,
      });
      const correlatedMembership = project(outerSites, {
        siteId: outerSites.columns.site_id,
        matched: scalar(correlatedProjection),
      });
      expect(directScanProjectionChoices(correlatedMembership.node).size).toBe(
        0,
      );
    } finally {
      db.close();
    }
  });

  it("enforces the common binding budget for query and mutation compilation", () => {
    const sites = scan(schema.site_identities);
    const projections = Object.fromEntries(
      Array.from({ length: 101 }, (_, index) => [
        `value_${index}`,
        param("private-value"),
      ]),
    );

    try {
      compileD1Query(project(sites, projections), { tag: "query.budget" });
      throw new Error("expected query budget error");
    } catch (error) {
      expect(error).toBeInstanceOf(D1StatementBudgetError);
      expect(error).toMatchObject({
        code: "d1_statement_budget_exceeded",
        item: "bindings",
        actual: 101,
        limit: 100,
        tag: "query.budget",
      });
      expect((error as Error).message).not.toContain("private-value");
    }

    try {
      compileD1Mutation(
        insert(
          schema.site_identities,
          Array.from({ length: 101 }, (_, index) => ({
            site_id: `site-${index}`,
          })),
        ),
        { tag: "mutation.budget" },
      );
      throw new Error("expected mutation budget error");
    } catch (error) {
      expect(error).toBeInstanceOf(D1StatementBudgetError);
      expect(error).toMatchObject({
        code: "d1_statement_budget_exceeded",
        item: "bindings",
        actual: 101,
        limit: 100,
        tag: "mutation.budget",
      });
    }
  });

  it("executes compiled reads and writes against an in-memory migration database", () => {
    const db = createMigratedDatabase();
    try {
      db.exec("PRAGMA foreign_keys = ON");
      const sites = scan(schema.site_identities);
      executeRun(
        db,
        compileD1Mutation(
          insert(schema.site_identities, { site_id: "site-a" }),
        ),
      );
      executeRun(
        db,
        compileD1Mutation(
          insert(schema.site_identities, { site_id: "site-b" }),
        ),
      );

      const innerSites = scan(schema.site_identities);
      const matchingSites = filter(
        innerSites,
        eq(innerSites.columns.site_id, sites.columns.site_id),
      );
      const correlatedScalar = scalar(
        project(matchingSites, {
          matched_pk: matchingSites.columns.site_pk,
        }),
      );
      const correlatedProjection = project(sites, {
        site_id: sites.columns.site_id,
        matched_pk: correlatedScalar,
      });
      const correlatedQuery = compileD1Query(correlatedProjection);
      expect(correlatedQuery).toEqual(compileD1Query(correlatedProjection));
      expect(executeAll(db, correlatedQuery)).toEqual([
        { site_id: "site-a", matched_pk: 1 },
        { site_id: "site-b", matched_pk: 2 },
      ]);

      const updateSubquerySource = scan(schema.site_identities);
      const correlatedUpdate = update(schema.site_identities, (columns) => {
        const matchingRow = filter(
          updateSubquerySource,
          eq(updateSubquerySource.columns.site_pk, columns.site_pk),
        );
        return {
          set: {
            site_id: coalesce(
              scalar(
                project(matchingRow, {
                  site_id: matchingRow.columns.site_id,
                }),
              ),
              param("site-a"),
            ),
          },
          where: eq(columns.site_pk, param(1)),
        };
      });
      const compiledCorrelatedUpdate = compileD1Mutation(correlatedUpdate);
      expect(compiledCorrelatedUpdate.sql).toContain('"t0"."site_pk"');
      executeRun(db, compiledCorrelatedUpdate);
      expect(
        db
          .prepare("SELECT site_id FROM site_identities WHERE site_pk = 1")
          .get(),
      ).toEqual({ site_id: "site-a" });

      const emptyScalarSource = scan(schema.site_identities);
      const missingSites = filter(
        emptyScalarSource,
        eq(emptyScalarSource.columns.site_id, param("missing")),
      );
      const emptyScalar = scalar(
        project(missingSites, { missing: missingSites.columns.site_id }),
      );
      expect(
        executeAll(
          db,
          compileD1Query(
            project(sites, {
              site_id: sites.columns.site_id,
              missing: emptyScalar,
            }),
          ),
        ),
      ).toEqual([
        { site_id: "site-a", missing: null },
        { site_id: "site-b", missing: null },
      ]);

      const find = limit(
        filter(sites, eq(sites.columns.site_id, param("site-a"))),
        1,
      );
      const compiled = compileD1Query(find);
      const actual = executeAll(db, compiled);
      const expected = db
        .prepare("SELECT * FROM site_identities WHERE site_id = ? LIMIT 1")
        .all("site-a");
      expect(actual).toEqual(expected);

      const copyInsert = onConflictDoNothing(
        insert(schema.site_identities, { site_id: "site-a" }),
        ["site_id"],
      );
      executeRun(db, compileD1Mutation(copyInsert));
      executeRun(
        db,
        compileD1Mutation(
          insertOrIgnore(schema.site_identities, { site_id: "site-a" }),
        ),
      );
      executeRun(
        db,
        compileD1Mutation(
          onConflictDoUpdate(
            insert(schema.site_identities, { site_id: "site-updated" }),
            ["site_id"],
            { site_id: "site-updated" },
          ),
        ),
      );

      const updatePlan = update(schema.site_identities, (columns) => ({
        set: { site_id: "site-renamed" },
        where: eq(columns.site_pk, param(2)),
      }));
      executeRun(db, compileD1Mutation(updatePlan));
      expect(
        db
          .prepare("SELECT site_id FROM site_identities WHERE site_pk = 2")
          .get(),
      ).toEqual({ site_id: "site-renamed" });

      const deletePlan = deleteFrom(schema.site_identities, (columns) =>
        eq(columns.site_pk, param(1)),
      );
      executeRun(db, compileD1Mutation(deletePlan));
      expect(
        db
          .prepare("SELECT site_id FROM site_identities WHERE site_pk = 1")
          .get(),
      ).toBeUndefined();
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM site_identities").get(),
      ).toEqual({ count: 2 });
    } finally {
      db.close();
    }
  });

  it("executes searched CASE expressions in projections, aggregates, and updates", () => {
    const db = createMigratedDatabase();
    try {
      executeRun(
        db,
        compileD1Mutation(
          insert(schema.site_identities, { site_id: "site-a" }),
        ),
      );
      executeRun(
        db,
        compileD1Mutation(
          insert(schema.site_identities, { site_id: "site-b" }),
        ),
      );

      const sites = scan(schema.site_identities);
      const label = caseWhen(
        [
          {
            when: eq(sites.columns.site_id, param("site-a")),
            then: param("alpha"),
          },
          {
            when: eq(sites.columns.site_id, param("site-b")),
            then: param("beta"),
          },
        ],
        param("fallback"),
      );
      const nested = caseWhen(
        [
          {
            when: eq(sites.columns.site_id, param("site-a")),
            then: caseWhen(
              [
                {
                  when: isNotNull(sites.columns.site_id),
                  then: param("inner"),
                },
              ],
              param("inner-fallback"),
            ),
          },
        ],
        param("outer"),
      );
      const noElse = caseWhen([
        {
          when: eq(sites.columns.site_id, param("site-a")),
          then: param("only-a"),
        },
      ]);
      const projection = project(sites, {
        site_id: sites.columns.site_id,
        label,
        no_else: noElse,
        nested,
      });
      const compiledProjection = compileD1Query(
        sort(projection, [
          { expression: projection.columns.site_id, direction: "ASC" },
        ]),
      );
      expect(compiledProjection.sql).toContain("CASE WHEN");
      expect(compiledProjection.sql).toContain("ELSE");
      expect(compiledProjection.bindings).toEqual([
        "site-a",
        "alpha",
        "site-b",
        "beta",
        "fallback",
        "site-a",
        "only-a",
        "site-a",
        "inner",
        "inner-fallback",
        "outer",
      ]);
      expect(executeAll(db, compiledProjection)).toEqual([
        {
          site_id: "site-a",
          label: "alpha",
          no_else: "only-a",
          nested: "inner",
        },
        {
          site_id: "site-b",
          label: "beta",
          no_else: null,
          nested: "outer",
        },
      ]);

      const totalMatched = aggregate(sites, {
        groupBy: {},
        aggregates: {
          matched: sum(
            caseWhen(
              [
                {
                  when: eq(sites.columns.site_id, param("site-a")),
                  then: param(1),
                },
              ],
              param(0),
            ),
          ),
        },
      });
      expect(executeAll(db, compileD1Query(totalMatched))).toEqual([
        { matched: 1 },
      ]);

      const updateStatement = compileD1Mutation(
        update(schema.site_identities, (columns) => ({
          set: {
            site_id: caseWhen(
              [
                {
                  when: eq(columns.site_id, param("site-a")),
                  then: param("site-renamed"),
                },
              ],
              columns.site_id,
            ),
          },
          where: eq(columns.site_id, param("site-a")),
        })),
      );
      expect(updateStatement.bindings).toEqual([
        "site-a",
        "site-renamed",
        "site-a",
      ]);
      executeRun(db, updateStatement);
      const renamedSites = scan(schema.site_identities);
      const renamed = compileD1Query(
        project(renamedSites, { site_id: renamedSites.columns.site_id }),
      );
      expect(executeAll(db, renamed)).toContainEqual({
        site_id: "site-renamed",
      });
    } finally {
      db.close();
    }
  });

  it("compiles and executes unixepoch in projections and mutations without binding it", () => {
    const db = createMigratedDatabase();
    try {
      const configs = scan(schema.configs);
      const clockProjection = compileD1Query(
        project(configs, { now: unixepoch() }),
      );
      expect(clockProjection.sql).toContain("unixepoch()");
      expect(clockProjection.bindings).toEqual([]);

      const insertPlan = insert(schema.configs, {
        config_key: "clock",
        value_json: "{}",
        created_at: unixepoch(),
        updated_at: unixepoch(),
      });
      const compiledInsert = compileD1Mutation(insertPlan);
      expect(compiledInsert.sql).toContain("unixepoch()");
      expect(compiledInsert.bindings).toEqual(["clock", "{}"]);
      executeRun(db, compiledInsert);

      const updatePlan = update(schema.configs, (columns) => ({
        set: { updated_at: unixepoch() },
        where: eq(columns.config_key, param("clock")),
      }));
      const compiledUpdate = compileD1Mutation(updatePlan);
      expect(compiledUpdate.sql).toContain('"updated_at" = unixepoch()');
      executeRun(db, compiledUpdate);

      const upsert = onConflictDoUpdate(
        insert(schema.configs, {
          config_key: "clock",
          value_json: '{"updated":true}',
        }),
        ["config_key"],
        {
          value_json: '{"updated":true}',
          updated_at: unixepoch(),
        },
      );
      const compiledUpsert = compileD1Mutation(upsert);
      expect(compiledUpsert.sql).toContain("unixepoch()");
      expect(compiledUpsert.bindings).toEqual([
        "clock",
        '{"updated":true}',
        '{"updated":true}',
      ]);
      executeRun(db, compiledUpsert);
      expect(
        db
          .prepare("SELECT value_json FROM configs WHERE config_key = ?")
          .get("clock"),
      ).toEqual({ value_json: '{"updated":true}' });

      const currentTime = db.prepare("SELECT unixepoch() AS now").get() as {
        now: number;
      };
      expect(
        db
          .prepare("SELECT updated_at FROM configs WHERE config_key = ?")
          .get("clock"),
      ).toEqual({ updated_at: currentTime.now });
    } finally {
      db.close();
    }
  });

  it("preserves compiled mutation order at the typed client batch boundary", async () => {
    const first = compileD1Mutation(
      insert(schema.site_identities, { site_id: "first" }),
    );
    const second = compileD1Mutation(
      insert(schema.site_identities, { site_id: "second" }),
    );
    const batch = vi.fn(async () => [] as D1Result[]);
    const runtime = { batch } as unknown as DatabaseRuntime;
    await createDatabaseClient(runtime).batch([first, second]);
    expect(batch).toHaveBeenCalledExactlyOnceWith([first, second]);
  });

  it("dispatches typed reads and writes through the unchanged runtime", async () => {
    const result = {
      success: true,
      results: [{ email: "user@example.test" }],
    } as D1Result<{ email: string }>;
    const users = scan(schema.users);
    const query = compileD1Query(
      project(users, { email: users.columns.email }),
    );
    const mutation = compileD1Mutation(
      insert(schema.site_identities, { site_id: "site-a" }),
    );
    const runtime = {
      all: vi.fn(async () => result),
      first: vi.fn(async () => result.results[0] ?? null),
      run: vi.fn(async () => result),
      batch: vi.fn(async () => [result]),
      exec: vi.fn(),
    } as unknown as DatabaseRuntime;
    const client = createDatabaseClient(runtime);

    await expect(client.all(query)).resolves.toBe(result);
    await expect(client.first(query)).resolves.toBe(result.results[0]);
    await expect(client.run(mutation)).resolves.toBe(result);
    expect(runtime.all).toHaveBeenCalledExactlyOnceWith(query);
    expect(runtime.first).toHaveBeenCalledExactlyOnceWith(query);
    expect(runtime.run).toHaveBeenCalledExactlyOnceWith(mutation);
  });

  it("compiles multi-row and default-value inserts and rejects inconsistent rows", () => {
    const multiple = compileD1Mutation(
      insert(schema.site_identities, [
        { site_id: "site-a" },
        { site_id: "site-b" },
      ]),
    );
    expect(multiple.sql).toContain("VALUES (?), (?)");
    expect(multiple.bindings).toEqual(["site-a", "site-b"]);

    const defaults = compileD1Mutation(
      insert(schema.site_identities, {} as never),
    );
    expect(defaults.sql).toContain("DEFAULT VALUES");

    expect(() => insert(schema.site_identities, [] as never)).toThrowError();
    expect(() =>
      insert(schema.site_identities, [
        { site_id: "a" },
        { site_id: "b", site_pk: 2 },
      ] as never),
    ).toThrowError();
    expect(() =>
      insert(schema.site_identities, { site_id: "a", missing: "b" } as never),
    ).toThrowError();
  });

  it("rejects references that do not come from the generated catalog", () => {
    const forged = { ...schema.site_identities };
    expect(() =>
      compileD1Query(scan(forged as typeof schema.site_identities)),
    ).toThrowError(expect.objectContaining({ code: "invalid_plan" }));
  });
});
