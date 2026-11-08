import { describe, expect, it } from "vitest";

import {
  aggregate,
  caseWhen,
  compileD1Query,
  count,
  eq,
  excluded,
  filter,
  join,
  limit,
  param,
  project,
  scan,
  sort,
} from "@/lib/db";
import { DatabaseCompilerError } from "@/lib/db/query/errors";
import type { SqlExpression } from "@/lib/db/query/expression";
import type { LogicalQueryNode } from "@/lib/db/query/plan";
import {
  validateLogicalQueryPlan,
  validateMutationExpression,
  validatePredicate,
  validateProjectionFields,
} from "@/lib/db/query/validator";
import { schema } from "@/lib/db/schema";

function expectInvalid(callback: () => unknown): void {
  expect(callback).toThrowError(DatabaseCompilerError);
}

function validateNode(node: LogicalQueryNode): void {
  validateLogicalQueryPlan({ node, scope: node.scope, fields: node.fields });
}

describe("logical query plan validation", () => {
  it("independently validates CASE branches, affinities, and result metadata", () => {
    const users = scan(schema.users);
    const valid = caseWhen(
      [
        {
          when: eq(users.columns.id, param("user-1")),
          then: param("matched"),
        },
      ],
      param("fallback"),
    );
    expect(() =>
      validateMutationExpression(valid, [users.scope]),
    ).not.toThrow();

    const empty = {
      kind: "case",
      branches: [],
      resultType: { affinity: "text", nullable: true },
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(empty, []));

    const invalidWhen = {
      ...valid,
      branches: [{ when: param("not a predicate"), then: param("matched") }],
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(invalidWhen, []));

    const invalidThen = {
      ...valid,
      branches: [
        {
          when: eq(users.columns.id, param("user-1")),
          then: {
            ...param("matched"),
            resultType: { affinity: "numeric", nullable: false },
          },
        },
      ],
      else: param("fallback"),
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(invalidThen, [users.scope]));

    const invalidElseMetadata = {
      ...valid,
      else: {
        ...param("fallback"),
        resultType: { affinity: "numeric", nullable: false },
      },
    } as unknown as SqlExpression;
    expectInvalid(() =>
      validateMutationExpression(invalidElseMetadata, [users.scope]),
    );

    const incompatible = {
      ...valid,
      branches: [
        {
          when: eq(users.columns.id, param("user-1")),
          then: param("text"),
        },
        {
          when: eq(users.columns.id, param("user-2")),
          then: param(1),
        },
      ],
    } as unknown as SqlExpression;
    expectInvalid(() =>
      validateMutationExpression(incompatible, [users.scope]),
    );

    const wrongMetadata = {
      ...valid,
      resultType: { affinity: "text", nullable: true },
    } as unknown as SqlExpression;
    expectInvalid(() =>
      validateMutationExpression(wrongMetadata, [users.scope]),
    );

    const invalidElse = {
      ...valid,
      else: param(1),
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(invalidElse, [users.scope]));
  });

  it("rejects columns from outside the visible relation scope", () => {
    const users = scan(schema.users);
    const visits = scan(schema.visits);
    const invalid = filter(
      users,
      eq(users.columns.id, visits.columns.visit_id),
    );
    expectInvalid(() => compileD1Query(invalid));
  });

  it("rejects malformed expression metadata, scopes, and signatures", () => {
    const users = scan(schema.users);
    expectInvalid(() =>
      validatePredicate(
        eq(users.columns.id, param("u-1")),
        [users.scope],
        new Map([[users.scope, []]]),
      ),
    );

    expectInvalid(() =>
      validateMutationExpression(excluded(schema.users.columns.id), []),
    );

    const stringParameter = param("text");
    expectInvalid(() =>
      validateMutationExpression(
        {
          ...stringParameter,
          resultType: { affinity: "numeric", nullable: false },
        } as SqlExpression,
        [],
      ),
    );

    const invalidSumInput = {
      kind: "aggregate",
      name: "SUM",
      expression: param("text"),
      resultType: { affinity: "numeric", nullable: true },
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(invalidSumInput, []));

    const validCoalesce = {
      kind: "coalesce",
      expressions: [param("text")],
      resultType: { affinity: "text", nullable: false },
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(validCoalesce, []));

    const invalidUnixepoch = {
      kind: "unixepoch",
      resultType: { affinity: "integer", nullable: true },
    } as unknown as SqlExpression;
    expectInvalid(() => validateMutationExpression(invalidUnixepoch, []));
  });

  it("checks identifiers, field uniqueness, and expression forms", () => {
    expectInvalid(() =>
      validateProjectionFields([{ name: "same" }, { name: "same" }]),
    );
    expectInvalid(() => validateProjectionFields([{ name: "bad\0name" }]));

    const users = scan(schema.users);
    expectInvalid(() => project(users, { "": users.columns.id }));
    expectInvalid(() => project(users, {}));

    const filtered = filter(users, eq(users.columns.id, param("u-1")));
    const filteredNode = filtered.node as Extract<
      LogicalQueryNode,
      { kind: "filter" }
    >;
    const badBoolean = {
      ...filteredNode,
      predicate: {
        kind: "boolean",
        operator: "AND",
        expressions: [filteredNode.predicate],
      },
    } as unknown as LogicalQueryNode;
    expectInvalid(() => validateNode(badBoolean));

    const badBinary = {
      ...filteredNode,
      predicate: {
        kind: "binary",
        operator: "||",
        left: users.columns.id,
        right: param("x"),
      },
    } as unknown as LogicalQueryNode;
    expectInvalid(() => validateNode(badBinary));
  });

  it("rejects malformed relational row shapes and aggregate outputs", () => {
    const users = scan(schema.users);
    const filtered = filter(users, eq(users.columns.id, param("u-1")));
    const filteredNode = filtered.node as Extract<
      LogicalQueryNode,
      { kind: "filter" }
    >;
    expectInvalid(() => validateNode({ ...filteredNode, fields: [] }));

    const selected = project(users, { email: users.columns.email });
    const selectedNode = selected.node as Extract<
      LogicalQueryNode,
      { kind: "project" }
    >;
    expectInvalid(() =>
      validateNode({
        ...selectedNode,
        projections: [{ name: "wrong", expression: users.columns.email }],
      } as LogicalQueryNode),
    );
    expectInvalid(() =>
      validateNode({
        ...selectedNode,
        fields: [{ name: "email", affinity: "numeric", nullable: false }],
      } as LogicalQueryNode),
    );

    const filteredPredicate = filter(users, eq(users.columns.id, param("u-1")))
      .node as Extract<LogicalQueryNode, { kind: "filter" }>;
    expectInvalid(() =>
      validateNode({
        ...filteredPredicate,
        predicate: {
          ...filteredPredicate.predicate,
          resultType: { affinity: "integer", nullable: false },
        },
      } as LogicalQueryNode),
    );

    const events = scan(schema.custom_events);
    const names = scan(schema.custom_event_names);
    const joined = join(
      events,
      names,
      eq(events.columns.event_name_id, names.columns.id),
    );
    expectInvalid(() =>
      validateNode({
        ...joined.node,
        fields: [],
      } as LogicalQueryNode),
    );

    const grouped = aggregate(users, {
      groupBy: { locale: users.columns.preferred_locale },
      aggregates: { count: count(users.columns.id) },
    });
    expectInvalid(() =>
      validateNode({
        ...grouped.node,
        aggregates: [{ name: "count", expression: users.columns.id }],
      } as unknown as LogicalQueryNode),
    );

    const sorted = sort(users, [
      { expression: users.columns.email, direction: "ASC" },
    ]);
    const sortedNode = sorted.node as Extract<
      LogicalQueryNode,
      { kind: "sort" }
    >;
    expectInvalid(() => validateNode({ ...sortedNode, keys: [] }));
    const limited = limit(users, 2);
    const limitedNode = limited.node as Extract<
      LogicalQueryNode,
      { kind: "limit" }
    >;
    expectInvalid(() => validateNode({ ...limitedNode, count: param(-1) }));
  });
});
