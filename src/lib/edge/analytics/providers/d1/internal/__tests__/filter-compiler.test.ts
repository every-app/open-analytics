import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import type { SqlFragment } from "@/lib/db/sql/fragment";
import {
  eventFilterSql,
  eventMatchSql,
  type FilterSqlScope,
  pageViewMatchSql,
  visitFilterSql,
} from "@/lib/edge/analytics/providers/d1/internal/filter-compiler";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  parseFilterDsl,
} from "@/lib/filter-contract";

const SITE_ID = "site-1";
const scope: FilterSqlScope = {
  siteId: SITE_ID,
  startMs: 0,
  endExclusiveMs: 1_000,
};

function dsl(source: string): FilterDocument {
  return parseFilterDsl(source, analyticsFilterRegistry);
}

/**
 * Four page views in two sessions, the custom events sent from them with
 * their properties, and two page view properties.
 */
function database(): DatabaseSync {
  const db = createMigratedDatabase();
  db.exec(`
    INSERT INTO site_identities (site_pk, site_id) VALUES (1, '${SITE_ID}');
    INSERT INTO visits (visit_id, site_pk, visitor_id, session_id,
      status, started_at, last_activity_at, pathname, hostname, title,
      referrer_host, country, screen_width, is_eu, duration_ms, channel)
    VALUES
      ('home', 1, 'v1', 's1', 'complete', 1, 1, '/Docs/100%_ready\\go',
        'WWW.Example.com', 'Home', 'google.com', 'DE', 1280, 1, 500, 'organic_search'),
      ('pricing', 1, 'v1', 's1', 'complete', 2, 2, '/docs/100%_ready\\go',
        'example.com', 'Pricing', '', 'DE', 1280, 1, NULL, 'direct'),
      ('signup', 1, 'v2', 's2', 'complete', 3, 3, '/Docs/100Xready\\go',
        'example.com', 'Sign up', 'bing.com', 'US', 390, 0, 20, 'organic_search'),
      ('outside', 1, 'v3', 's3', 'complete', 5_000, 5_000, '/late',
        'example.com', 'Late', '', 'US', 390, 0, 20, 'direct');
    INSERT INTO visit_properties (visit_id, key, value, site_pk, started_at)
    VALUES ('home', 'author', 'Jane', 1, 1), ('home', 'a/b', 'slash', 1, 1);
    INSERT INTO custom_event_names (id, site_pk, name, last_seen_at)
    VALUES (1, 1, 'purchase', 0), (2, 1, 'signup', 0);
    INSERT INTO custom_events (event_pk, event_id, site_pk, visit_id,
      event_name_id, occurred_at, received_at)
    VALUES
      (1, 'buy-pro', 1, 'pricing', 1, 10, 10),
      (2, 'buy-free', 1, 'signup', 1, 11, 11),
      (3, 'signed-up', 1, 'signup', 2, 12, 12),
      (4, 'late-buy', 1, 'home', 1, 5_000, 5_000);
    INSERT INTO custom_event_properties (event_pk, key, value, site_pk, occurred_at)
    VALUES
      (1, 'plan', 'pro', 1, 10), (1, 'seats', '5', 1, 10), (1, 'paid', 'true', 1, 10),
      (2, 'plan', 'free', 1, 11), (2, 'seats', '0', 1, 11), (2, 'paid', 'false', 1, 11),
      (4, 'plan', 'pro', 1, 5_000);
  `);
  return db;
}

function ids(
  db: DatabaseSync,
  sql: string,
  predicate: SqlFragment | null,
): string[] {
  return db
    .prepare(`${sql} WHERE ${predicate?.text ?? "1"} ORDER BY 1`)
    .all(...((predicate?.bindings ?? []) as SQLInputValue[]))
    .map((row) => String(Object.values(row)[0]));
}

const EVENTS =
  "SELECT ce.event_id FROM custom_events ce JOIN custom_event_names cen ON cen.id = ce.event_name_id JOIN visits v ON v.visit_id = ce.visit_id";

/** The page views in the window that match. */
function visits(db: DatabaseSync, source: string): string[] {
  const predicate = visitFilterSql(dsl(source), scope);
  return ids(db, "SELECT v.visit_id FROM visits v", {
    text: `v.started_at < ${scope.endExclusiveMs} AND (${predicate?.text ?? "1"})`,
    bindings: predicate?.bindings ?? [],
  });
}

function events(db: DatabaseSync, source: string): string[] {
  return ids(db, EVENTS, eventFilterSql(dsl(source), scope));
}

describe("visitFilterSql", () => {
  it("matches every page view when there is no condition", () => {
    expect(visitFilterSql({ conditions: [] }, scope)).toBeNull();
  });

  it("compares page view columns, folding case only where the field does", () => {
    const db = database();
    expect(visits(db, 'page.path startsWith "/Docs"')).toEqual([
      "home",
      "signup",
    ]);
    expect(visits(db, 'page.path contains "%_ready"')).toEqual([
      "home",
      "pricing",
    ]);
    expect(visits(db, 'page.path endsWith "ready\\\\go"')).toEqual([
      "home",
      "pricing",
      "signup",
    ]);
    expect(visits(db, 'page.title notContains "i"')).toEqual(["home"]);
    expect(visits(db, 'page.hostname eq "www.example.COM"')).toEqual(["home"]);
    expect(visits(db, 'geo.country neq "DE"')).toEqual(["signup"]);
  });

  it("compares numbers and booleans without text coercion", () => {
    const db = database();
    const predicate = visitFilterSql(dsl("client.screenWidth gte 1024"), scope);
    expect(predicate?.text).toBe("(v.screen_width >= ?)");
    expect(predicate?.bindings).toEqual([1024]);
    expect(visits(db, "client.screenWidth gte 1024")).toEqual([
      "home",
      "pricing",
    ]);
    expect(visits(db, "client.screenWidth between [300, 400]")).toEqual([
      "signup",
    ]);
    expect(visits(db, "geo.isEU eq true")).toEqual(["home", "pricing"]);
    expect(visits(db, "page.durationMs isNull")).toEqual(["pricing"]);
    expect(visits(db, "page.durationMs notNull")).toEqual(["home", "signup"]);
  });

  it("binds a list as one JSON array", () => {
    const db = database();
    const paths = Array.from({ length: 20 }, (_, index) => `/other-${index}`);
    const source = `page.title in ${JSON.stringify(["Home", "Pricing", ...paths])}`;
    const predicate = visitFilterSql(dsl(source), scope);
    expect(predicate?.text).toContain("IN (SELECT value FROM json_each(?))");
    expect(predicate?.bindings).toHaveLength(1);
    expect(visits(db, source)).toEqual(["home", "pricing"]);
    expect(visits(db, 'page.title notIn ["Home", "Pricing"]')).toEqual([
      "signup",
    ]);
  });

  it("reads the stored channel", () => {
    const db = database();
    const predicate = visitFilterSql(
      dsl('traffic.channel eq "organic_search"'),
      scope,
    );
    expect(predicate?.text).toContain("v.channel");
    expect(predicate?.text).not.toContain("referrer_host");
    expect(visits(db, 'traffic.channel eq "organic_search"')).toEqual([
      "home",
      "signup",
    ]);
  });

  it("matches direct traffic as an empty referrer", () => {
    const db = database();
    expect(visits(db, 'referrer.domain eq "__direct__"')).toEqual(["pricing"]);
    expect(
      visits(db, 'referrer.domain in ["__direct__", "GOOGLE.com"]'),
    ).toEqual(["home", "pricing"]);
  });

  it("matches the page views of sessions that entered or left on a page", () => {
    const db = database();
    expect(visits(db, 'session.entryPath eq "/Docs/100%_ready\\\\go"')).toEqual(
      ["home", "pricing"],
    );
    expect(visits(db, 'session.exitPath eq "/Docs/100%_ready\\\\go"')).toEqual(
      [],
    );
    expect(visits(db, 'session.exitPath neq "/docs/100%_ready\\\\go"')).toEqual(
      ["signup"],
    );
  });

  it("matches the visits that sent a custom event in the window", () => {
    const db = database();
    expect(visits(db, 'event.name eq "purchase"')).toEqual([
      "pricing",
      "signup",
    ]);
    expect(visits(db, 'event.name neq "purchase"')).toEqual(["home"]);
    expect(visits(db, 'event.name notIn ["purchase", "signup"]')).toEqual([
      "home",
    ]);
    expect(
      visits(db, 'event.name eq "purchase" AND property("plan") eq "pro"'),
    ).toEqual(["pricing"]);
    expect(
      visits(db, 'event.name eq "signup" AND property("plan") eq "free"'),
    ).toEqual([]);
  });

  it("matches a custom property of the page view or of one of its events", () => {
    const db = database();
    expect(visits(db, 'property("author") eq "Jane"')).toEqual(["home"]);
    expect(visits(db, 'property("plan") eq "free"')).toEqual(["signup"]);
    expect(visits(db, 'property("a/b") eq "slash"')).toEqual(["home"]);
  });

  it("rejects an alias that isn't an identifier", () => {
    expect(() =>
      visitFilterSql(dsl('page.path eq "/"'), scope, "v; DROP TABLE visits"),
    ).toThrow(/internal SQL identifier/);
  });

  it("reaches a page's page views through the page index", () => {
    const db = database();
    const predicate = visitFilterSql(
      dsl('page.path eq "/pricing" AND event.name eq "purchase"'),
      scope,
    )!;
    const plan = db
      .prepare(
        `EXPLAIN QUERY PLAN SELECT v.visit_id FROM visits v
         WHERE v.site_pk = 1 AND v.started_at >= 0 AND v.started_at < 1000
           AND ${predicate.text}`,
      )
      .all(...(predicate.bindings as SQLInputValue[]))
      .map((row) => String(row.detail))
      .join("\n");
    expect(plan).toContain(
      "SEARCH v USING INDEX idx_visits_site_pk_pathname_started_at (site_pk=? AND pathname=? AND started_at>? AND started_at<?)",
    );
  });

  it("looks a page view property up by the page view's primary key", () => {
    const db = database();
    const predicate = pageViewMatchSql(
      dsl('property("author") eq "Jane"'),
      scope,
    );
    const plan = db
      .prepare(
        `EXPLAIN QUERY PLAN SELECT 1 FROM visits v WHERE ${predicate.text}`,
      )
      .all(...(predicate.bindings as SQLInputValue[]))
      .map((row) => String(row.detail))
      .join("\n");
    expect(plan).toMatch(
      /SEARCH property EXISTS USING PRIMARY KEY \(visit_id=\? AND key=\?\)/,
    );
  });
});

describe("eventFilterSql", () => {
  it("compares a property's value as stored, a string", () => {
    const db = database();
    expect(events(db, 'property("seats") eq "5"')).toEqual(["buy-pro"]);
    expect(events(db, 'property("seats") eq "0"')).toEqual(["buy-free"]);
    expect(events(db, 'property("paid") eq "true"')).toEqual(["buy-pro"]);
    expect(events(db, 'property("plan") exists')).toEqual([
      "buy-free",
      "buy-pro",
      "late-buy",
    ]);
    expect(events(db, 'property("plan") notExists')).toEqual(["signed-up"]);
    expect(events(db, 'property("plan") in ["pro", "x"]')).toEqual([
      "buy-pro",
      "late-buy",
    ]);
    expect(events(db, 'property("plan") notIn ["pro"]')).toEqual(["buy-free"]);
    expect(events(db, 'property("plan") startsWith "fr"')).toEqual([
      "buy-free",
    ]);
    expect(events(db, 'property("plan") contains "r"')).toEqual([
      "buy-free",
      "buy-pro",
      "late-buy",
    ]);
  });

  it("looks an event's property up by the event's primary key", () => {
    const db = database();
    const predicate = eventFilterSql(dsl('property("plan") eq "pro"'), scope)!;
    const plan = db
      .prepare(`EXPLAIN QUERY PLAN ${EVENTS} WHERE ${predicate.text}`)
      .all(...(predicate.bindings as SQLInputValue[]))
      .map((row) => String(row.detail))
      .join("\n");
    expect(plan).toMatch(
      /SEARCH property EXISTS USING PRIMARY KEY \(event_pk=\? AND key=\?\)/,
    );
  });

  it("matches the event's name and its visit's page view fields", () => {
    const db = database();
    expect(
      events(db, 'event.name eq "purchase" AND geo.country eq "US"'),
    ).toEqual(["buy-free"]);
    expect(events(db, 'event.name in ["signup"]')).toEqual(["signed-up"]);
  });
});

describe("goal and funnel step matches", () => {
  it("matches page views for a page goal and events for an event goal", () => {
    const pageGoal = dsl('page.path eq "/pricing"');
    const eventGoal = dsl('event.name eq "purchase"');

    expect(pageViewMatchSql(eventGoal, scope).text).toBe("0");
    expect(eventMatchSql(pageGoal, scope).text).toBe("0");
    expect(pageViewMatchSql({ conditions: [] }, scope).text).toBe("1");
    expect(eventMatchSql(eventGoal, scope).text).toContain("cen.name");
  });
});
