import { describe, expect, it } from "vitest";

import {
  add,
  aggregate,
  and,
  avg,
  caseWhen,
  coalesce,
  compileD1Query,
  count,
  div,
  eq,
  filter,
  gt,
  isNotNull,
  isNull,
  limit,
  lt,
  lte,
  max,
  min,
  mul,
  neq,
  or,
  param,
  project,
  scalar,
  scan,
  sort,
  sub,
  sum,
  unixepoch,
} from "@/lib/db";
import { expressionResultType } from "@/lib/db/query/expression";
import { schema } from "@/lib/db/schema";

describe("typed SQL expressions", () => {
  it("attaches SQL affinity and nullability metadata to every expression", () => {
    const sites = scan(schema.sites);

    expect(param("site-a").resultType).toEqual({
      affinity: "text",
      nullable: false,
    });
    expect(param(42).resultType).toEqual({
      affinity: "numeric",
      nullable: false,
    });
    expect(param(new Uint8Array([1])).resultType).toEqual({
      affinity: "blob",
      nullable: false,
    });
    expect(param(null).resultType).toEqual({
      affinity: "unknown",
      nullable: true,
    });
    expect(expressionResultType(param("site-a"))).toEqual({
      affinity: "text",
      nullable: false,
    });
    expect(eq(sites.columns.public_slug, param("slug")).resultType).toEqual({
      affinity: "integer",
      nullable: true,
    });
    expect(isNull(sites.columns.public_slug).resultType).toEqual({
      affinity: "integer",
      nullable: false,
    });
    expect(add(sites.columns.created_at, param(1)).resultType).toEqual({
      affinity: "numeric",
      nullable: false,
    });
    expect(div(param(1), param(0)).resultType).toEqual({
      affinity: "numeric",
      nullable: true,
    });
    expect(
      coalesce(sites.columns.public_slug, param("fallback")).resultType,
    ).toEqual({
      affinity: "text",
      nullable: false,
    });
    expect(
      coalesce(sites.columns.public_slug, sites.columns.created_at).resultType,
    ).toEqual({ affinity: "unknown", nullable: false });
    const mixedFallback = coalesce(param("text"), param(1), param("text"));
    expect(mixedFallback.resultType).toEqual({
      affinity: "unknown",
      nullable: false,
    });
    expect(() =>
      compileD1Query(project(sites, { fallback: mixedFallback })),
    ).not.toThrow();
    expect(count().resultType).toEqual({
      affinity: "integer",
      nullable: false,
    });
    expect(sum(sites.columns.created_at).resultType).toEqual({
      affinity: "numeric",
      nullable: true,
    });
    expect(avg(sites.columns.created_at).resultType).toEqual({
      affinity: "numeric",
      nullable: true,
    });
    expect(min(sites.columns.public_slug).resultType).toEqual({
      affinity: "text",
      nullable: true,
    });
    expect(unixepoch().resultType).toEqual({
      affinity: "integer",
      nullable: false,
    });
    expect(
      scalar(project(sites, { created_at: sites.columns.created_at }))
        .resultType,
    ).toEqual({ affinity: "integer", nullable: true });
    expect(() =>
      scalar(
        project(sites, {
          id: sites.columns.id,
          name: sites.columns.name,
        }),
      ),
    ).toThrowError(/exactly one output field/);
  });

  it("derives CASE affinity and nullability and rejects invalid result branches", () => {
    const sites = scan(schema.sites);
    const requiredText = caseWhen(
      [
        {
          when: isNotNull(sites.columns.name),
          then: param("matched"),
        },
        {
          when: eq(sites.columns.id, param("site-a")),
          then: param("also matched"),
        },
      ],
      param("fallback"),
    );
    expect(requiredText.resultType).toEqual({
      affinity: "text",
      nullable: false,
    });

    const noElse = caseWhen([
      { when: isNotNull(sites.columns.name), then: sites.columns.name },
    ]);
    expect(noElse.resultType).toEqual({ affinity: "text", nullable: true });

    const nullableThen = caseWhen(
      [
        {
          when: isNotNull(sites.columns.name),
          then: sites.columns.public_slug,
        },
      ],
      param("fallback"),
    );
    expect(nullableThen.resultType).toEqual({
      affinity: "text",
      nullable: true,
    });

    const nullableElse = caseWhen(
      [
        {
          when: isNotNull(sites.columns.name),
          then: param("matched"),
        },
      ],
      param(null),
    );
    expect(nullableElse.resultType).toEqual({
      affinity: "text",
      nullable: true,
    });

    expect(() => caseWhen([] as never)).toThrowError(/at least one WHEN/);
    expect(() =>
      caseWhen([
        { when: isNotNull(sites.columns.name), then: param("text") },
        { when: isNotNull(sites.columns.name), then: param(1) },
      ] as never),
    ).toThrowError(/incompatible SQL affinities/);
  });

  it("compiles predicates, null checks, and arithmetic", () => {
    const visits = scan(schema.visits);
    const where = or(
      and(
        eq(visits.columns.site_pk, param(4)),
        lt(visits.columns.started_at, param(200)),
      ),
      isNull(visits.columns.ended_at),
    );
    const query = compileD1Query(filter(visits, where));
    expect(query.sql).toContain(" OR ");
    expect(query.sql).toContain("AND");
    expect(query.sql).toContain("IS NULL");
    expect(query.bindings).toEqual([4, 200]);

    const users = scan(schema.users);
    const textPredicates = compileD1Query(
      filter(
        users,
        and(
          neq(users.columns.email, param("hidden@example.test")),
          isNotNull(users.columns.name),
          gt(users.columns.email, param("a@example.test")),
          lte(users.columns.email, param("z@example.test")),
          lte(users.columns.id, param("z")),
        ),
      ),
    );
    expect(textPredicates.sql).toContain("IS NOT NULL");
    expect(textPredicates.bindings).toEqual([
      "hidden@example.test",
      "a@example.test",
      "z@example.test",
      "z",
    ]);

    const calculated = project(visits, {
      next_start: add(visits.columns.started_at, param(1)),
      previous_start: sub(visits.columns.started_at, param(1)),
      scaled_start: mul(visits.columns.started_at, param(2)),
      divided_start: div(visits.columns.started_at, param(2)),
      maybe_country: coalesce(visits.columns.country, param("unknown")),
    });
    const calculatedSql = compileD1Query(calculated);
    expect(calculatedSql.sql).toContain("COALESCE(");
    expect(calculatedSql.bindings).toEqual([1, 1, 2, 2, "unknown"]);
  });

  it("keeps aggregate expressions in the aggregate plan", () => {
    const visits = scan(schema.visits);
    const summary = aggregate(visits, {
      groupBy: { country: visits.columns.country },
      aggregates: {
        total: count(),
        distinctVisitors: max(visits.columns.started_at),
        minimum: min(visits.columns.started_at),
        sum: sum(visits.columns.started_at),
      },
    });
    const compiled = compileD1Query(summary);
    expect(compiled.sql).toContain("COUNT(*)");
    expect(compiled.sql).toContain("MAX(");
    expect(compiled.sql).toContain("MIN(");
    expect(compiled.sql).toContain("SUM(");
  });

  it("rejects empty query builder shapes", () => {
    const visits = scan(schema.visits);
    expect(() => aggregate(visits, { groupBy: {}, aggregates: {} })).toThrow(
      /groups or aggregates/,
    );
    expect(() => sort(visits, [])).toThrow(/at least one sort key/);
    expect(() => limit(visits, -1)).toThrow(/non-negative safe integer/);
  });
});
