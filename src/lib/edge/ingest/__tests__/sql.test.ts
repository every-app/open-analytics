import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import type { VisitBindingRow } from "@/lib/edge/ingest/sql";
import {
  CREATE_BUFFERED_CUSTOM_EVENTS_SQL,
  INSERT_VISIT_SQL,
  UPSERT_ACTIVE_VISIT_SQL,
  UPSERT_FINALIZED_VISIT_SQL,
  VISIT_D1_COLUMNS,
  visitBindings,
  visitUpsertSql,
} from "@/lib/edge/ingest/sql";
function visitRow(overrides: Partial<VisitBindingRow> = {}): VisitBindingRow {
  return {
    visitId: "visit-1",
    siteId: "site-1",
    visitorId: 11,
    sessionId: 21,
    status: "closed",
    startedAt: 1,
    lastActivityAt: 2,
    endedAt: 3,
    finalizedAt: 4,
    durationMs: 5,
    scrollDepth: 60,
    durationSource: "client",
    exitReason: "leave",
    pathname: "/docs",
    queryString: "ref=home",
    hashFragment: "#intro",
    hostname: "example.com",
    title: "Docs",
    referrerUrl: "https://ref.example/start",
    referrerHost: "ref.example",
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "launch",
    utmTerm: "term",
    utmContent: "hero",
    channel: "email",
    isEU: 0,
    country: "US",
    region: "California",
    regionCode: "CA",
    city: "San Francisco",
    continent: "NA",
    timezone: "America/Los_Angeles",
    browser: "Chrome",
    browserVersion: "120",
    os: "macOS",
    osVersion: "14",
    deviceType: "desktop",
    screenWidth: 1440,
    screenHeight: 900,
    language: "en-US",
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  };
}
describe("ingest visit SQL bindings", () => {
  it("keeps visit binding order aligned with D1 columns", () => {
    const row = visitRow();
    const bindings = visitBindings(row, 7);

    expect(bindings).toHaveLength(VISIT_D1_COLUMNS.length);
    expect(
      Object.fromEntries(
        VISIT_D1_COLUMNS.map((column, index) => [column, bindings[index]]),
      ),
    ).toMatchObject({
      visit_id: "visit-1",
      site_pk: 7,
      visitor_id: 11,
      session_id: 21,
      status: "closed",
      started_at: 1,
      scroll_depth: 60,
      duration_source: "client",
      exit_reason: "leave",
      pathname: "/docs",
      query_string: "ref=home",
      created_at: 10,
      updated_at: 20,
    });
  });

  it("stores blank optional strings as null for D1 visit rows", () => {
    const values = Object.fromEntries(
      VISIT_D1_COLUMNS.map((column, index) => [
        column,
        visitBindings(
          visitRow({
            durationSource: "",
            exitReason: "",
          }),
          7,
        )[index],
      ]),
    );

    expect(values.duration_source).toBeNull();
    expect(values.exit_reason).toBeNull();
  });

  it("keeps visit SQL columns and split upsert assignments in sync", () => {
    expect(INSERT_VISIT_SQL).toContain("INSERT OR IGNORE INTO visits");
    for (const column of VISIT_D1_COLUMNS) {
      expect(INSERT_VISIT_SQL).toContain(column);
    }
    expect(UPSERT_ACTIVE_VISIT_SQL).toContain(
      "ON CONFLICT(visit_id) DO UPDATE SET",
    );
    expect(UPSERT_ACTIVE_VISIT_SQL).toContain(
      "visits.status IN ('open', 'hidden_pending')",
    );
    expect(UPSERT_ACTIVE_VISIT_SQL).not.toContain(
      "ended_at = excluded.ended_at",
    );
    // A page view written again while open (its first write's mark lost)
    // keeps its depth so far.
    expect(UPSERT_ACTIVE_VISIT_SQL).toContain(
      "scroll_depth = excluded.scroll_depth",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).toContain(
      "scroll_depth = excluded.scroll_depth",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).toContain(
      "ended_at = excluded.ended_at",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).toContain(
      "duration_ms = excluded.duration_ms",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).not.toContain(
      "site_id = excluded.site_id",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).not.toContain(
      "created_at = excluded.created_at",
    );
    expect(UPSERT_FINALIZED_VISIT_SQL).toContain("WHERE");
    expect(UPSERT_FINALIZED_VISIT_SQL).toContain(
      "visits.duration_ms IS NOT excluded.duration_ms",
    );
    expect(visitUpsertSql("open")).toBe(UPSERT_ACTIVE_VISIT_SQL);
    expect(visitUpsertSql("hidden_pending")).toBe(UPSERT_ACTIVE_VISIT_SQL);
    expect(visitUpsertSql("complete")).toBe(UPSERT_FINALIZED_VISIT_SQL);
    expect(visitUpsertSql("timeout")).toBe(UPSERT_FINALIZED_VISIT_SQL);
  });

  it("updates only lifecycle fields while retaining immutable state", () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      CREATE TABLE visits (
        ${VISIT_D1_COLUMNS.map((column) =>
          column === "visit_id"
            ? "visit_id TEXT PRIMARY KEY"
            : `${column} BLOB`,
        ).join(",\n")}
      )
    `);
    const activeStatement = db.prepare(UPSERT_ACTIVE_VISIT_SQL);
    const finalizedStatement = db.prepare(UPSERT_FINALIZED_VISIT_SQL);

    try {
      const initial = visitRow({
        status: "open",
        endedAt: null,
        finalizedAt: null,
        durationMs: null,
        durationSource: "",
        exitReason: "",
        updatedAt: 20,
      });
      expect(activeStatement.run(...visitBindings(initial, 7)).changes).toBe(1);

      db.prepare("UPDATE visits SET created_at = ? WHERE visit_id = ?").run(
        123,
        initial.visitId,
      );
      expect(
        activeStatement.run(
          ...visitBindings({ ...initial, updatedAt: initial.updatedAt + 1 }, 7),
        ).changes,
      ).toBe(0);

      expect(
        activeStatement.run(
          ...visitBindings(
            {
              ...initial,
              visitorId: 99,
              pathname: "/should-not-change",
              lastActivityAt: initial.lastActivityAt + 1,
              updatedAt: initial.updatedAt + 2,
            },
            7,
          ),
        ).changes,
      ).toBe(1);
      expect(
        finalizedStatement.run(
          ...visitBindings(
            {
              ...initial,
              status: "complete",
              lastActivityAt: 3,
              endedAt: 3,
              finalizedAt: 4,
              durationMs: 2,
              durationSource: "server",
              exitReason: "pagehide",
              updatedAt: initial.updatedAt + 3,
            },
            7,
          ),
        ).changes,
      ).toBe(1);
      expect(
        db
          .prepare(
            "SELECT visitor_id AS visitorId, pathname, status, ended_at AS endedAt, duration_ms AS durationMs, created_at AS createdAt FROM visits WHERE visit_id = ?",
          )
          .get(initial.visitId),
      ).toEqual({
        visitorId: 11,
        pathname: "/docs",
        status: "complete",
        endedAt: 3,
        durationMs: 2,
        createdAt: 123,
      });

      expect(
        activeStatement.run(
          ...visitBindings(
            {
              ...initial,
              lastActivityAt: 10,
              updatedAt: initial.updatedAt + 4,
            },
            7,
          ),
        ).changes,
      ).toBe(0);
      expect(
        finalizedStatement.run(
          ...visitBindings(
            {
              ...initial,
              status: "complete",
              lastActivityAt: 3,
              endedAt: 3,
              finalizedAt: 4,
              durationMs: 2,
              durationSource: "server",
              exitReason: "pagehide",
              updatedAt: initial.updatedAt + 5,
            },
            7,
          ),
        ).changes,
      ).toBe(0);
    } finally {
      db.close();
    }
  });

  it("defines buffered custom event schema fields used by flush bookkeeping", () => {
    expect(CREATE_BUFFERED_CUSTOM_EVENTS_SQL).not.toContain("user_id");
    expect(CREATE_BUFFERED_CUSTOM_EVENTS_SQL).toContain("dirty INTEGER");
    expect(CREATE_BUFFERED_CUSTOM_EVENTS_SQL).toContain(
      "flush_attempts INTEGER",
    );
    expect(CREATE_BUFFERED_CUSTOM_EVENTS_SQL).toContain(
      "last_flush_error TEXT",
    );
  });
});
