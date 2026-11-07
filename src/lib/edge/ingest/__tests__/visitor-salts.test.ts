import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import type { SqlBinding } from "@/lib/edge/ingest/sql";
import {
  deleteExpiredVisitorSalts,
  utcDay,
  visitorSaltFor,
} from "@/lib/edge/ingest/visitor-salts";

const MIDNIGHT = Date.UTC(2026, 10, 7);
const HOUR_MS = 60 * 60 * 1000;

function saltStore() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE visitor_salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL)",
  );
  return {
    sqlOne: <T>(query: string, ...bindings: SqlBinding[]) =>
      (db.prepare(query).get(...bindings) as T | undefined) ?? null,
    sqlRun: (query: string, ...bindings: SqlBinding[]) =>
      Number(db.prepare(query).run(...bindings).changes),
    days: () =>
      (
        db.prepare("SELECT day FROM visitor_salts ORDER BY day").all() as {
          day: string;
        }[]
      ).map((row) => row.day),
  };
}

describe("visitor salts", () => {
  it("keeps one random salt per UTC day", () => {
    const store = saltStore();
    const today = utcDay(MIDNIGHT + HOUR_MS);

    const salt = visitorSaltFor(store, today, MIDNIGHT + HOUR_MS);

    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    expect(visitorSaltFor(store, today, MIDNIGHT + 2 * HOUR_MS)).toBe(salt);
    expect(
      visitorSaltFor(
        store,
        utcDay(MIDNIGHT + 25 * HOUR_MS),
        MIDNIGHT + 25 * HOUR_MS,
      ),
    ).not.toBe(salt);
  });

  it("deletes a day's salt once the day and the client lag are over", () => {
    const store = saltStore();
    const yesterday = utcDay(MIDNIGHT - HOUR_MS);
    visitorSaltFor(store, yesterday, MIDNIGHT - HOUR_MS);

    // A page view started just before midnight can still arrive after it.
    deleteExpiredVisitorSalts(store, MIDNIGHT + 60_000);
    expect(store.days()).toEqual([yesterday]);

    deleteExpiredVisitorSalts(store, MIDNIGHT + HOUR_MS);
    expect(store.days()).toEqual([]);
  });

  it("deletes expired salts when it creates a new day's salt", () => {
    const store = saltStore();
    visitorSaltFor(store, utcDay(MIDNIGHT - HOUR_MS), MIDNIGHT - HOUR_MS);

    visitorSaltFor(store, utcDay(MIDNIGHT + HOUR_MS), MIDNIGHT + HOUR_MS);

    expect(store.days()).toEqual([utcDay(MIDNIGHT + HOUR_MS)]);
  });
});
