import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabaseRuntime } from "@/lib/db";
import { flushCustomEventRow } from "@/lib/edge/ingest/custom-event-flush";
import { hashCustomEventStringValue } from "@/lib/edge/ingest/custom-event-json";
import type { IngestFlushContext } from "@/lib/edge/ingest/flush-types";
import type { BufferedCustomEventRow } from "@/lib/edge/ingest/types";
import type { InvocationPerformanceCounter } from "@/lib/edge/observability/logger";
import { BudgetedDatabase } from "@/lib/edge/scheduled-tasks/d1-query-budget";

const NOW = Date.UTC(2026, 4, 25, 12, 0, 0);

type Binding = string | number | null;

interface D1Call {
  sql: string;
  bindings: Binding[];
}

function bufferedCustomEvent(
  overrides: Partial<BufferedCustomEventRow> = {},
): BufferedCustomEventRow {
  return {
    eventId: "event-1",
    siteId: "site-1",
    visitId: "visit-1",
    occurredAt: NOW - 1_000,
    receivedAt: NOW,
    sequence: 7,
    eventName: "Signup",
    eventDataJson: '{"plan":"pro"}',
    revenueAmount: null,
    revenueCurrency: null,
    dirty: 1,
    flushAttempts: 0,
    createdAt: Math.floor(NOW / 1000),
    ...overrides,
  };
}

function createFlushContext(options: {
  eventExists?: boolean;
  dictionaryIds?: Record<string, number>;
  maxQueries?: number;
}): IngestFlushContext & {
  calls: D1Call[];
  sqlRun: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  observability: {
    increment: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
} {
  const calls: D1Call[] = [];
  const sqlRun = vi.fn(() => 1);
  const batch = vi.fn(async () => []);
  const dictionaryIds = new Map<string, number>();
  for (const [key, value] of Object.entries(options.dictionaryIds ?? {})) {
    dictionaryIds.set(key, value);
  }

  const prepare = vi.fn((sql: string) => ({
    bind: vi.fn((...bindings: Binding[]) => {
      calls.push({ sql, bindings });
      return {
        run: vi.fn(async () => ({})),
        first: vi.fn(async () => {
          if (sql.includes("FROM custom_events")) {
            return options.eventExists === false ? null : { ok: 1 };
          }
          if (sql.includes("FROM custom_event_names")) return { id: 10 };
          if (sql.includes("FROM custom_event_json_keys")) return { id: 20 };
          if (sql.includes("FROM custom_event_json_paths")) {
            const path = String(bindings[1] ?? "");
            return { id: path === "/" ? 30 : 31 };
          }
          return null;
        }),
      };
    }),
  }));

  return {
    db: new BudgetedDatabase(
      createDatabaseRuntime({ prepare, batch } as unknown as D1Database),
      options.maxQueries ?? 1000,
    ),
    dictionaryIds,
    sqlAll: vi.fn(() => []),
    // The site's key, stored by an earlier flush.
    sqlOne: vi.fn(() => ({ sitePk: 1 })) as IngestFlushContext["sqlOne"],
    sqlRun,
    readPersistedVisitRow: vi.fn(async () => null),
    insertBufferedVisitRow: vi.fn(),
    hasOpenVisitsForVisitor: vi.fn(() => false),
    pushRealtimeRecord: vi.fn(async () => undefined),
    observability: {
      increment:
        vi.fn<
          (counter: InvocationPerformanceCounter, amount?: number) => void
        >(),
      info: vi.fn<(message: string) => void>(),
      warn: vi.fn<(message: string) => void>(),
      error: vi.fn<(message: string) => void>(),
    },
    calls,
    batch,
  };
}

describe("custom event flush", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("flushes custom events and resolves dictionaries", async () => {
    const context = createFlushContext({});
    const row = bufferedCustomEvent({
      revenueAmount: 15.99,
      revenueCurrency: "USD",
    });

    await expect(flushCustomEventRow(context, row)).resolves.toBe(true);

    expect(context.batch).toHaveBeenCalledTimes(1);
    expect(context.batch.mock.calls[0]![0]).toHaveLength(4);
    const batchCalls = context.calls.slice(-5, -1);
    expect(
      batchCalls.map(
        (call) => call.sql.match(/INSERT OR IGNORE INTO ([a-z_]+)/u)?.[1],
      ),
    ).toEqual([
      "custom_events",
      "custom_event_json_nodes",
      "custom_event_json_nodes",
      "custom_event_json_values",
    ]);
    const createdAt = Math.floor(NOW / 1000);
    expect(batchCalls.map((call) => call.bindings)).toEqual([
      [
        "event-1",
        "site-1",
        1,
        "visit-1",
        10,
        row.occurredAt,
        NOW,
        7,
        2,
        1,
        15.99,
        "USD",
        createdAt,
        1,
        "visit-1",
      ],
      [1, null, null, 30, 4, null, null, 0, "event-1"],
      [2, 1, 20, 31, 1, 0, null, 1, "event-1"],
      [
        2,
        "site-1",
        1,
        10,
        31,
        row.occurredAt,
        null,
        1,
        "pro",
        hashCustomEventStringValue("pro"),
        null,
        null,
        "event-1",
      ],
    ]);
    expect(context.dictionaryIds).toEqual(
      new Map([
        ["name:site-1:Signup", 10],
        ["key:site-1:plan", 20],
        ["path:site-1:/", 30],
        ["path:site-1:/plan", 31],
      ]),
    );
    expect(
      context.calls.some((call) => call.sql.includes("event_name_id")),
    ).toBe(true);
    expect(context.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bindings: ["site-1", 1, "Signup", createdAt, createdAt],
        }),
        expect.objectContaining({
          bindings: ["site-1", 1, "plan", createdAt, createdAt],
        }),
        expect.objectContaining({
          bindings: ["site-1", 1, "/", createdAt, createdAt],
        }),
        expect.objectContaining({ bindings: ["event-1"] }),
      ]),
    );
    expect(context.sqlRun).toHaveBeenCalledTimes(1);
    expect(context.sqlRun).toHaveBeenCalledWith(
      expect.stringContaining("SET dirty = 0, flush_attempts = 0"),
      "event-1",
    );
    expect(context.observability.increment).toHaveBeenCalledWith(
      "flushedCustomEvents",
      1,
    );
  });

  it("keeps an event dirty, its failure counted, when the batch does not create it", async () => {
    const context = createFlushContext({ eventExists: false });

    await expect(
      flushCustomEventRow(context, bufferedCustomEvent()),
    ).resolves.toBe(false);

    expect(context.batch).toHaveBeenCalledTimes(1);
    expect(context.sqlRun).toHaveBeenCalledWith(
      expect.stringContaining("SET flush_attempts = flush_attempts + 1"),
      "insert_did_not_create_event",
      "event-1",
    );
    expect(context.observability.error).toHaveBeenCalledWith(
      "do.flush.custom_event_failed",
    );
  });

  it("records a non-Error D1 failure as text", async () => {
    const context = createFlushContext({});
    context.batch.mockRejectedValue("string failure");

    await expect(
      flushCustomEventRow(context, bufferedCustomEvent()),
    ).resolves.toBe(false);

    expect(context.sqlRun).toHaveBeenCalledWith(
      expect.stringContaining("SET flush_attempts = flush_attempts + 1"),
      "string failure",
      "event-1",
    );
  });

  it("leaves running out of D1 queries to the caller, without counting a failure", async () => {
    const context = createFlushContext({ maxQueries: 2 });

    await expect(
      flushCustomEventRow(context, bufferedCustomEvent()),
    ).rejects.toThrow("more than its 2 D1 queries");

    expect(context.sqlRun).not.toHaveBeenCalled();
  });

  it("uses cached dictionary ids without re-querying dictionary tables", async () => {
    const context = createFlushContext({
      dictionaryIds: {
        "name:site-1:Signup": 10,
        "key:site-1:plan": 20,
        "path:site-1:/": 30,
        "path:site-1:/plan": 31,
      },
    });

    await expect(
      flushCustomEventRow(context, bufferedCustomEvent()),
    ).resolves.toBe(true);

    expect(
      context.calls.some((call) => call.sql.includes("custom_event_json_keys")),
    ).toBe(false);
    expect(context.batch).toHaveBeenCalledTimes(1);
  });
});
