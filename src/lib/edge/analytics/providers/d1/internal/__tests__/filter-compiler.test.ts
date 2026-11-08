import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { applyD1Limits } from "@/lib/db/__tests__/sqlite-d1";
import { compileFilterDocument } from "@/lib/edge/analytics/providers/d1/internal/filter-compiler";
import {
  analyticsFilterRegistry,
  normalizeFilterDocument,
} from "@/lib/filter-contract";

function document(root: unknown) {
  return normalizeFilterDocument({ version: 1, root }, analyticsFilterRegistry);
}

describe("filter SQL compiler", () => {
  it("compiles numeric and boolean observation fields without text coercion", () => {
    const numeric = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "client.screenWidth" },
        operator: "gte",
        value: 1024,
      }),
      { alias: "vs" },
    );
    expect(numeric.clause).toContain("vs.screen_width >= ?");
    expect(numeric.clause).not.toContain("TRIM(COALESCE");
    expect(numeric.bindings).toEqual([1024]);

    const boolean = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "geo.isEU" },
        operator: "eq",
        value: true,
      }),
      { alias: "vs" },
    );
    expect(boolean.clause).toContain("vs.is_eu = ?");
    expect(boolean.bindings).toEqual([1]);
  });

  it("preserves nullable numeric presence predicates", () => {
    const result = compileFilterDocument(
      document({
        kind: "and",
        children: [
          {
            kind: "condition",
            target: { kind: "field", field: "page.durationMs" },
            operator: "isNull",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "client.screenWidth" },
            operator: "notNull",
          },
        ],
      }),
      { alias: "vs" },
    );
    expect(result.clause).toContain("vs.duration_ms IS NULL");
    expect(result.clause).toContain("vs.screen_width IS NOT NULL");
  });

  it("compiles traffic channel filters against the stored channel", () => {
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "traffic.channel" },
        operator: "eq",
        value: "organic_search",
      }),
      { alias: "vs" },
    );

    expect(result.clause).toContain("vs.channel");
    expect(result.clause).not.toContain("referrer_host");
    expect(result.clause).toContain("= ?");
    expect(result.bindings).toEqual(["organic_search"]);
  });

  it("matches strict root-or-subdomain predicates with generic JSON-bound OR sets", () => {
    const database = applyD1Limits(new DatabaseSync(":memory:"));
    try {
      database.exec(`
        CREATE TABLE visits (id TEXT PRIMARY KEY, referrer_host TEXT);
      `);
      const insert = database.prepare(
        "INSERT INTO visits (id, referrer_host) VALUES (?, ?)",
      );
      for (const [id, referrerHost] of [
        ["root", "google.com"],
        ["subdomain", "www.google.com"],
        ["regional-subdomain", "www.google.com.hk"],
        ["other-root", "bing.com"],
        ["other-subdomain", "cn.bing.com"],
        ["case-and-space", "  WWW.Google.Com  "],
        ["false-prefix", "evilgoogle.com"],
        ["false-suffix", "evil.google.com.evil"],
        ["literal-percent", "sub.literal%domain.test"],
        ["literal-underscore", "sub.literal_domain.test"],
        ["literal-backslash", "sub.literal\\domain.test"],
        ["direct", "__direct__"],
        ["empty", ""],
        ["null", null],
      ] as const) {
        insert.run(id, referrerHost);
      }

      const roots = [
        "google.com",
        "google.com.hk",
        "bing.com",
        "literal%domain.test",
        "literal_domain.test",
        "literal\\domain.test",
      ];
      const normalized = "LOWER(TRIM(COALESCE(referrer_host, '')))";
      const baselineClause = roots
        .map(() => `(${normalized} = ? OR ${normalized} LIKE ? ESCAPE '\\')`)
        .join(" OR ");
      const baselineBindings = roots.flatMap((root) => [
        root,
        `%.${root.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}`,
      ]);
      const escapedRoot = `REPLACE(REPLACE(REPLACE(roots.value, '\\', '\\\\'), '%', '\\%'), '_', '\\_')`;
      const optimizedClause = `(
        ${normalized} IN (SELECT value FROM json_each(?))
        OR EXISTS (
          SELECT 1
          FROM json_each(?) AS roots
          WHERE ${normalized} LIKE '%' || ${escapedRoot} ESCAPE '\\'
        )
      )`;

      const queryIds = (clause: string, bindings: readonly string[]) =>
        database
          .prepare(`SELECT id FROM visits WHERE ${clause} ORDER BY id`)
          .all(...bindings)
          .map((row) => (row as { id: string }).id);
      const baseline = queryIds(baselineClause, baselineBindings);
      const optimized = queryIds(optimizedClause, [
        JSON.stringify(roots),
        JSON.stringify(roots.map((root) => `.${root}`)),
      ]);
      const compiled = compileFilterDocument(
        document({
          kind: "or",
          children: roots.flatMap((root) => [
            {
              kind: "condition",
              target: { kind: "field", field: "referrer.domain" },
              operator: "eq",
              value: root,
            },
            {
              kind: "condition",
              target: { kind: "field", field: "referrer.domain" },
              operator: "endsWith",
              value: `.${root}`,
            },
          ]),
        }),
      );
      const compiledIds = database
        .prepare(
          `SELECT id FROM visits AS visit_source ${compiled.clause} ORDER BY id`,
        )
        .all(...compiled.bindings)
        .map((row) => (row as { id: string }).id);

      expect(optimized).toEqual(baseline);
      expect(compiledIds).toEqual(baseline);
      expect(compiled.clause).toContain("json_each(?)");
      expect(compiled.bindings).toHaveLength(7);
      expect(
        new Set([
          ...compiled.bindings.flatMap((binding) =>
            typeof binding === "string" && binding.startsWith("[")
              ? JSON.parse(binding)
              : [binding],
          ),
        ]),
      ).toEqual(new Set([...roots, ...roots.map((root) => `.${root}`)]));
      expect(optimized).toEqual([
        "case-and-space",
        "literal-backslash",
        "literal-percent",
        "literal-underscore",
        "other-root",
        "other-subdomain",
        "regional-subdomain",
        "root",
        "subdomain",
      ]);
      expect(
        database
          .prepare(
            `EXPLAIN QUERY PLAN SELECT id FROM visits WHERE ${optimizedClause}`,
          )
          .all(JSON.stringify(roots), JSON.stringify(roots))
          .map((row) => (row as { detail: string }).detail)
          .join("\n"),
      ).toContain("SCAN roots VIRTUAL TABLE");
    } finally {
      database.close();
    }
  });

  it("preserves SQLite results when finite-set logic is normalized", () => {
    const database = applyD1Limits(new DatabaseSync(":memory:"));
    try {
      database.exec("CREATE TABLE visits (id TEXT PRIMARY KEY, pathname TEXT)");
      const insert = database.prepare(
        "INSERT INTO visits (id, pathname) VALUES (?, ?)",
      );
      for (const [id, pathname] of [
        ["docs", "/docs"],
        ["pricing", "/pricing"],
        ["guide", "/guide"],
        ["home", "/home"],
        ["internal", "/internal"],
        ["preview", "/preview"],
        ["other", "/other"],
      ]) {
        insert.run(id, pathname);
      }
      const raw = {
        version: 1,
        root: {
          kind: "and",
          children: [
            {
              kind: "or",
              children: [
                {
                  kind: "condition",
                  target: { kind: "field", field: "page.path" },
                  operator: "eq",
                  value: "/docs",
                },
                {
                  kind: "condition",
                  target: { kind: "field", field: "page.path" },
                  operator: "in",
                  value: ["/pricing", "/guide"],
                },
              ],
            },
            {
              kind: "condition",
              target: { kind: "field", field: "page.path" },
              operator: "notIn",
              value: ["/internal"],
            },
            {
              kind: "condition",
              target: { kind: "field", field: "page.path" },
              operator: "notIn",
              value: ["/preview"],
            },
          ],
        },
      } as const;
      const normalized = document(raw.root);
      const compiled = compileFilterDocument(normalized);
      const ids = (sql: string, bindings: readonly string[]) =>
        database
          .prepare(sql)
          .all(...bindings)
          .map((row) => (row as { id: string }).id);
      const baseline = ids(
        `SELECT id FROM visits WHERE
          (TRIM(COALESCE(pathname, '')) = ? OR TRIM(COALESCE(pathname, '')) IN (?, ?))
          AND TRIM(COALESCE(pathname, '')) NOT IN (?)
          AND TRIM(COALESCE(pathname, '')) NOT IN (?)
          ORDER BY id`,
        ["/docs", "/pricing", "/guide", "/internal", "/preview"],
      );
      const optimized = ids(
        `SELECT id FROM visits AS visit_source ${compiled.clause} ORDER BY id`,
        compiled.bindings as readonly string[],
      );

      expect(optimized).toEqual(baseline);
      expect(optimized).toEqual(["docs", "guide", "pricing"]);
      expect(compiled.bindings).toHaveLength(5);
      expect(compiled.clause).toContain(" IN (?");
      expect(compiled.clause).toContain("NOT IN (?, ?)");
    } finally {
      database.close();
    }
  });

  it("lowers compatible OR leaves by typed AST shape rather than field identity", () => {
    const result = compileFilterDocument(
      document({
        kind: "or",
        children: [
          {
            kind: "condition",
            target: { kind: "field", field: "page.path" },
            operator: "eq",
            value: "/docs",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "page.path" },
            operator: "eq",
            value: "/pricing",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "page.title" },
            operator: "contains",
            value: "Pricing",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "page.title" },
            operator: "contains",
            value: "Compare",
          },
        ],
      }),
      { alias: "vs" },
    );

    expect(result.clause).toContain(
      "TRIM(COALESCE(vs.pathname, '')) IN (?, ?)",
    );
    expect(result.clause).toContain("FROM json_each(?) AS filter_or_like_0");
    expect(result.bindings).toHaveLength(3);
  });

  it("lowers startsWith OR leaves with literal JSON set matching", () => {
    const result = compileFilterDocument(
      document({
        kind: "or",
        children: [
          {
            kind: "condition",
            target: { kind: "field", field: "page.path" },
            operator: "startsWith",
            value: "/docs",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "page.path" },
            operator: "startsWith",
            value: "/guide",
          },
        ],
      }),
    );

    expect(result.clause).toContain("SUBSTR(");
    expect(result.clause).toContain("LENGTH(TRIM(filter_or_like_0.value))");
    expect(result.clause).not.toContain("LIKE");
    expect(result.bindings).toHaveLength(1);
  });

  it("falls back per leaf when an OR group contains non-vector conditions", () => {
    const result = compileFilterDocument(
      document({
        kind: "or",
        children: [
          {
            kind: "not",
            child: {
              kind: "condition",
              target: { kind: "field", field: "page.path" },
              operator: "eq",
              value: "/private",
            },
          },
          {
            kind: "condition",
            target: { kind: "field", field: "session.entryPath" },
            operator: "eq",
            value: "/landing",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "session.entryPath" },
            operator: "eq",
            value: "/home",
          },
        ],
      }),
    );

    expect(result.clause).toContain("NOT (");
    expect(result.clause).toContain("ROW_NUMBER() OVER");
    expect(result.clause).not.toContain("json_each(?)");
  });

  it("compiles nested visit predicates with case-aware literal string matching", () => {
    const result = compileFilterDocument(
      document({
        kind: "and",
        children: [
          {
            kind: "condition",
            target: { kind: "field", field: "geo.country" },
            operator: "eq",
            value: "US",
          },
          {
            kind: "not",
            child: {
              kind: "condition",
              target: { kind: "field", field: "page.title" },
              operator: "contains",
              value: "100%_ready\\go",
            },
          },
        ],
      }),
      { alias: "vs" },
    );

    expect(result.clause).toContain("WHERE (");
    expect(result.clause).toContain(
      "LOWER(TRIM(COALESCE(vs.country, ''))) = ?",
    );
    expect(result.clause).toContain(
      "INSTR(TRIM(COALESCE(vs.title, '')), ?) > 0",
    );
    expect(result.clause).not.toContain("LIKE");
    expect(result.clause).toContain("NOT (");
    expect(result.bindings).toEqual(["100%_ready\\go", "us"]);
  });

  it("executes string operators with registry case rules and literal wildcards", () => {
    const database = applyD1Limits(new DatabaseSync(":memory:"));
    try {
      database.exec("CREATE TABLE visits (id TEXT, pathname TEXT)");
      const insert = database.prepare(
        "INSERT INTO visits (id, pathname) VALUES (?, ?)",
      );
      insert.run("upper", "/Docs/100%_ready\\go");
      insert.run("lower", "/docs/100%_ready\\go");
      insert.run("wildcard-only", "/Docs/100Xready\\go");

      const prefix = compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "field", field: "page.path" },
          operator: "startsWith",
          value: "/Docs",
        }),
        { alias: "vs" },
      );
      const literalContains = compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "field", field: "page.path" },
          operator: "contains",
          value: "%_ready",
        }),
        { alias: "vs" },
      );
      const prefixed = database
        .prepare(`SELECT id FROM visits vs ${prefix.clause}`)
        .all(...prefix.bindings) as Array<{ id: string }>;
      const containing = database
        .prepare(`SELECT id FROM visits vs ${literalContains.clause}`)
        .all(...literalContains.bindings) as Array<{ id: string }>;

      expect(prefixed.map((row) => row.id)).toEqual(["upper", "wildcard-only"]);
      expect(containing.map((row) => row.id)).toEqual(["upper", "lower"]);
    } finally {
      database.close();
    }
  });

  it("compresses large sets into one json_each binding", () => {
    const values = Array.from({ length: 8 }, (_, index) => `/path-${index}`);
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "page.path" },
        operator: "in",
        value: values,
      }),
      { alias: "vs" },
    );

    expect(result.clause).toContain(
      "TRIM(COALESCE(vs.pathname, '')) IN (SELECT value FROM json_each(?))",
    );
    expect(result.clause).not.toContain("pathname IN (?,");
    expect(result.bindings).toEqual([JSON.stringify(values)]);
  });

  it("keeps payload set type checks while compressing string sets", () => {
    const values = Array.from({ length: 8 }, (_, index) => `value-${index}`);
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path: "/plan" },
        operator: "in",
        value: values,
      }),
      { alias: "es", eventAlias: "es" },
    );

    expect(result.clause).toContain("json_each(?)");
    expect(result.bindings).toEqual(["/plan", JSON.stringify(values), 1]);
  });

  it("keeps small direct sets scalar-bound", () => {
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "page.path" },
        operator: "in",
        value: ["/docs", "/pricing"],
      }),
    );

    expect(result.clause).toContain(" IN (?, ?)");
    expect(result.clause).not.toContain("json_each(?)");
    expect(result.bindings).toEqual(["/docs", "/pricing"]);
  });

  it("keeps small payload NOT IN sets typed and rejects mixed payload sets", () => {
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path: "/plan" },
        operator: "notIn",
        value: ["free", "trial"],
      }),
      { alias: "es", eventAlias: "es" },
    );
    expect(result.clause).toContain("value_type = ? AND");
    expect(result.clause).toContain("NOT IN (?, ?)");
    expect(result.bindings).toEqual(["/plan", 1, "free", "trial"]);

    expect(() =>
      compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "event-payload", path: "/score" },
          operator: "in",
          value: ["free", 1],
        }),
      ),
    ).toThrow("one JSON type");

    expect(() =>
      compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "event-payload", path: "/score" },
          operator: "contains",
          value: 42,
        }),
      ),
    ).toThrow("requires a string");
  });

  it("binds true JSON payload values as booleans", () => {
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path: "/enabled" },
        operator: "eq",
        value: true,
      }),
      { alias: "es", eventAlias: "es" },
    );
    expect(result.bindings).toEqual(["/enabled", 3, 1]);
  });

  it("compiles null payload sets and typed payload ranges", () => {
    expect(() =>
      compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "event-payload", path: "/nullable" },
          operator: "in",
          value: [null],
        }),
        { alias: "es", eventAlias: "es" },
      ),
    ).toThrow("non-null scalar");

    const range = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path: "/score" },
        operator: "between",
        value: [10, 20],
      }),
      { alias: "es", eventAlias: "es" },
    );
    expect(range.clause).toContain("BETWEEN");
    expect(range.bindings).toEqual(["/score", 2, 10, 20]);
  });

  it("keeps payload missing, JSON null, empty, false, and zero distinct", () => {
    const result = compileFilterDocument(
      document({
        kind: "and",
        children: [
          {
            kind: "condition",
            target: { kind: "event-payload", path: "/missing" },
            operator: "notExists",
          },
          {
            kind: "condition",
            target: { kind: "event-payload", path: "/null" },
            operator: "isNull",
          },
          {
            kind: "condition",
            target: { kind: "event-payload", path: "/empty" },
            operator: "isEmpty",
          },
          {
            kind: "condition",
            target: { kind: "event-payload", path: "/paid" },
            operator: "eq",
            value: false,
          },
          {
            kind: "condition",
            target: { kind: "event-payload", path: "/score" },
            operator: "eq",
            value: 0,
          },
        ],
      }),
      { alias: "es", eventAlias: "es" },
    );

    expect(result.clause).toContain("NOT EXISTS");
    expect(result.clause).toContain("value_type = 0");
    expect(result.clause).toContain("string_value = ''");
    expect(result.clause).toContain("boolean_value = ?");
    expect(result.clause).toContain("number_value = ?");
    expect(result.bindings).toEqual([
      "/empty",
      "/missing",
      "/null",
      "/paid",
      3,
      0,
      "/score",
      2,
      0,
    ]);
  });

  it("uses the stable session-boundary strategy and rejects dynamic aliases", () => {
    const entry = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "session.entryPath" },
        operator: "eq",
        value: "/pricing",
      }),
      { alias: "visit_source" },
    );
    expect(entry.clause).toContain("ROW_NUMBER() OVER");
    expect(entry.clause).toContain(
      "ORDER BY edge.started_at ASC, edge.visit_id ASC",
    );
    expect(entry.bindings).toEqual(["/pricing"]);
    expect(() =>
      compileFilterDocument(
        document({
          kind: "condition",
          target: { kind: "field", field: "page.path" },
          operator: "eq",
          value: "/",
        }),
        {
          alias: "vs; drop table visits",
        },
      ),
    ).toThrow(/internal SQL identifier/);
  });

  it("compiles the direct referrer sentinel as an empty stored referrer", () => {
    const result = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "field", field: "referrer.domain" },
        operator: "eq",
        value: "__direct__",
      }),
      { alias: "vs" },
    );
    expect(result.clause).toContain(
      "LOWER(TRIM(COALESCE(vs.referrer_host, ''))) = ''",
    );
    expect(result.bindings).toEqual([]);
  });

  it("keeps the direct referrer sentinel in generic OR lowering", () => {
    const result = compileFilterDocument(
      document({
        kind: "or",
        children: [
          {
            kind: "condition",
            target: { kind: "field", field: "referrer.domain" },
            operator: "eq",
            value: "__direct__",
          },
          {
            kind: "condition",
            target: { kind: "field", field: "referrer.domain" },
            operator: "eq",
            value: "google.com",
          },
        ],
      }),
    );

    expect(result.clause).toContain("IN (?, ?)");
    expect(result.bindings).toEqual(["", "google.com"]);
  });
});

describe("payload conditions on page views", () => {
  function pageViews() {
    const database = createMigratedDatabase();
    database.exec(`
      INSERT INTO site_identities (site_pk, site_id) VALUES (1, 'site-1');
      INSERT INTO visits (visit_id, site_id, site_pk, visitor_id, session_id,
        status, started_at, last_activity_at, pathname, hostname)
      VALUES
        ('jane', 'site-1', 1, 'v1', 's1', 'complete', 1, 1, '/a', 'example.com'),
        ('john', 'site-1', 1, 'v2', 's2', 'complete', 2, 2, '/b', 'example.com'),
        ('none', 'site-1', 1, 'v3', 's3', 'complete', 3, 3, '/c', 'example.com');
      INSERT INTO visit_properties (visit_id, key, value, site_pk, started_at)
      VALUES
        ('jane', 'author', 'Jane Doe', 1, 1),
        ('jane', 'a/b', 'slash', 1, 1),
        ('john', 'author', 'John', 1, 2),
        ('john', 'seats', '5', 1, 2);
    `);
    return database;
  }

  function matching(
    database: DatabaseSync,
    path: string,
    operator: string,
    value?: unknown,
  ): string[] {
    const compiled = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path },
        operator,
        ...(value === undefined ? {} : { value }),
      }),
      { alias: "v", observation: "visit" },
    );
    return database
      .prepare(`SELECT visit_id FROM visits v ${compiled.clause} ORDER BY 1`)
      .all(...compiled.bindings)
      .map((row) => String(row.visit_id));
  }

  it("matches a page view's properties by key, as strings", () => {
    const database = pageViews();

    expect(matching(database, "/author", "eq", "Jane Doe")).toEqual(["jane"]);
    expect(matching(database, "/author", "neq", "Jane Doe")).toEqual(["john"]);
    expect(matching(database, "/author", "contains", "Jo")).toEqual(["john"]);
    expect(matching(database, "/author", "in", ["Jane Doe", "John"])).toEqual([
      "jane",
      "john",
    ]);
    const many = ["John", ...Array.from({ length: 8 }, (_, i) => `x${i}`)];
    expect(matching(database, "/author", "in", many)).toEqual(["john"]);
    expect(matching(database, "/author", "exists")).toEqual(["jane", "john"]);
    expect(matching(database, "/author", "notExists")).toEqual(["none"]);
    expect(matching(database, "/a~1b", "eq", "slash")).toEqual(["jane"]);
    database.close();
  });

  it("matches no page view by a nested path or a value that isn't a string", () => {
    const database = pageViews();

    expect(matching(database, "/author/name", "exists")).toEqual([]);
    expect(matching(database, "/author/name", "notExists")).toEqual([
      "jane",
      "john",
      "none",
    ]);
    expect(matching(database, "/seats", "eq", 5)).toEqual([]);
    expect(matching(database, "/seats", "eq", "5")).toEqual(["john"]);
    expect(matching(database, "/author", "isNull")).toEqual([]);
    expect(matching(database, "/author", "isEmpty")).toEqual([]);
    database.close();
  });

  it("looks a property up by the page view's primary key", () => {
    const database = pageViews();
    const compiled = compileFilterDocument(
      document({
        kind: "condition",
        target: { kind: "event-payload", path: "/author" },
        operator: "eq",
        value: "John",
      }),
      { alias: "v", observation: "visit" },
    );

    const plan = database
      .prepare(`EXPLAIN QUERY PLAN SELECT 1 FROM visits v ${compiled.clause}`)
      .all(...compiled.bindings)
      .map((row) => String(row.detail));
    expect(plan.join("\n")).toMatch(
      /SEARCH visit_properties USING PRIMARY KEY \(visit_id=\? AND key=\?\)/,
    );
    database.close();
  });
});
