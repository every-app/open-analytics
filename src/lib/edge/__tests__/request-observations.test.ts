import type { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import {
  readRequestObservationSummary,
  recordBlockedRequest,
} from "@/lib/edge/collector/request-observations";
import type { Env } from "@/lib/edge/types";

function blocked(siteId: string, ip: string) {
  const request = new Request("https://analytics.example.com/collect", {
    method: "POST",
    headers: { "cf-connecting-ip": ip, "user-agent": "curl/8.4" },
  });
  Object.assign(request, {
    cf: { country: "US", city: "Austin", asn: 13335, asOrganization: "Cloud" },
  });
  return {
    request,
    siteId,
    category: "bot" as const,
    reasons: ["ua_bot", "asn_hosting"],
    pathname: "/pricing",
    origin: null,
  };
}

/** Records the requests and waits for their writes. */
async function record(
  database: DatabaseSync,
  inputs: ReturnType<typeof blocked>[],
) {
  const writes: Promise<unknown>[] = [];
  const env = { DB: createSqliteD1Database(database) } as Env;
  for (const input of inputs) {
    recordBlockedRequest(
      env,
      { waitUntil: (write) => void writes.push(write) },
      input,
    );
  }
  await Promise.all(writes);
  return env;
}

describe("request observations", () => {
  let database: DatabaseSync | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
    vi.useRealTimers();
  });

  it("keeps a blocked request's network, never its address", async () => {
    database = createMigratedDatabase();

    await record(database, [
      blocked("site-v4", "203.0.113.77"),
      blocked("site-v6", "2001:db8:abcd:12::1"),
    ]);

    expect(
      database
        .prepare(
          "SELECT site_id, ip_prefix, country, asn FROM request_observations ORDER BY site_id",
        )
        .all()
        .map((row) => ({ ...row })),
    ).toEqual([
      {
        site_id: "site-v4",
        ip_prefix: "203.0.113.0/24",
        country: "US",
        asn: 13335,
      },
      {
        site_id: "site-v6",
        ip_prefix: "2001:db8:abcd::/48",
        country: "US",
        asn: 13335,
      },
    ]);
  });

  it("records at most 120 blocked requests a minute per site", async () => {
    // One minute for every request, however slowly they're recorded.
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 19), toFake: ["Date"] });
    database = createMigratedDatabase();

    await record(
      database,
      Array.from({ length: 130 }, () => blocked("site-flood", "203.0.113.1")),
    );

    expect(
      database.prepare("SELECT COUNT(*) AS n FROM request_observations").get(),
    ).toEqual({ n: 120 });
  });

  it("summarizes only the organization's sites", async () => {
    database = createMigratedDatabase();
    database.exec(`
      INSERT INTO teams (id, name, slug) VALUES ('org-a', 'A', 'a'), ('org-b', 'B', 'b');
      INSERT INTO sites (id, team_id, name, domain) VALUES
        ('site-a', 'org-a', 'A', 'a.example'), ('site-b', 'org-b', 'B', 'b.example');
    `);
    const env = await record(database, [
      blocked("site-a", "203.0.113.1"),
      blocked("site-b", "198.51.100.1"),
      blocked("site-b", "198.51.100.2"),
    ]);

    const summary = await readRequestObservationSummary(env, {
      sinceMs: 0,
      teamId: "org-a",
    });

    expect(summary.total).toBe(1);
    expect(summary.bySite).toEqual([{ value: "site-a", count: 1 }]);
    expect(summary.byReason).toEqual([
      { value: "ua_bot", count: 1 },
      { value: "asn_hosting", count: 1 },
    ]);
    expect(summary.recent.map((row) => row.reasons)).toEqual([
      ["ua_bot", "asn_hosting"],
    ]);
  });
});
