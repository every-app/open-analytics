import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { seedSites } from "@/lib/edge/__tests__/rollup-fixtures";
import { executePrivateQuery } from "@/lib/edge/analytics/interfaces/dashboard/private";
import { queryPropertyKeysFromD1 } from "@/lib/edge/analytics/providers/d1/internal/properties";
import type { Env } from "@/lib/edge/types";
import {
  analyticsFilterRegistry,
  normalizeFilterDocument,
  serializeFilterParams,
} from "@/lib/filter-contract";

const DAY_MS = 86_400_000;
const FROM = Date.UTC(2026, 9, 1);

let database: DatabaseSync;

/**
 * Two visitors' page views with properties, one outside the period, and an
 * event whose payload has a top-level string, a number and a nested value.
 */
function seed(db: DatabaseSync) {
  seedSites(db, [{ siteId: "site-1", sitePk: 1 }]);
  const visit = db.prepare(
    `INSERT INTO visits (visit_id, site_id, site_pk, visitor_id, session_id,
       status, started_at, last_activity_at, pathname, hostname)
     VALUES (?, 'site-1', 1, ?, ?, 'complete', ?, ?, ?, 'example.com')`,
  );
  visit.run("v1", "visitor-a", "s1", FROM + 1_000, FROM + 1_000, "/blog/a");
  visit.run("v2", "visitor-b", "s2", FROM + 2_000, FROM + 2_000, "/blog/b");
  visit.run("v3", "visitor-a", "s1", FROM + 3_000, FROM + 3_000, "/pricing");
  visit.run("old", "visitor-c", "s3", FROM - DAY_MS, FROM - DAY_MS, "/old");
  const property = db.prepare(
    `INSERT INTO visit_properties (visit_id, key, value, site_pk, started_at)
     SELECT visit_id, ?, ?, site_pk, started_at FROM visits WHERE visit_id = ?`,
  );
  property.run("author", "Jane", "v1");
  property.run("section", "blog", "v1");
  property.run("author", "John", "v2");
  property.run("author", "Old", "old");
  db.exec(`
    INSERT INTO custom_event_names (id, site_pk, site_id, name, last_seen_at)
      VALUES (1, 1, 'site-1', 'signup', 0);
    INSERT INTO custom_event_json_paths (id, site_pk, site_id, path, last_seen_at)
      VALUES (1, 1, 'site-1', '/author', 0), (2, 1, 'site-1', '/plan', 0),
        (3, 1, 'site-1', '/seats', 0), (4, 1, 'site-1', '/nested/author', 0);
    INSERT INTO custom_events (event_pk, event_id, site_pk, site_id, visit_id,
      event_name_id, occurred_at, received_at, node_count, value_count)
      VALUES (1, 'e1', 1, 'site-1', 'v3', 1, ${FROM + 3_500}, ${FROM + 3_500}, 4, 4);
    INSERT INTO custom_event_json_nodes (event_pk, node_id, path_id, value_type, depth)
      VALUES (1, 1, 1, 1, 1), (1, 2, 2, 1, 1), (1, 3, 3, 2, 1), (1, 4, 4, 1, 2);
    INSERT INTO custom_event_json_values (event_pk, node_id, site_id, site_pk,
      event_name_id, path_id, occurred_at, value_type, string_value, number_value)
      VALUES
        (1, 1, 'site-1', 1, 1, 1, ${FROM + 3_500}, 1, 'Jane', NULL),
        (1, 2, 'site-1', 1, 1, 2, ${FROM + 3_500}, 1, 'pro', NULL),
        (1, 3, 'site-1', 1, 1, 3, ${FROM + 3_500}, 2, NULL, 5),
        (1, 4, 'site-1', 1, 1, 4, ${FROM + 3_500}, 1, 'x', NULL);
  `);
}

async function query(
  pathname: "properties" | "property-values",
  params: Record<string, string> = {},
  filter?: unknown,
) {
  const url = new URL(`https://edge.test/api/private/${pathname}`);
  for (const [key, value] of Object.entries({
    siteId: "site-1",
    from: String(FROM),
    to: String(FROM + DAY_MS - 1),
    timeZone: "UTC",
    ...params,
  })) {
    url.searchParams.set(key, value);
  }
  if (filter) {
    const document = normalizeFilterDocument(
      { version: 1, root: filter },
      analyticsFilterRegistry,
    );
    for (const [key, value] of serializeFilterParams(
      document,
      analyticsFilterRegistry,
    )) {
      url.searchParams.append(key, value);
    }
  }
  const response = await executePrivateQuery({
    env: { DB: createSqliteD1Database(database) } as unknown as Env,
    siteId: "site-1",
    pathname,
    url,
    request: new Request(url),
  });
  return { status: response.status, body: (await response.json()) as any };
}

const author = (value: string) => ({
  kind: "condition",
  target: { kind: "event-payload", path: "/author" },
  operator: "eq",
  value,
});

describe("custom property breakdown", () => {
  beforeEach(() => {
    database = createMigratedDatabase();
    seed(database);
  });
  afterEach(() => database.close());

  it("lists the period's keys of page views and top-level string event properties", async () => {
    const { status, body } = await query("properties");

    expect(status).toBe(200);
    expect(body.data.items).toEqual([
      { key: "author", visitors: 2 },
      { key: "plan", visitors: 1 },
      { key: "section", visitors: 1 },
    ]);
  });

  it("counts a key's values over page views and events", async () => {
    const { body } = await query("property-values", { key: "author" });

    expect(body.data).toEqual({
      key: "author",
      items: [
        { value: "Jane", visitors: 1, sessions: 1, views: 1, events: 1 },
        { value: "John", visitors: 1, sessions: 1, views: 1, events: 0 },
      ],
    });
  });

  it("sorts, searches and limits a key's values", async () => {
    const byEvents = await query("property-values", {
      key: "author",
      sort: "events",
      direction: "asc",
    });
    expect(
      byEvents.body.data.items.map((item: { value: string }) => item.value),
    ).toEqual(["John", "Jane"]);

    const search = await query("property-values", {
      key: "author",
      search: "JO",
    });
    expect(search.body.data.items).toEqual([
      { value: "John", visitors: 1, sessions: 1, views: 1, events: 0 },
    ]);

    const limited = await query("property-values", {
      key: "author",
      limit: "1",
    });
    expect(limited.body.data.items).toHaveLength(1);
  });

  it("follows the page's filters", async () => {
    const blogB = {
      kind: "condition",
      target: { kind: "field", field: "page.path" },
      operator: "eq",
      value: "/blog/b",
    };
    expect((await query("properties", {}, blogB)).body.data.items).toEqual([
      { key: "author", visitors: 1 },
    ]);

    // A property filter matches page views with the property and events
    // with it in their payload: Jane's page view and the signup.
    const jane = await query("properties", {}, author("Jane"));
    expect(jane.body.data.items).toEqual([
      { key: "author", visitors: 1 },
      { key: "plan", visitors: 1 },
      { key: "section", visitors: 1 },
    ]);
    const values = await query(
      "property-values",
      { key: "author" },
      author("Jane"),
    );
    expect(values.body.data.items).toEqual([
      { value: "Jane", visitors: 1, sessions: 1, views: 1, events: 1 },
    ]);
  });

  it("answers a bad window with a bad request and a failed read with an error", async () => {
    expect((await query("properties", { from: "soon" })).status).toBe(400);
    expect(
      (await query("property-values", { key: "author", to: "later" })).status,
    ).toBe(400);

    database.exec("DROP TABLE visit_properties");
    expect((await query("properties")).status).toBe(500);
    expect((await query("property-values", { key: "author" })).status).toBe(
      500,
    );
  });

  it("refuses filters the query service didn't prepare", async () => {
    const filters = normalizeFilterDocument(
      { version: 1, root: author("Jane") },
      analyticsFilterRegistry,
    );
    await expect(
      queryPropertyKeysFromD1(
        { DB: createSqliteD1Database(database) } as unknown as Env,
        "site-1",
        {
          startMs: FROM,
          endExclusiveMs: FROM + DAY_MS,
          nowMs: FROM + DAY_MS,
          timeZone: "UTC",
        },
        filters,
        10,
      ),
    ).rejects.toThrow("scoped_dataset_required");
  });

  it("rejects a values request without a key or with an unknown sort", async () => {
    expect((await query("property-values")).status).toBe(400);
    expect(
      (await query("property-values", { key: "author", sort: "bounces" }))
        .status,
    ).toBe(400);
  });
});
