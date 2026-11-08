import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import {
  createSqliteD1Database,
  type SqliteD1Trace,
} from "@/lib/db/__tests__/sqlite-d1";
import { seedSites } from "@/lib/edge/__tests__/rollup-fixtures";
import { IngestDurableObject } from "@/lib/edge/ingest/durable-object";
import { runVisitRollups } from "@/lib/edge/scheduled-tasks/visit-rollups";
import type {
  Env,
  IngestEnvelopePayload,
  TrackerClientPayload,
} from "@/lib/edge/types";
const NOW = Date.UTC(2026, 4, 25, 12, 0, 0);
const VISIT_TIMEOUT_MS = 12 * 60 * 60 * 1000;
const RECENT_EVENT_RETENTION_MS = 30 * 60 * 1000;
const SESSION_WINDOW_MS = 30 * 60 * 1000;
const MAX_CLIENT_EVENT_LAG_MS = 30 * 1000;
type SqlBinding = string | number | null;
type SqlRow = Record<string, unknown>;
const VISIT_COLUMNS = [
  "visit_id",
  "site_id",
  "site_pk",
  "visitor_id",
  "session_id",
  "status",
  "started_at",
  "last_activity_at",
  "ended_at",
  "finalized_at",
  "duration_ms",
  "scroll_depth",
  "duration_source",
  "exit_reason",
  "pathname",
  "query_string",
  "hash_fragment",
  "hostname",
  "title",
  "referrer_url",
  "referrer_host",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "channel",
  "is_eu",
  "country",
  "region",
  "region_code",
  "city",
  "continent",
  "latitude",
  "longitude",
  "timezone",
  "browser",
  "browser_version",
  "os",
  "os_version",
  "device_type",
  "screen_width",
  "screen_height",
  "language",
  "created_at",
  "updated_at",
] as const;
const BUFFERED_VISIT_COLUMNS = [
  ...VISIT_COLUMNS.filter((column) => column !== "site_pk"),
  "hidden_at",
  "dirty",
  "flush_attempts",
  "last_flush_error",
  "buffer_revision",
] as const;
type VisitColumn = (typeof VISIT_COLUMNS)[number];
type BufferedVisitColumn = (typeof BUFFERED_VISIT_COLUMNS)[number];
type VisitRecord = Record<VisitColumn, SqlBinding>;
type BufferedVisitRecord = Record<BufferedVisitColumn, SqlBinding>;
class SqlResult<T extends SqlRow = SqlRow> {
  readonly rowsWritten: number;

  constructor(
    private readonly rows: T[],
    rowsWritten: number,
  ) {
    this.rowsWritten = rowsWritten;
  }

  toArray(): T[] {
    return this.rows;
  }
}
class SqliteSqlStorage {
  readonly db = new DatabaseSync(":memory:");

  exec(query: string, ...bindings: SqlBinding[]): SqlResult {
    const normalized = query.trim().toUpperCase();
    const statement = this.db.prepare(query);
    if (
      normalized.startsWith("SELECT") ||
      normalized.startsWith("PRAGMA") ||
      normalized.startsWith("WITH") ||
      normalized.startsWith("EXPLAIN")
    ) {
      return new SqlResult(
        statement.all(...bindings).map((row) => ({ ...row })),
        0,
      );
    }
    const result = statement.run(...bindings);
    return new SqlResult([], Number(result.changes ?? 0));
  }

  close(): void {
    this.db.close();
  }
}
class FakeD1Statement {
  private bindings: SqlBinding[] = [];

  constructor(
    private readonly d1: FakeD1Database,
    private readonly query: string,
  ) {}

  bind(...bindings: SqlBinding[]): this {
    this.bindings = bindings;
    return this;
  }

  async run(): Promise<{ success: true; meta: { changes: number } }> {
    if (this.d1.failRunCalls > 0) {
      this.d1.failRunCalls -= 1;
      throw new Error("forced run failure");
    }
    const result = this.d1.db.prepare(this.query).run(...this.bindings);
    return {
      success: true,
      meta: { changes: Number(result.changes ?? 0) },
    };
  }

  async all<T extends SqlRow = SqlRow>(): Promise<{ results: T[] }> {
    return {
      results: this.d1.db
        .prepare(this.query)
        .all(...this.bindings)
        .map((row) => ({ ...row }) as T),
    };
  }

  async first<T extends SqlRow = SqlRow>(): Promise<T | null> {
    if (this.d1.failFirstCalls > 0) {
      this.d1.failFirstCalls -= 1;
      throw new Error("forced first failure");
    }
    const row = this.d1.db.prepare(this.query).get(...this.bindings);
    return row ? ({ ...row } as T) : null;
  }
}
type FakeBatchHook = (statements: FakeD1Statement[]) => void | Promise<void>;
class FakeD1Database {
  readonly db = new DatabaseSync(":memory:");
  failBatchCalls = 0;
  failFirstCalls = 0;
  failRunCalls = 0;
  beforeBatch: FakeBatchHook | null = null;
  readonly prepare = vi.fn((query: string) => new FakeD1Statement(this, query));
  readonly batch = vi.fn(async (statements: FakeD1Statement[]) => {
    if (this.failBatchCalls > 0) {
      this.failBatchCalls -= 1;
      throw new Error("forced batch failure");
    }
    if (this.beforeBatch) {
      const hook = this.beforeBatch;
      this.beforeBatch = null;
      await hook(statements);
    }
    // A D1 batch is a transaction: all of it or none.
    this.db.exec("BEGIN");
    try {
      for (const statement of statements) {
        await statement.run();
      }
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    this.db.exec("COMMIT");
    return statements.map(() => ({ success: true }));
  });

  constructor() {
    this.db.exec(`
      CREATE TABLE site_identities (
        site_pk INTEGER PRIMARY KEY,
        site_id TEXT NOT NULL UNIQUE
      );
      CREATE TABLE visits (
        visit_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL,
        ended_at INTEGER,
        finalized_at INTEGER,
        duration_ms INTEGER,
        scroll_depth INTEGER,
        duration_source TEXT,
        exit_reason TEXT,
        pathname TEXT NOT NULL,
        query_string TEXT NOT NULL DEFAULT '',
        hash_fragment TEXT NOT NULL DEFAULT '',
        hostname TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        referrer_url TEXT NOT NULL DEFAULT '',
        referrer_host TEXT NOT NULL DEFAULT '',
        utm_source TEXT NOT NULL DEFAULT '',
        utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT '',
        utm_term TEXT NOT NULL DEFAULT '',
        utm_content TEXT NOT NULL DEFAULT '',
        channel TEXT NOT NULL,
        is_eu INTEGER NOT NULL DEFAULT 0,
        country TEXT NOT NULL DEFAULT '',
        region TEXT NOT NULL DEFAULT '',
        region_code TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        continent TEXT NOT NULL DEFAULT '',
        latitude REAL,
        longitude REAL,
        timezone TEXT NOT NULL DEFAULT '',
        browser TEXT NOT NULL DEFAULT '',
        browser_version TEXT NOT NULL DEFAULT '',
        os TEXT NOT NULL DEFAULT '',
        os_version TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT '',
        screen_width INTEGER,
        screen_height INTEGER,
        language TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE custom_event_names (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        UNIQUE(site_pk, name)
      );
      CREATE TABLE custom_event_json_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        "key" TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        UNIQUE(site_pk, "key")
      );
      CREATE TABLE custom_event_json_paths (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        UNIQUE(site_pk, path)
      );
      CREATE TABLE custom_events (
        event_pk INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        visit_id TEXT NOT NULL,
        event_name_id INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL,
        received_at INTEGER NOT NULL,
        sequence INTEGER NOT NULL,
        node_count INTEGER NOT NULL,
        value_count INTEGER NOT NULL,
        revenue_amount REAL,
        revenue_currency TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE custom_event_json_nodes (
        event_pk INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        parent_node_id INTEGER,
        key_id INTEGER,
        path_id INTEGER NOT NULL,
        value_type INTEGER NOT NULL,
        member_order INTEGER,
        array_index INTEGER,
        depth INTEGER NOT NULL,
        UNIQUE(event_pk, node_id)
      );
      CREATE TABLE custom_event_json_values (
        event_pk INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        site_id TEXT NOT NULL,
        site_pk INTEGER NOT NULL,
        event_name_id INTEGER NOT NULL,
        path_id INTEGER NOT NULL,
        occurred_at INTEGER NOT NULL,
        scope_node_id INTEGER,
        value_type INTEGER NOT NULL,
        string_value TEXT,
        string_hash TEXT,
        number_value REAL,
        boolean_value INTEGER,
        UNIQUE(event_pk, node_id, path_id)
      );
      CREATE TABLE visit_rollup_state (
        site_pk INTEGER PRIMARY KEY,
        first_day INTEGER NOT NULL,
        last_day INTEGER NOT NULL
      );
      CREATE TABLE visit_rollup_dirty_days (
        site_pk INTEGER NOT NULL,
        day INTEGER NOT NULL,
        PRIMARY KEY (site_pk, day)
      );

      INSERT INTO site_identities (site_pk, site_id) VALUES (1, 'site-1');

    `);
  }

  insertVisit(overrides: Partial<VisitRecord> = {}): VisitRecord {
    const row = visitRecord(overrides);
    const placeholders = VISIT_COLUMNS.map(() => "?").join(", ");
    this.db
      .prepare(
        `INSERT INTO visits (${VISIT_COLUMNS.join(", ")}) VALUES (${placeholders})`,
      )
      .run(...VISIT_COLUMNS.map((column) => row[column]));
    return row;
  }

  all<T extends SqlRow = SqlRow>(
    query: string,
    ...bindings: SqlBinding[]
  ): T[] {
    return this.db
      .prepare(query)
      .all(...bindings)
      .map((row) => ({ ...row }) as T);
  }

  close(): void {
    this.db.close();
  }
}
type FakeWebSocketEvent = "close" | "error";
type FakeWebSocketEventPayload = { code?: number };
class FakeWebSocket {
  accepted = false;
  closed = false;
  failSend = false;
  failClose = false;
  readonly sent: string[] = [];
  private attachment: unknown = null;
  private readonly listeners = new Map<
    FakeWebSocketEvent,
    Array<(event: FakeWebSocketEventPayload) => void>
  >();

  accept(): void {
    this.accepted = true;
  }

  serializeAttachment(attachment: unknown): void {
    this.attachment = attachment;
  }

  deserializeAttachment(): unknown {
    return this.attachment;
  }

  send(payload: string): void {
    if (this.failSend || this.closed) {
      throw new Error("forced websocket send failure");
    }
    this.sent.push(payload);
  }

  close(): void {
    if (this.failClose) {
      throw new Error("forced websocket close failure");
    }
    this.closed = true;
  }

  addEventListener(
    event: FakeWebSocketEvent,
    listener: (event: FakeWebSocketEventPayload) => void,
  ): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  emit(
    event: FakeWebSocketEvent,
    payload: FakeWebSocketEventPayload = {},
  ): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}
class FakeUpgradeResponse {
  readonly status: number;
  readonly webSocket: FakeWebSocket | undefined;

  constructor(
    private readonly body: BodyInit | null = null,
    init: ResponseInit & { webSocket?: FakeWebSocket } = {},
  ) {
    this.status = init.status ?? 200;
    this.webSocket = init.webSocket;
  }

  async text(): Promise<string> {
    return typeof this.body === "string" ? this.body : "";
  }
}
function toSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}
function visitRecord(overrides: Partial<VisitRecord> = {}): VisitRecord {
  return {
    visit_id: "visit-1",
    site_id: "site-1",
    site_pk: 1,
    visitor_id: "visitor-1",
    session_id: "session-1",
    status: "open",
    started_at: NOW - 1_000,
    last_activity_at: NOW - 1_000,
    ended_at: null,
    finalized_at: null,
    duration_ms: null,
    scroll_depth: null,
    duration_source: null,
    exit_reason: null,
    pathname: "/docs",
    query_string: "",
    hash_fragment: "",
    hostname: "example.com",
    title: "Docs",
    referrer_url: "https://ref.example/start",
    referrer_host: "ref.example",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
    channel: "referral",
    is_eu: 0,
    country: "US",
    region: "California",
    region_code: "CA",
    city: "San Francisco",
    continent: "NA",
    latitude: 37.77,
    longitude: -122.42,
    timezone: "America/Los_Angeles",
    browser: "Chrome",
    browser_version: "120",
    os: "Windows",
    os_version: "11",
    device_type: "desktop",
    screen_width: 1440,
    screen_height: 900,
    language: "en-US",
    created_at: toSeconds(NOW),
    updated_at: toSeconds(NOW),
    ...overrides,
  };
}
function bufferedVisitRecord(
  overrides: Partial<BufferedVisitRecord> = {},
): BufferedVisitRecord {
  const base = visitRecord(overrides as Partial<VisitRecord>);
  return {
    ...Object.fromEntries(
      VISIT_COLUMNS.map((column) => [column, base[column]]),
    ),
    hidden_at: null,
    dirty: 1,
    flush_attempts: 0,
    last_flush_error: null,
    buffer_revision: 1,
    ...overrides,
  } as BufferedVisitRecord;
}
function insertBufferedVisit(
  sql: SqliteSqlStorage,
  overrides: Partial<BufferedVisitRecord> = {},
): BufferedVisitRecord {
  const row = bufferedVisitRecord(overrides);
  const placeholders = BUFFERED_VISIT_COLUMNS.map(() => "?").join(", ");
  sql.exec(
    `INSERT INTO buffered_visits (${BUFFERED_VISIT_COLUMNS.join(", ")}) VALUES (${placeholders})`,
    ...BUFFERED_VISIT_COLUMNS.map((column) => row[column]),
  );
  return row;
}
function insertBufferedCustomEvent(
  sql: SqliteSqlStorage,
  overrides: Partial<Record<string, SqlBinding>> = {},
): Record<string, SqlBinding> {
  const row: Record<string, SqlBinding> = {
    event_id: "event-1",
    site_id: "site-1",
    visit_id: "visit-1",
    occurred_at: NOW - 1_000,
    received_at: NOW,
    sequence: 0,
    event_name: "Test Event",
    event_data_json: "{}",
    dirty: 1,
    flush_attempts: 0,
    last_flush_error: null,
    created_at: toSeconds(NOW),
    ...overrides,
  };
  const columns = Object.keys(row);
  sql.exec(
    `INSERT INTO buffered_custom_events (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    ...columns.map((column) => row[column]),
  );
  return row;
}
interface TestDoContext {
  object: IngestDurableObject;
  sql: SqliteSqlStorage;
  d1: FakeD1Database;
  state: DurableObjectState;
  getAlarmAt: () => number | null;
}
function createTestDo(
  envOverrides: Partial<Env> = {},
  sql = new SqliteSqlStorage(),
): TestDoContext {
  const d1 = new FakeD1Database();
  let alarmAt: number | null = null;
  const storage = {
    sql,
    transactionSync: vi.fn((callback: () => unknown) => callback()),
    getAlarm: vi.fn(async () => alarmAt),
    setAlarm: vi.fn(async (scheduledAt: number) => {
      alarmAt = scheduledAt;
    }),
    deleteAlarm: vi.fn(async () => {
      alarmAt = null;
    }),
  };
  const sockets = new Set<FakeWebSocket>();
  const state = {
    storage,
    acceptWebSocket: vi.fn((socket: FakeWebSocket) => {
      socket.accept();
      sockets.add(socket);
    }),
    getWebSockets: vi.fn(() => sockets),
    setWebSocketAutoResponse: vi.fn(),
    blockConcurrencyWhile: vi.fn((callback: () => void | Promise<void>) =>
      Promise.resolve(callback()),
    ),
  } as unknown as DurableObjectState;
  const env = {
    DB: d1 as unknown as D1Database,
    INGEST_DO: {} as DurableObjectNamespace,
    MAIN_SECRET: "test-secret-with-enough-entropy",
    ...envOverrides,
  } as Env;

  return {
    object: new IngestDurableObject(state, env),
    sql,
    d1,
    state,
    getAlarmAt: () => alarmAt,
  };
}
function envelope(
  clientOverrides: Partial<TrackerClientPayload> = {},
  requestOverrides: Partial<IngestEnvelopePayload["request"]> = {},
): IngestEnvelopePayload {
  const client: TrackerClientPayload = {
    siteId: "site-1",
    kind: "pageview",
    visitId: "visit-1",
    timestamp: NOW - 1_000,
    startedAt: NOW - 1_000,
    pathname: "/docs",
    query: "utm_source=newsletter&utm_medium=email&utm_campaign=launch",
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "launch",
    hash: "#intro",
    hostname: "example.com",
    title: "Docs",
    language: "en-US",
    timezone: "America/Los_Angeles",
    screenWidth: 1440,
    screenHeight: 900,
    referrerUrl: "https://ref.example/start",
    ...clientOverrides,
  };
  return {
    request: {
      method: "POST",
      url: "https://collector.example/collect",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "cf-connecting-ip": "203.0.113.10",
      },
      cf: {
        isEUCountry: false,
        country: "US",
        region: "California",
        regionCode: "CA",
        city: "San Francisco",
        continent: "NA",
        latitude: 37.77,
        longitude: -122.42,
        postalCode: "94105",
        metroCode: "807",
        timezone: "America/Los_Angeles",
        asOrganization: "Example ISP",
      },
      body: "",
      receivedAt: NOW,
      ...requestOverrides,
    },
    client,
    trace: {
      id: "trace-1",
      source: "test",
      acceptedAt: NOW,
    },
  };
}
const ENTRY_ATTRIBUTION = {
  referrer_host: "ref.example",
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "launch",
};
/** A second pageview of the session: its referrer is the site itself. */
function sameSiteNavigation(
  at: number,
  requestOverrides: Partial<IngestEnvelopePayload["request"]> = {},
): IngestEnvelopePayload {
  return envelope(
    {
      visitId: "next-visit",
      navigation: "route",
      startedAt: at,
      timestamp: at,
      pathname: "/pricing",
      query: "",
      referrerUrl: "https://example.com/docs",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
    },
    requestOverrides,
  );
}
function ingestRequest(body: unknown): Request {
  return new Request("https://ingest.internal/ingest", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
async function postIngest(
  object: IngestDurableObject,
  body: unknown,
): Promise<Response> {
  return object.fetch(ingestRequest(body));
}
function localRows<T extends SqlRow = SqlRow>(
  sql: SqliteSqlStorage,
  query: string,
  ...bindings: SqlBinding[]
): T[] {
  return sql.exec(query, ...bindings).toArray() as T[];
}
beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("IngestDurableObject", () => {
  it("exports a durable object class and rejects unknown or invalid request routes", async () => {
    const ctx = createTestDo();

    expect(
      (
        ctx.object as unknown as {
          sqlRun: (query: string, ...bindings: SqlBinding[]) => number;
        }
      ).sqlRun("UPDATE buffered_visits SET dirty = dirty WHERE 0"),
    ).toBe(0);

    expect(IngestDurableObject).toBeTypeOf("function");

    const missing = await ctx.object.fetch(
      new Request("https://ingest.internal/nope"),
    );
    expect(missing.status).toBe(404);
    await expect(missing.text()).resolves.toBe("Not Found");

    const getIngest = await ctx.object.fetch(
      new Request("https://ingest.internal/ingest"),
    );
    expect(getIngest.status).toBe(404);

    const reconcile = await ctx.object.fetch(
      new Request("https://ingest.internal/reconcile", { method: "POST" }),
    );
    expect(reconcile.status).toBe(200);
    await expect(reconcile.json()).resolves.toEqual({ ok: true });

    const badWsUpgrade = await ctx.object.fetch(
      new Request("https://ingest.internal/ws"),
    );
    expect(badWsUpgrade.status).toBe(426);

    // WebSocket upgrade requires WebSocketPair to be defined
    const client = new FakeWebSocket();
    const server = new FakeWebSocket();
    class TestWebSocketPair {
      constructor() {
        return [client, server];
      }
    }
    const RealResponse = globalThis.Response;
    vi.stubGlobal("WebSocketPair", TestWebSocketPair);
    vi.stubGlobal("Response", FakeUpgradeResponse);

    try {
      const wsUpgrade = await ctx.object.fetch({
        url: "https://ingest.internal/ws?token=wrong",
        method: "GET",
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "upgrade" ? "websocket" : null,
        },
      } as unknown as Request);
      // Token is no longer validated, so this should succeed with 101
      expect(wsUpgrade.status).toBe(101);
    } finally {
      vi.stubGlobal("Response", RealResponse);
    }
  });

  it("uses snapshot defaults and accepts authenticated websocket upgrades", async () => {
    const ctx = createTestDo();

    const snapshot = await ctx.object.fetch(
      new Request("https://ingest.internal/snapshot"),
    );
    expect(snapshot.status).toBe(200);
    await expect(snapshot.json()).resolves.toMatchObject({
      ok: true,
      buffered: 0,
      events: [],
    });

    const client = new FakeWebSocket();
    const server = new FakeWebSocket();
    class AuthenticatedWebSocketPair {
      constructor() {
        return [client, server];
      }
    }
    const RealResponse = globalThis.Response;
    vi.stubGlobal("WebSocketPair", AuthenticatedWebSocketPair);
    vi.stubGlobal("Response", FakeUpgradeResponse);

    try {
      const upgrade = await ctx.object.fetch({
        url: "https://ingest.internal/ws?token=secret-token",
        method: "GET",
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "upgrade" ? "websocket" : null,
        },
      } as unknown as Request);

      expect(upgrade.status).toBe(101);
      expect(server.accepted).toBe(true);
      expect(upgrade.webSocket).toBe(client);
    } finally {
      vi.stubGlobal("Response", RealResponse);
    }
  });

  it("configures websocket auto responses when supported by the runtime", () => {
    class AutoResponsePair {
      constructor(
        readonly request: string,
        readonly response: string,
      ) {}
    }
    vi.stubGlobal("WebSocketRequestResponsePair", AutoResponsePair);

    const ctx = createTestDo();
    expect(
      (
        ctx.state as unknown as {
          setWebSocketAutoResponse: ReturnType<typeof vi.fn>;
        }
      ).setWebSocketAutoResponse,
    ).toHaveBeenCalledOnce();
    expect(
      (
        (
          ctx.state as unknown as {
            setWebSocketAutoResponse: ReturnType<typeof vi.fn>;
          }
        ).setWebSocketAutoResponse.mock.calls[0]?.[0] as AutoResponsePair
      ).request,
    ).toBe("ping");
  });

  it("normalizes invalid websocket close codes and tolerates close failures", () => {
    const ctx = createTestDo();
    const socket = new FakeWebSocket();
    socket.failClose = true;

    expect(() =>
      ctx.object.webSocketClose(
        socket as unknown as WebSocket,
        1004,
        "invalid-code",
        false,
      ),
    ).not.toThrow();
  });

  it("reports active visitors from the active endpoint", async () => {
    const ctx = createTestDo();
    await postIngest(ctx.object, envelope({ timestamp: NOW, startedAt: NOW }));

    const response = await ctx.object.fetch(
      new Request("https://ingest.internal/active"),
    );
    await expect(response.json()).resolves.toEqual({ ok: true, activeNow: 1 });
  });

  it("records direct Durable Object SQL calls in the request invocation", async () => {
    const ctx = createTestDo();

    const response = await ctx.object.fetch(
      new Request("https://ingest.internal/snapshot"),
    );
    expect(console.log).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: "do",
        request: expect.objectContaining({ route: "/snapshot", status: 200 }),
        performance: expect.objectContaining({
          doSqlStatements: expect.any(Number),
        }),
        logs: expect.arrayContaining([
          expect.objectContaining({ message: "do_sql.all.started" }),
          expect.objectContaining({ message: "do_sql.all.completed" }),
        ]),
      }),
    );
  });

  it("emits a separate websocket lifecycle record after the upgrade response", async () => {
    const ctx = createTestDo();
    const client = new FakeWebSocket();
    const server = new FakeWebSocket();
    class LifecycleWebSocketPair {
      constructor() {
        return [client, server];
      }
    }
    const RealResponse = globalThis.Response;
    vi.stubGlobal("WebSocketPair", LifecycleWebSocketPair);
    vi.stubGlobal("Response", FakeUpgradeResponse);

    try {
      const response = await ctx.object.fetch({
        url: "https://ingest.internal/ws",
        method: "GET",
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "upgrade" ? "websocket" : null,
        },
      } as unknown as Request);
      expect(response.status).toBe(101);

      ctx.object.webSocketMessage(
        server as unknown as WebSocket,
        "ignored-client-message",
      );
      ctx.object.webSocketClose(server as unknown as WebSocket, 1000, "", true);

      expect(console.log).toHaveBeenLastCalledWith(
        expect.objectContaining({
          source: "do",
          request: {
            route: "/ws",
            method: "WEBSOCKET",
            status: 101,
            outcome: "ok",
          },
          performance: expect.objectContaining({
            webSocketDurationMs: expect.any(Number),
          }),
          logs: [
            expect.objectContaining({
              message: "do.websocket.closed",
              data: { code: 1000 },
            }),
          ],
        }),
      );
    } finally {
      vi.stubGlobal("Response", RealResponse);
    }
  });

  it("returns bad request for malformed JSON and ignores invalid normalized payloads", async () => {
    const ctx = createTestDo();

    const badJson = await postIngest(ctx.object, "{not-json");
    expect(badJson.status).toBe(400);
    await expect(badJson.text()).resolves.toBe("Bad Request");

    const missingSite = await postIngest(ctx.object, envelope({ siteId: "" }));
    expect(missingSite.status).toBe(202);
    await expect(missingSite.text()).resolves.toBe("ignored:missing_site_id");

    const missingHostname = await postIngest(
      ctx.object,
      envelope({ hostname: "" }),
    );
    expect(missingHostname.status).toBe(202);
    await expect(missingHostname.text()).resolves.toBe(
      "ignored:missing_hostname",
    );

    const unsupportedKind = await postIngest(
      ctx.object,
      envelope({ kind: "not_supported" as TrackerClientPayload["kind"] }),
    );
    expect(unsupportedKind.status).toBe(202);
    await expect(unsupportedKind.text()).resolves.toBe(
      "ignored:unsupported_kind",
    );

    expect(
      localRows<{ count: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS count FROM buffered_visits",
      )[0]?.count,
    ).toBe(0);
  });

  it("buffers pageviews, normalizes context, and exposes snapshots", async () => {
    const ctx = createTestDo();

    const response = await postIngest(ctx.object, envelope());

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("ok");
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);

    const [visit] = localRows<{
      visit_id: string;
      session_id: string;
      visitor_id: string;
      status: string;
      pathname: string;
      query_string: string;
      hash_fragment: string;
      utm_source: string;
      utm_medium: string;
      utm_campaign: string;
      referrer_host: string;
      screen_width: number;
      screen_height: number;
      dirty: number;
    }>(
      ctx.sql,
      `
        SELECT visit_id, status, pathname, query_string, hash_fragment,
               session_id, visitor_id, utm_source, utm_medium, utm_campaign,
               referrer_host, screen_width, screen_height, dirty
        FROM buffered_visits
      `,
    );
    expect(visit).toMatchObject({
      visit_id: "visit-1",
      status: "open",
      pathname: "/docs",
      query_string:
        "utm_source=newsletter&utm_medium=email&utm_campaign=launch",
      hash_fragment: "#intro",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "launch",
      referrer_host: "ref.example",
      screen_width: 1440,
      screen_height: 900,
      dirty: 1,
    });

    const snapshot = await ctx.object.fetch(
      new Request(
        `https://ingest.internal/snapshot?from=0&to=${NOW}&limit=25.9`,
      ),
    );
    expect(snapshot.status).toBe(200);
    await expect(snapshot.json()).resolves.toMatchObject({
      ok: true,
      buffered: 0,
      events: [
        {
          id: "visit-1",
          eventType: "visit",
          visitId: "visit-1",
          sessionId: visit.session_id,
          pathname: "/docs",
          hostname: "example.com",
          visitorId: visit.visitor_id,
          screenWidth: 1440,
          screenHeight: 900,
        },
      ],
    });
  });

  it("derives visitor IDs on the server and ignores client visitor IDs", async () => {
    const ctx = createTestDo();

    const response = await postIngest(
      ctx.object,
      envelope(
        // An old tracker still sends its own visitor id.
        { visitorId: "client-visitor" } as Partial<TrackerClientPayload>,
        {
          cf: {
            isEUCountry: true,
            country: "DE",
          },
        },
      ),
    );

    expect(response.status).toBe(202);
    const [visit] = localRows<{ visitor_id: string; is_eu: number }>(
      ctx.sql,
      "SELECT visitor_id, is_eu FROM buffered_visits WHERE visit_id = ?",
      "visit-1",
    );
    expect(visit?.is_eu).toBe(1);
    expect(visit?.visitor_id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("closes previous pageviews and handles leave events", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-1",
        startedAt: NOW - 20_000,
        timestamp: NOW - 20_000,
        pathname: "/first",
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-2",
        navigation: "route",
        startedAt: NOW - 10_000,
        timestamp: NOW - 10_000,
        pathname: "/second",
        referrerUrl: "https://example.com/first",
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "visit-2",
        timestamp: NOW - 5_000,
      }),
    );

    const rows = localRows<{
      visit_id: string;
      status: string;
      ended_at: number | null;
      duration_ms: number | null;
      duration_source: string | null;
    }>(
      ctx.sql,
      `
        SELECT visit_id, status, ended_at, duration_ms, duration_source
        FROM buffered_visits
        ORDER BY visit_id
      `,
    );

    expect(rows).toMatchObject([
      {
        visit_id: "visit-1",
        status: "complete",
        ended_at: NOW - 10_000,
        duration_ms: 10_000,
        duration_source: "server",
      },
      {
        visit_id: "visit-2",
        status: "complete",
        ended_at: NOW - 5_000,
        duration_ms: 5000,
        duration_source: "server",
      },
    ]);

    const beforeDuplicateLeave = localRows<{ buffer_revision: number }>(
      ctx.sql,
      "SELECT buffer_revision FROM buffered_visits WHERE visit_id = ?",
      "visit-2",
    )[0];
    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "visit-2",
        timestamp: NOW - 5_000,
      }),
    );
    expect(
      localRows<{ buffer_revision: number }>(
        ctx.sql,
        "SELECT buffer_revision FROM buffered_visits WHERE visit_id = ?",
        "visit-2",
      )[0],
    ).toEqual(beforeDuplicateLeave);
  });

  it("reuses server sessions across browser contexts without closing other tabs", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "tab-a-visit",
        startedAt: NOW - 20_000,
        timestamp: NOW - 20_000,
        pathname: "/tab-a",
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "tab-b-visit",
        startedAt: NOW - 10_000,
        timestamp: NOW - 10_000,
        pathname: "/tab-b",
      }),
    );

    const rows = localRows<{
      visit_id: string;
      session_id: string;
      status: string;
    }>(
      ctx.sql,
      `
        SELECT visit_id, session_id, status
        FROM buffered_visits
        ORDER BY visit_id
      `,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.session_id).toBe(rows[1]?.session_id);
    expect(rows).toMatchObject([
      {
        visit_id: "tab-a-visit",
        status: "open",
      },
      {
        visit_id: "tab-b-visit",
        status: "open",
      },
    ]);
  });

  it("closes the matching route referrer instead of another active tab", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "tab-a-visit",
        startedAt: NOW - 30_000,
        timestamp: NOW - 30_000,
        pathname: "/tab-a",
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "tab-b-visit",
        startedAt: NOW - 10_000,
        timestamp: NOW - 10_000,
        pathname: "/tab-b",
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "tab-a-next",
        navigation: "route",
        startedAt: NOW - 5_000,
        timestamp: NOW - 5_000,
        pathname: "/tab-a/next",
        referrerUrl: "https://example.com/tab-a",
      }),
    );

    const rows = localRows<{
      visit_id: string;
      status: string;
      ended_at: number | null;
      duration_ms: number | null;
    }>(
      ctx.sql,
      `
        SELECT visit_id, status, ended_at, duration_ms
        FROM buffered_visits
        ORDER BY visit_id
      `,
    );

    expect(rows).toMatchObject([
      {
        visit_id: "tab-a-next",
        status: "open",
      },
      {
        visit_id: "tab-a-visit",
        status: "complete",
        ended_at: NOW - 5_000,
        duration_ms: 25_000,
      },
      {
        visit_id: "tab-b-visit",
        status: "open",
      },
    ]);
  });

  it("starts a new server session after 30 minutes without a page view", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope(
        {
          visitId: "old-visit",
          startedAt: NOW - SESSION_WINDOW_MS - 1,
          timestamp: NOW - SESSION_WINDOW_MS - 1,
          pathname: "/old",
        },
        { receivedAt: NOW - SESSION_WINDOW_MS - 1 },
      ),
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "new-visit",
        startedAt: NOW,
        timestamp: NOW,
        pathname: "/new",
      }),
    );

    const rows = localRows<{ session_id: string }>(
      ctx.sql,
      `
        SELECT session_id
        FROM buffered_visits
        ORDER BY visit_id
      `,
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.session_id).not.toBe(rows[1]?.session_id);
  });

  it("gives later pageviews of a session the entry's referrer and UTM tags", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "entry-visit",
        startedAt: NOW - 20_000,
        timestamp: NOW - 20_000,
      }),
    );
    await postIngest(ctx.object, sameSiteNavigation(NOW - 10_000));

    expect(
      localRows(
        ctx.sql,
        `
          SELECT visit_id, referrer_host, utm_source, utm_medium, utm_campaign
          FROM buffered_visits
          ORDER BY started_at
        `,
      ),
    ).toEqual([
      { visit_id: "entry-visit", ...ENTRY_ATTRIBUTION },
      { visit_id: "next-visit", ...ENTRY_ATTRIBUTION },
    ]);
  });

  it("starts a session without asking D1", async () => {
    const ctx = createTestDo();

    await postIngest(ctx.object, envelope());

    expect(localRows(ctx.sql, "SELECT visit_id FROM buffered_visits")).toEqual([
      { visit_id: "visit-1" },
    ]);
    expect(ctx.d1.prepare).not.toHaveBeenCalled();
    expect(ctx.d1.batch).not.toHaveBeenCalled();
  });

  it("keeps a finished page view buffered while a page view can still join its session", async () => {
    const ctx = createTestDo();
    await postIngest(
      ctx.object,
      envelope({
        visitId: "entry-visit",
        startedAt: NOW - 20_000,
        timestamp: NOW - 20_000,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "entry-visit",
        timestamp: NOW - 10_000,
      }),
    );
    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();
    // The last moment a page view can join: it ended 30 minutes before the
    // page view started, which arrives as late as a start may lag.
    const receivedAt =
      NOW - 10_000 + SESSION_WINDOW_MS + MAX_CLIENT_EVENT_LAG_MS;
    vi.setSystemTime(receivedAt);
    await ctx.object.alarm();
    ctx.d1.prepare.mockClear();

    await postIngest(
      ctx.object,
      sameSiteNavigation(receivedAt - MAX_CLIENT_EVENT_LAG_MS, { receivedAt }),
    );

    expect(
      localRows(
        ctx.sql,
        `
          SELECT visit_id, referrer_host, utm_source, utm_medium, utm_campaign
          FROM buffered_visits
          WHERE visit_id = 'next-visit'
        `,
      ),
    ).toEqual([{ visit_id: "next-visit", ...ENTRY_ATTRIBUTION }]);
    const [entry, next] = localRows<{ session_id: string }>(
      ctx.sql,
      "SELECT session_id FROM buffered_visits ORDER BY started_at",
    );
    expect(next?.session_id).toBe(entry?.session_id);
    expect(ctx.d1.prepare).not.toHaveBeenCalled();
  });

  it("keeps hidden visits pending and ends their duration when the tab was hidden", async () => {
    const ctx = createTestDo();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "hidden-visit",
        startedAt: NOW - 20_000,
        timestamp: NOW - 20_000,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "hidden-visit",
        visibilityState: "hidden",
        timestamp: NOW - 10_000,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "hidden-visit",
        visibilityState: "hidden",
        timestamp: NOW - 9_000,
      }),
    );

    expect(
      localRows<{ status: string; hidden_at: number | null }>(
        ctx.sql,
        "SELECT status, hidden_at FROM buffered_visits WHERE visit_id = ?",
        "hidden-visit",
      )[0],
    ).toEqual({ status: "hidden_pending", hidden_at: NOW - 10_000 });

    const beforeDuplicateVisibility = localRows<{
      last_activity_at: number;
      buffer_revision: number;
    }>(
      ctx.sql,
      "SELECT last_activity_at, buffer_revision FROM buffered_visits WHERE visit_id = ?",
      "hidden-visit",
    )[0];
    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "hidden-visit",
        visibilityState: "hidden",
        timestamp: NOW - 9_000,
      }),
    );
    expect(
      localRows<{ last_activity_at: number; buffer_revision: number }>(
        ctx.sql,
        "SELECT last_activity_at, buffer_revision FROM buffered_visits WHERE visit_id = ?",
        "hidden-visit",
      )[0],
    ).toEqual(beforeDuplicateVisibility);

    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "hidden-visit",
        timestamp: NOW,
      }),
    );

    expect(
      localRows<{
        status: string;
        hidden_at: number | null;
        ended_at: number | null;
        duration_ms: number | null;
        duration_source: string | null;
        exit_reason: string | null;
      }>(
        ctx.sql,
        `SELECT status, hidden_at, ended_at, duration_ms, duration_source, exit_reason
         FROM buffered_visits
         WHERE visit_id = ?`,
        "hidden-visit",
      )[0],
    ).toEqual({
      status: "complete",
      hidden_at: null,
      ended_at: NOW,
      // Visible from NOW - 20s until hidden at NOW - 10s.
      duration_ms: 10_000,
      duration_source: "server",
      exit_reason: "pagehide",
    });
  });

  it("leaves hidden stretches the visitor came back from out of the duration", async () => {
    const ctx = createTestDo();
    const visibility = (
      visitId: string,
      visibilityState: "hidden" | "visible",
      timestamp: number,
    ) =>
      postIngest(
        ctx.object,
        envelope({ kind: "visibility", visitId, visibilityState, timestamp }),
      );

    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-1",
        startedAt: NOW - 25_000,
        timestamp: NOW - 25_000,
        pathname: "/first",
      }),
    );
    await visibility("visit-1", "hidden", NOW - 20_000);
    await visibility("visit-1", "visible", NOW - 12_000);
    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-2",
        navigation: "route",
        startedAt: NOW - 5_000,
        timestamp: NOW - 5_000,
        pathname: "/second",
        referrerUrl: "https://example.com/first",
      }),
    );
    await visibility("visit-2", "hidden", NOW - 4_000);
    await visibility("visit-2", "visible", NOW - 3_000);
    await postIngest(
      ctx.object,
      envelope({ kind: "leave", visitId: "visit-2", timestamp: NOW }),
    );

    expect(
      localRows<{ visit_id: string; duration_ms: number | null }>(
        ctx.sql,
        "SELECT visit_id, duration_ms FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      // 20s on the page, 8s of it hidden.
      { visit_id: "visit-1", duration_ms: 12_000 },
      // 5s on the page, 1s of it hidden.
      { visit_id: "visit-2", duration_ms: 4_000 },
    ]);
  });

  it("skips visibility broadcasts when the visit context is unavailable", async () => {
    const ctx = createTestDo();
    const object = ctx.object as unknown as {
      pushVisibilityRealtimeRecord(record: {
        siteId: string;
        visitId: string;
        eventAt: number;
        visibilityState: "hidden" | "visible";
        traceId: string;
        receivedAt: number;
      }): Promise<void>;
    };

    await expect(
      object.pushVisibilityRealtimeRecord({
        siteId: "site-1",
        visitId: "missing-visit",
        eventAt: NOW,
        visibilityState: "hidden",
        traceId: "trace-missing",
        receivedAt: NOW,
      }),
    ).resolves.toBeUndefined();
  });

  it("does not regress activity for an out-of-order legacy hidden visit", async () => {
    const ctx = createTestDo();
    insertBufferedVisit(ctx.sql, {
      visit_id: "legacy-hidden-visit",
      status: "hidden_pending",
      hidden_at: null,
      last_activity_at: NOW,
    });

    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "legacy-hidden-visit",
        visibilityState: "hidden",
        timestamp: NOW - 1_000,
      }),
    );

    expect(
      localRows<{
        status: string;
        hidden_at: number | null;
        last_activity_at: number;
      }>(
        ctx.sql,
        "SELECT status, hidden_at, last_activity_at FROM buffered_visits WHERE visit_id = ?",
        "legacy-hidden-visit",
      )[0],
    ).toEqual({
      status: "hidden_pending",
      hidden_at: null,
      last_activity_at: NOW,
    });
  });

  it("finalizes stale hidden visits at hidden_at during flush", async () => {
    const ctx = createTestDo();
    const startedAt = NOW - 40 * 60 * 1000;
    const hiddenAt = NOW - RECENT_EVENT_RETENTION_MS - 60_000;
    const awayFrom = startedAt + 60_000;
    const backAt = startedAt + 180_000;

    await postIngest(
      ctx.object,
      envelope(
        {
          visitId: "hidden-timeout-visit",
          startedAt,
          timestamp: startedAt,
        },
        { receivedAt: startedAt },
      ),
    );
    const visibility = (visibilityState: "hidden" | "visible", at: number) =>
      postIngest(
        ctx.object,
        envelope(
          {
            kind: "visibility",
            visitId: "hidden-timeout-visit",
            visibilityState,
            timestamp: at,
          },
          { receivedAt: at },
        ),
      );
    await visibility("hidden", awayFrom);
    await visibility("visible", backAt);
    await visibility("hidden", hiddenAt);

    await ctx.object.alarm();
    expect(
      ctx.d1.all<{
        status: string;
        ended_at: number | null;
        duration_ms: number | null;
        duration_source: string | null;
        exit_reason: string | null;
      }>(
        `SELECT status, ended_at, duration_ms, duration_source, exit_reason
         FROM visits
         WHERE visit_id = ?`,
        "hidden-timeout-visit",
      )[0],
    ).toEqual({
      status: "complete",
      ended_at: hiddenAt,
      duration_ms: hiddenAt - startedAt - (backAt - awayFrom),
      duration_source: "hidden",
      exit_reason: "hidden_timeout",
    });
    expect(
      localRows<{ status: string; dirty: number }>(
        ctx.sql,
        "SELECT status, dirty FROM buffered_visits WHERE visit_id = ?",
        "hidden-timeout-visit",
      )[0],
    ).toEqual({ status: "complete", dirty: 0 });
  });

  it("buffers custom events waiting for a visit, rejects invalid data, and flushes event JSON paths", async () => {
    const ctx = createTestDo();

    const waiting = await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "visit-1",
        eventId: "event-waiting",
        eventName: "Checkout Started",
        eventData: { cart: { total: 42, currency: "USD" } },
        sequence: 1,
      }),
    );
    expect(waiting.status).toBe(202);
    await expect(waiting.text()).resolves.toBe("ignored:waiting_for_visit");
    // It can't be written before its page view: nothing for the alarm yet.
    expect(ctx.getAlarmAt()).toBeNull();
    expect(
      localRows<{ dirty: number; flush_attempts: number }>(
        ctx.sql,
        "SELECT dirty, flush_attempts FROM buffered_custom_events WHERE event_id = ?",
        "event-waiting",
      )[0],
    ).toEqual({ dirty: 1, flush_attempts: 0 });

    const invalid = await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "visit-1",
        eventId: "event-invalid",
        eventName: "Bad Data",
        eventData: null,
      }),
    );
    expect(invalid.status).toBe(202);
    await expect(invalid.text()).resolves.toBe(
      "ignored:invalid_custom_event_data",
    );

    await postIngest(ctx.object, envelope());
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);
    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "visit-1",
        eventId: "event-live",
        eventName: "Checkout Finished",
        eventData: {
          revenue: 42,
          coupon: "SAVE",
          nested: { valid: true },
        },
        sequence: 2,
      }),
    );

    vi.setSystemTime(NOW + 60_000);

    expect(
      localRows<{ count: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS count FROM buffered_custom_events",
      )[0]?.count,
    ).toBe(2);

    await ctx.object.alarm();

    expect(ctx.d1.batch).toHaveBeenCalled();
    expect(
      ctx.d1.all<{ event_id: string }>(
        "SELECT event_id FROM custom_events ORDER BY event_id",
      ),
    ).toEqual([{ event_id: "event-live" }, { event_id: "event-waiting" }]);
    expect(
      ctx.d1.all<{ name: string }>(
        "SELECT name FROM custom_event_names ORDER BY name",
      ),
    ).toEqual([{ name: "Checkout Finished" }, { name: "Checkout Started" }]);
    expect(
      ctx.d1
        .all<{
          path: string;
        }>("SELECT path FROM custom_event_json_paths ORDER BY path")
        .map((row) => row.path),
    ).toEqual(expect.arrayContaining(["/", "/cart/total", "/nested/valid"]));
    expect(
      localRows<{ dirty: number }>(
        ctx.sql,
        "SELECT dirty FROM buffered_custom_events WHERE event_id = ?",
        "event-live",
      )[0]?.dirty,
    ).toBe(0);
  });

  it("buffers a custom event's validated revenue and flushes it to D1", async () => {
    const ctx = createTestDo();
    await postIngest(ctx.object, envelope());
    for (const [eventId, revenue] of [
      ["event-paid", { amount: "15.99", currency: "usd" }],
      // An invalid revenue is dropped; the event is kept.
      ["event-unpaid", { amount: 10, currency: "dollars" }],
    ] as const) {
      await postIngest(
        ctx.object,
        envelope({
          kind: "custom_event",
          visitId: "visit-1",
          eventId,
          eventName: "Purchase",
          eventData: {},
          revenue,
        }),
      );
    }
    const revenueRows = [
      {
        event_id: "event-paid",
        revenue_amount: 15.99,
        revenue_currency: "USD",
      },
      {
        event_id: "event-unpaid",
        revenue_amount: null,
        revenue_currency: null,
      },
    ];
    expect(
      localRows(
        ctx.sql,
        "SELECT event_id, revenue_amount, revenue_currency FROM buffered_custom_events ORDER BY event_id",
      ),
    ).toEqual(revenueRows);

    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    expect(
      ctx.d1.all(
        "SELECT event_id, revenue_amount, revenue_currency FROM custom_events ORDER BY event_id",
      ),
    ).toEqual(revenueRows);
  });

  it("does not rewrite visit activity for an out-of-order custom event", async () => {
    const ctx = createTestDo();
    await postIngest(ctx.object, envelope());

    const before = localRows<{
      last_activity_at: number;
      buffer_revision: number;
    }>(
      ctx.sql,
      "SELECT last_activity_at, buffer_revision FROM buffered_visits WHERE visit_id = ?",
      "visit-1",
    )[0];

    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        eventId: "event-out-of-order",
        eventName: "Out of order",
        eventData: { ok: true },
        timestamp: NOW - 2_000,
      }),
    );

    const after = localRows<{
      last_activity_at: number;
      buffer_revision: number;
    }>(
      ctx.sql,
      "SELECT last_activity_at, buffer_revision FROM buffered_visits WHERE visit_id = ?",
      "visit-1",
    )[0];

    expect(after).toEqual(before);
    expect(
      localRows<{ event_id: string }>(
        ctx.sql,
        "SELECT event_id FROM buffered_custom_events WHERE event_id = ?",
        "event-out-of-order",
      ),
    ).toEqual([{ event_id: "event-out-of-order" }]);
  });

  it("writes a burst of page views to D1 in one batch, setting the alarm once", async () => {
    const ctx = createTestDo();
    for (let second = 0; second < 30; second += 1) {
      const at = NOW + second * 1_000;
      vi.setSystemTime(at);
      await postIngest(
        ctx.object,
        envelope(
          { visitId: `visit-${second}`, startedAt: at, timestamp: at },
          { receivedAt: at },
        ),
      );
    }

    // Each page view made a row dirty; only the first armed the alarm, and
    // only it read the alarm from storage.
    expect(ctx.state.storage.getAlarm).toHaveBeenCalledTimes(1);
    expect(ctx.state.storage.setAlarm).toHaveBeenCalledTimes(1);
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);

    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    expect(ctx.d1.batch).toHaveBeenCalledTimes(1);
    expect(
      ctx.d1.all<{ count: number }>("SELECT COUNT(*) AS count FROM visits")[0]
        ?.count,
    ).toBe(30);
    expect(
      localRows<{ count: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS count FROM buffered_visits WHERE dirty = 1",
      )[0]?.count,
    ).toBe(0);
  });

  it("writes each page view's channel, its session's from the entry", async () => {
    const ctx = createTestDo();
    const untagged = {
      query: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
    };
    await postIngest(
      ctx.object,
      envelope({
        ...untagged,
        visitId: "search",
        referrerUrl: "https://www.google.com/",
      }),
    );
    await postIngest(ctx.object, sameSiteNavigation(NOW));
    const otherVisitor = envelope({}).request.headers;
    await postIngest(
      ctx.object,
      envelope(
        { visitId: "paid", utmSource: "google", utmMedium: "cpc" },
        { headers: { ...otherVisitor, "cf-connecting-ip": "203.0.113.20" } },
      ),
    );

    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    expect(
      ctx.d1.all("SELECT visit_id, channel FROM visits ORDER BY visit_id"),
    ).toEqual([
      { visit_id: "next-visit", channel: "organic_search" },
      { visit_id: "paid", channel: "paid_search" },
      { visit_id: "search", channel: "organic_search" },
    ]);
  });

  it("writes everything dirty in one alarm, batch after batch", async () => {
    const ctx = createTestDo();
    for (let index = 0; index < 250; index += 1) {
      insertBufferedVisit(ctx.sql, {
        visit_id: `visit-${index}`,
        visitor_id: `visitor-${index}`,
      });
    }

    await ctx.object.alarm();

    // 100 page views a batch.
    expect(ctx.d1.batch).toHaveBeenCalledTimes(3);
    expect(
      ctx.d1.all<{ count: number }>("SELECT COUNT(*) AS count FROM visits")[0]
        ?.count,
    ).toBe(250);
  });

  it("goes on in a new invocation at once when the D1 queries run out", async () => {
    const ctx = createTestDo();
    for (let index = 0; index < 1_001; index += 1) {
      insertBufferedVisit(ctx.sql, {
        visit_id: `visit-${index}`,
        visitor_id: `visitor-${index}`,
        flush_attempts: 1,
      });
    }

    await ctx.object.alarm();

    // Page views that failed before go one a query: 1,000 of them, and the
    // site's key, fit no invocation.
    expect(
      localRows<{ count: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS count FROM buffered_visits WHERE dirty = 1",
      )[0]?.count,
    ).toBe(3);
    expect(ctx.getAlarmAt()).toBe(NOW);
  });

  it("hydrates persisted visits when custom events arrive after the buffered row is gone", async () => {
    const ctx = createTestDo();
    ctx.d1.insertVisit({
      visit_id: "persisted-visit",
      status: "complete",
      ended_at: NOW - 500,
      finalized_at: NOW - 500,
    });

    const response = await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "persisted-visit",
        eventId: "event-persisted",
        eventName: "Download",
        eventData: { file: "report.pdf" },
      }),
    );

    expect(response.status).toBe(202);
    expect(
      localRows<{ dirty: number; status: string }>(
        ctx.sql,
        "SELECT dirty, status FROM buffered_visits WHERE visit_id = ?",
        "persisted-visit",
      )[0],
    ).toEqual({ dirty: 0, status: "complete" });
    expect(
      localRows<{ event_name: string }>(
        ctx.sql,
        "SELECT event_name FROM buffered_custom_events WHERE event_id = ?",
        "event-persisted",
      )[0],
    ).toEqual({ event_name: "Download" });
  });

  it("writes a failed batch's page views one by one", async () => {
    const ctx = createTestDo();
    ctx.d1.failBatchCalls = 1;
    insertBufferedVisit(ctx.sql, { visit_id: "visit-1" });
    insertBufferedVisit(ctx.sql, { visit_id: "visit-2" });

    await ctx.object.alarm();

    expect(ctx.d1.batch).toHaveBeenCalledTimes(3);
    expect(
      ctx.d1.all<{ visit_id: string }>(
        "SELECT visit_id FROM visits ORDER BY visit_id",
      ),
    ).toEqual([{ visit_id: "visit-1" }, { visit_id: "visit-2" }]);
    expect(ctx.getAlarmAt()).toBe(NOW + VISIT_TIMEOUT_MS - 1_000);
  });

  it("keeps a page view D1 rejects out of the others' batch", async () => {
    const ctx = createTestDo();
    ctx.d1.db.exec(`
      CREATE TRIGGER reject_poison BEFORE INSERT ON visits
      WHEN NEW.visit_id = 'poison'
      BEGIN SELECT RAISE(ABORT, 'rejected'); END;
    `);
    insertBufferedVisit(ctx.sql, {
      visit_id: "healthy",
      started_at: NOW - 2_000,
    });
    insertBufferedVisit(ctx.sql, { visit_id: "poison" });

    await ctx.object.alarm();

    // The batch failed, then the page views went one by one.
    expect(ctx.d1.batch).toHaveBeenCalledTimes(3);
    expect(
      localRows(
        ctx.sql,
        "SELECT visit_id, dirty, flush_attempts, last_flush_error FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      {
        visit_id: "healthy",
        dirty: 0,
        flush_attempts: 0,
        last_flush_error: null,
      },
      {
        visit_id: "poison",
        dirty: 1,
        flush_attempts: 1,
        last_flush_error: "rejected",
      },
    ]);
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);

    insertBufferedVisit(ctx.sql, { visit_id: "later" });
    ctx.d1.batch.mockClear();
    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    // The new page view's batch leaves the rejected one out; it goes alone.
    expect(ctx.d1.batch).toHaveBeenCalledTimes(2);
    expect(ctx.d1.batch.mock.calls[0]?.[0]).toHaveLength(1);
    expect(
      ctx.d1.all<{ visit_id: string }>(
        "SELECT visit_id FROM visits ORDER BY visit_id",
      ),
    ).toEqual([{ visit_id: "healthy" }, { visit_id: "later" }]);
    expect(
      localRows(
        ctx.sql,
        "SELECT flush_attempts FROM buffered_visits WHERE visit_id = 'poison'",
      ),
    ).toEqual([{ flush_attempts: 2 }]);
  });

  it("stops at the first page view that fails alone, as D1 may be down", async () => {
    const ctx = createTestDo();
    ctx.d1.failBatchCalls = 2;
    insertBufferedVisit(ctx.sql, {
      visit_id: "visit-1",
      started_at: NOW - 2_000,
    });
    insertBufferedVisit(ctx.sql, { visit_id: "visit-2" });

    await ctx.object.alarm();

    expect(ctx.d1.batch).toHaveBeenCalledTimes(2);
    expect(
      localRows(
        ctx.sql,
        "SELECT visit_id, dirty, flush_attempts FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      { visit_id: "visit-1", dirty: 1, flush_attempts: 1 },
      { visit_id: "visit-2", dirty: 1, flush_attempts: 0 },
    ]);
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);
  });

  it("flushes what a buffer held under per-row deadlines when it upgrades", async () => {
    const sql = new SqliteSqlStorage();
    // The tables as the per-row deadline version left them, a row each
    // waiting for D1 after failed attempts pushed its deadline out.
    sql.db.exec(`
      CREATE TABLE buffered_visits (
        visit_id TEXT PRIMARY KEY, site_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL, session_id TEXT NOT NULL,
        status TEXT NOT NULL, started_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL, hidden_at INTEGER,
        hidden_ms INTEGER NOT NULL DEFAULT 0, ended_at INTEGER,
        finalized_at INTEGER, duration_ms INTEGER, scroll_depth INTEGER,
        duration_source TEXT, exit_reason TEXT, pathname TEXT NOT NULL,
        query_string TEXT NOT NULL DEFAULT '',
        hash_fragment TEXT NOT NULL DEFAULT '', hostname TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '', referrer_url TEXT NOT NULL DEFAULT '',
        referrer_host TEXT NOT NULL DEFAULT '',
        utm_source TEXT NOT NULL DEFAULT '', utm_medium TEXT NOT NULL DEFAULT '',
        utm_campaign TEXT NOT NULL DEFAULT '', utm_term TEXT NOT NULL DEFAULT '',
        utm_content TEXT NOT NULL DEFAULT '', is_eu INTEGER NOT NULL DEFAULT 0,
        country TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '',
        region_code TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
        continent TEXT NOT NULL DEFAULT '', latitude REAL, longitude REAL,
        timezone TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '',
        browser_version TEXT NOT NULL DEFAULT '', os TEXT NOT NULL DEFAULT '',
        os_version TEXT NOT NULL DEFAULT '',
        device_type TEXT NOT NULL DEFAULT '', screen_width INTEGER,
        screen_height INTEGER, language TEXT NOT NULL DEFAULT '',
        perf_ttfb_ms REAL, perf_fcp_ms REAL, perf_lcp_ms REAL, perf_cls REAL,
        perf_inp_ms REAL, properties_json TEXT,
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0, last_flush_error TEXT,
        next_due_at INTEGER, flush_due_at INTEGER,
        buffer_revision INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE INDEX idx_buffered_visits_next_due
        ON buffered_visits(next_due_at, visit_id);
      CREATE INDEX idx_buffered_visits_dirty_flush_due
        ON buffered_visits(dirty, flush_due_at, flush_attempts);
      CREATE TABLE buffered_custom_events (
        event_id TEXT PRIMARY KEY, site_id TEXT NOT NULL,
        visit_id TEXT NOT NULL, occurred_at INTEGER NOT NULL,
        received_at INTEGER NOT NULL, sequence INTEGER NOT NULL DEFAULT 0,
        event_name TEXT NOT NULL, event_data_json TEXT NOT NULL DEFAULT '{}',
        revenue_amount REAL, revenue_currency TEXT,
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0, last_flush_error TEXT,
        next_due_at INTEGER, flush_due_at INTEGER,
        buffer_revision INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL
      );
      CREATE INDEX idx_buffered_custom_events_next_due
        ON buffered_custom_events(next_due_at, event_id);
      CREATE TABLE analytics_sessions (
        site_id TEXT NOT NULL, session_id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL, started_at INTEGER NOT NULL,
        last_activity_at INTEGER NOT NULL, page_count INTEGER NOT NULL,
        entry_path TEXT NOT NULL, last_path TEXT NOT NULL,
        last_visit_id TEXT NOT NULL, next_due_at INTEGER NOT NULL
      );
      INSERT INTO buffered_visits (
        visit_id, site_id, visitor_id, session_id, status, started_at,
        last_activity_at, ended_at, finalized_at, pathname, hostname, dirty,
        flush_attempts, next_due_at, flush_due_at, created_at, updated_at
      ) VALUES (
        'waiting-visit', 'site-1', 'visitor-1', 'session-1', 'complete',
        ${NOW - 60_000}, ${NOW - 30_000}, ${NOW - 30_000}, ${NOW - 30_000},
        '/', 'example.com', 1, 3, ${NOW + 8 * 60_000}, ${NOW + 8 * 60_000},
        ${toSeconds(NOW)}, ${toSeconds(NOW)}
      );
      INSERT INTO buffered_custom_events (
        event_id, site_id, visit_id, occurred_at, received_at, event_name,
        dirty, next_due_at, flush_due_at, created_at
      ) VALUES (
        'waiting-event', 'site-1', 'waiting-visit', ${NOW - 40_000},
        ${NOW - 40_000}, 'Signup', 1, ${NOW + 60_000}, ${NOW + 60_000},
        ${toSeconds(NOW)}
      );
    `);
    const ctx = createTestDo({}, sql);

    // The sweep after the deploy finds the rows waiting and sets the alarm.
    await ctx.object.fetch(
      new Request("https://ingest.internal/reconcile", { method: "POST" }),
    );
    expect(ctx.getAlarmAt()).toBe(NOW + 60_000);
    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    expect(ctx.d1.all("SELECT visit_id, status FROM visits")).toEqual([
      { visit_id: "waiting-visit", status: "complete" },
    ]);
    expect(ctx.d1.all("SELECT event_id FROM custom_events")).toEqual([
      { event_id: "waiting-event" },
    ]);
    expect(ctx.getAlarmAt()).toBeNull();
  });

  it("does not clear a page view that ended while D1 wrote it", async () => {
    const ctx = createTestDo();
    await postIngest(ctx.object, envelope());
    vi.setSystemTime(NOW + 60_000);
    ctx.d1.beforeBatch = async () => {
      await postIngest(ctx.object, envelope({ kind: "leave" }));
    };

    await ctx.object.alarm();
    // Written open, then again once it ended, in the same alarm.
    expect(ctx.d1.batch).toHaveBeenCalledTimes(2);
    expect(
      ctx.d1.all("SELECT status FROM visits WHERE visit_id = 'visit-1'"),
    ).toEqual([{ status: "complete" }]);
    expect(
      localRows(
        ctx.sql,
        "SELECT dirty, status FROM buffered_visits WHERE visit_id = 'visit-1'",
      ),
    ).toEqual([{ dirty: 0, status: "complete" }]);
  });

  it("leaves a custom event without its page view for the page view, asking D1 nothing", async () => {
    const ctx = createTestDo();
    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        eventId: "event-orphan",
        eventName: "Orphan",
        eventData: { ok: true },
      }),
    );
    ctx.d1.prepare.mockClear();
    vi.setSystemTime(NOW + 60_000);

    await ctx.object.alarm();
    expect(
      localRows(
        ctx.sql,
        "SELECT dirty, flush_attempts FROM buffered_custom_events WHERE event_id = 'event-orphan'",
      ),
    ).toEqual([{ dirty: 1, flush_attempts: 0 }]);
    expect(ctx.d1.prepare).not.toHaveBeenCalled();
    expect(ctx.d1.batch).not.toHaveBeenCalled();
    expect(ctx.getAlarmAt()).toBeNull();
  });

  it("deletes finished rows once no page view can join their session", async () => {
    const ctx = createTestDo();
    const retention = SESSION_WINDOW_MS + MAX_CLIENT_EVENT_LAG_MS;
    insertBufferedVisit(ctx.sql, {
      visit_id: "old-complete",
      status: "complete",
      ended_at: NOW - retention - 1,
      finalized_at: NOW - retention - 1,
      dirty: 0,
    });
    insertBufferedVisit(ctx.sql, {
      visit_id: "recent-complete",
      visitor_id: "visitor-2",
      status: "complete",
      ended_at: NOW - retention,
      finalized_at: NOW - retention,
      dirty: 0,
    });
    ctx.sql.exec(
      `
        INSERT INTO buffered_custom_events (
          event_id, site_id, visit_id, occurred_at, received_at, sequence,
          event_name, event_data_json, dirty, flush_attempts,
          last_flush_error, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      "old-event",
      "site-1",
      "old-complete",
      NOW - retention - 1,
      NOW - retention - 1,
      0,
      "Old Event",
      "{}",
      0,
      0,
      null,
      toSeconds(NOW),
    );

    await ctx.object.alarm();
    expect(localRows(ctx.sql, "SELECT visit_id FROM buffered_visits")).toEqual([
      { visit_id: "recent-complete" },
    ]);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events",
      )[0]?.events,
    ).toBe(0);
  });

  it("finalizes timed-out visits during alarms and clears alarms when no work remains", async () => {
    const ctx = createTestDo();
    insertBufferedVisit(ctx.sql, {
      visit_id: "stale-visit",
      started_at: NOW - VISIT_TIMEOUT_MS - 60_000,
      last_activity_at: NOW - VISIT_TIMEOUT_MS - 1,
      dirty: 0,
    });
    await ctx.state.storage.setAlarm(NOW);

    await ctx.object.alarm();

    expect(
      ctx.d1.all<{ visit_id: string; status: string }>(
        "SELECT visit_id, status FROM visits WHERE visit_id = ?",
        "stale-visit",
      )[0],
    ).toEqual({ visit_id: "stale-visit", status: "timeout" });
    expect(
      localRows<{ count: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS count FROM buffered_visits WHERE visit_id = ?",
        "stale-visit",
      )[0]?.count,
    ).toBe(0);
    expect(ctx.getAlarmAt()).toBeNull();
    expect(ctx.state.storage.deleteAlarm).toHaveBeenCalled();
  });

  it("reschedules alarms while open visits remain buffered", async () => {
    const ctx = createTestDo();
    insertBufferedVisit(ctx.sql, {
      visit_id: "active-visit",
      last_activity_at: NOW,
      dirty: 0,
    });

    await ctx.object.alarm();

    expect(ctx.getAlarmAt()).toBe(NOW + VISIT_TIMEOUT_MS);
    expect(ctx.state.storage.setAlarm).toHaveBeenCalledWith(
      NOW + VISIT_TIMEOUT_MS,
    );
  });

  it("moves the alarm earlier for a hidden page view's grace, never later", async () => {
    const ctx = createTestDo();
    await postIngest(ctx.object, envelope());
    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();
    expect(ctx.getAlarmAt()).toBe(NOW - 1_000 + VISIT_TIMEOUT_MS);

    const hiddenAt = NOW + 120_000;
    vi.setSystemTime(hiddenAt);
    await postIngest(
      ctx.object,
      envelope(
        { kind: "visibility", visibilityState: "hidden", timestamp: hiddenAt },
        { receivedAt: hiddenAt },
      ),
    );
    expect(ctx.getAlarmAt()).toBe(hiddenAt + RECENT_EVENT_RETENTION_MS);

    vi.mocked(ctx.state.storage.setAlarm).mockClear();
    await postIngest(
      ctx.object,
      envelope(
        { kind: "visibility", visibilityState: "visible", timestamp: hiddenAt },
        { receivedAt: hiddenAt },
      ),
    );
    expect(ctx.state.storage.setAlarm).not.toHaveBeenCalled();
    // Neither change waits for D1.
    expect(localRows(ctx.sql, "SELECT dirty FROM buffered_visits")).toEqual([
      { dirty: 0 },
    ]);
  });

  it("ignores additional invalid validation shapes without buffering rows", async () => {
    const ctx = createTestDo();

    const missingClient = await postIngest(ctx.object, {
      ...envelope(),
      client: undefined,
    });
    expect(missingClient.status).toBe(202);
    await expect(missingClient.text()).resolves.toBe("ignored:missing_site_id");

    const cases: Array<{
      name: string;
      client: Partial<TrackerClientPayload>;
      reason: string;
    }> = [
      {
        name: "pageview visit",
        client: { kind: "pageview", visitId: "" },
        reason: "missing_visit_id",
      },
      {
        name: "leave visit",
        client: { kind: "leave", visitId: "" },
        reason: "missing_visit_id",
      },
      {
        name: "visibility visit",
        client: { kind: "visibility", visitId: "", visibilityState: "hidden" },
        reason: "missing_visit_id",
      },
      {
        name: "custom event visit",
        client: {
          kind: "custom_event",
          visitId: "",
          eventName: "Clicked",
          eventData: {},
        },
        reason: "missing_visit_id",
      },
      {
        name: "custom event name",
        client: {
          kind: "custom_event",
          eventName: "",
          eventData: {},
        },
        reason: "missing_event_name",
      },
    ];

    for (const testCase of cases) {
      const response = await postIngest(ctx.object, envelope(testCase.client));
      expect(response.status, testCase.name).toBe(202);
      await expect(response.text(), testCase.name).resolves.toBe(
        `ignored:${testCase.reason}`,
      );
    }

    expect(
      localRows<{ visits: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS visits FROM buffered_visits",
      )[0]?.visits,
    ).toBe(0);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events",
      )[0]?.events,
    ).toBe(0);
  });

  it("normalizes timestamp, session, referrer, and empty UTM fallbacks", async () => {
    const ctx = createTestDo();

    const response = await postIngest(
      ctx.object,
      envelope({
        timestamp: NOW + 10_000,
        startedAt: NOW - 60_000,
        query: "",
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
        referrerUrl: "https://EXAMPLE.com/other",
      }),
    );

    expect(response.status).toBe(202);
    const [visit] = localRows<{
      session_id: string;
      started_at: number;
      last_activity_at: number;
      referrer_url: string;
      referrer_host: string;
      utm_source: string;
    }>(
      ctx.sql,
      `SELECT session_id, started_at, last_activity_at, referrer_url,
              referrer_host, utm_source
       FROM buffered_visits
       WHERE visit_id = ?`,
      "visit-1",
    );
    expect(visit?.session_id).not.toBe("");
    expect(visit).toMatchObject({
      started_at: NOW,
      last_activity_at: NOW,
      referrer_url: "",
      referrer_host: "",
      utm_source: "",
    });
  });

  it("keeps duplicate pageviews and custom events idempotent", async () => {
    const ctx = createTestDo();

    await postIngest(ctx.object, envelope());
    const duplicatePageview = await postIngest(ctx.object, envelope());
    expect(duplicatePageview.status).toBe(202);
    await expect(duplicatePageview.text()).resolves.toBe("ok");

    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        eventId: "event-duplicate",
        eventName: "Duplicate",
        eventData: { ok: true },
      }),
    );
    const duplicateEvent = await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        eventId: "event-duplicate",
        eventName: "Duplicate",
        eventData: { ok: true },
      }),
    );

    expect(duplicateEvent.status).toBe(202);
    expect(
      localRows<{ visits: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS visits FROM buffered_visits",
      )[0]?.visits,
    ).toBe(1);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events",
      )[0]?.events,
    ).toBe(1);
  });

  it("pushes snapshots and realtime events to websocket clients and prunes stale sockets", async () => {
    const ctx = createTestDo();
    insertBufferedVisit(ctx.sql, {
      visit_id: "socket-active",
      last_activity_at: NOW - 1_000,
      dirty: 0,
      screen_width: null,
      screen_height: null,
      os: "",
      os_version: "13",
    });

    const pairs: Array<[FakeWebSocket, FakeWebSocket]> = [
      [new FakeWebSocket(), new FakeWebSocket()],
      [new FakeWebSocket(), new FakeWebSocket()],
      [new FakeWebSocket(), new FakeWebSocket()],
    ];
    const issuedPairs: Array<readonly [FakeWebSocket, FakeWebSocket]> = [];
    class TestWebSocketPair {
      constructor() {
        const pair = pairs.shift();
        if (!pair) throw new Error("unexpected websocket pair");
        issuedPairs.push(pair);
        return pair;
      }
    }
    const wsRequest = (url: string) =>
      ({
        url,
        method: "GET",
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "upgrade" ? "websocket" : null,
        },
      }) as unknown as Request;
    const RealResponse = globalThis.Response;
    vi.stubGlobal("WebSocketPair", TestWebSocketPair);
    vi.stubGlobal("Response", FakeUpgradeResponse);

    const firstUpgrade = await ctx.object.fetch(
      wsRequest("https://ingest.internal/ws?siteId=site-1"),
    );
    const secondUpgrade = await ctx.object.fetch(
      wsRequest("https://ingest.internal/ws?siteId=site-1"),
    );
    const thirdUpgrade = await ctx.object.fetch(
      wsRequest("https://ingest.internal/ws?siteId=site-1"),
    );
    vi.stubGlobal("Response", RealResponse);

    expect(firstUpgrade.status).toBe(101);
    expect(secondUpgrade.status).toBe(101);
    expect(thirdUpgrade.status).toBe(101);

    const [, healthyServer] = issuedPairs[0]!;
    const [, staleServer] = issuedPairs[1]!;
    const [, errorServer] = issuedPairs[2]!;

    expect(healthyServer.accepted).toBe(true);
    const initialSnapshot = JSON.parse(healthyServer.sent[0] ?? "{}");
    expect(initialSnapshot).toMatchObject({
      type: "snapshot",
      data: {
        activeNow: 1,
        visits: [
          {
            visitId: "socket-active",
            screenWidth: null,
            screenHeight: null,
            osVersion: "13",
          },
        ],
      },
    });

    staleServer.failSend = true;
    ctx.object.webSocketError(
      errorServer as unknown as WebSocket,
      new Error("forced websocket error"),
    );
    expect(errorServer.closed).toBe(true);

    await postIngest(
      ctx.object,
      envelope({
        visitId: "socket-visit",
        pathname: "/socket",
        timestamp: NOW - 2_000,
        startedAt: NOW - 2_000,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "socket-visit",
        eventId: "socket-event",
        eventName: "Socket Event",
        eventData: { ok: true },
        timestamp: NOW - 1_000,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "socket-visit",
        visibilityState: "hidden",
        timestamp: NOW - 500,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "visibility",
        visitId: "socket-visit",
        visibilityState: "visible",
        timestamp: NOW - 250,
      }),
    );
    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "socket-visit",
        timestamp: NOW,
      }),
    );

    const eventMessages = healthyServer.sent
      .slice(1)
      .map((payload) => JSON.parse(payload));
    expect(eventMessages.map((message) => message.data.eventType)).toEqual([
      "visit",
      "Socket Event",
      "visibility",
      "visibility",
      "__presence_leave",
    ]);
    expect(eventMessages[2]?.data).toMatchObject({
      eventKind: "visibility",
      visibilityState: "hidden",
      visitId: "socket-visit",
      sessionId: expect.any(String),
      visitorId: eventMessages[0]?.data.visitorId,
      pathname: "/socket",
      hostname: "example.com",
      title: "Docs",
      browser: "Chrome",
      os: "Windows",
      country: "US",
    });
    expect(eventMessages[3]?.data).toMatchObject({
      eventKind: "visibility",
      visibilityState: "visible",
      status: "open",
      hiddenAt: null,
      visitId: "socket-visit",
    });
    expect(staleServer.closed).toBe(true);

    ctx.object.webSocketClose(
      healthyServer as unknown as WebSocket,
      1000,
      "",
      true,
    );
    await postIngest(
      ctx.object,
      envelope({
        visitId: "after-close",
      }),
    );
    expect(healthyServer.sent).toHaveLength(6);

    const snapshot = await ctx.object.fetch(
      new Request("https://ingest.internal/snapshot?from=NaN&to=NaN&limit=NaN"),
    );
    await expect(snapshot.json()).resolves.toMatchObject({
      ok: true,
      events: expect.arrayContaining([
        expect.objectContaining({
          id: "leave:socket-visit",
          eventType: "__presence_leave",
        }),
      ]),
    });
  });

  it("retains custom events when D1 custom event flush expansion or insert verification fails", async () => {
    const invalidJsonCtx = createTestDo();
    invalidJsonCtx.d1.insertVisit({ visit_id: "visit-invalid-json" });
    insertBufferedCustomEvent(invalidJsonCtx.sql, {
      event_id: "event-invalid-json",
      visit_id: "visit-invalid-json",
      event_data_json: "{not-json",
    });
    vi.setSystemTime(NOW + 60_000);

    await invalidJsonCtx.object.alarm();
    expect(
      localRows<{ events: number }>(
        invalidJsonCtx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events",
      )[0]?.events,
    ).toBe(1);

    const missingInsertCtx = createTestDo();
    missingInsertCtx.d1.insertVisit({ visit_id: "visit-removed-before-batch" });
    insertBufferedCustomEvent(missingInsertCtx.sql, {
      event_id: "event-missing-insert",
      visit_id: "visit-removed-before-batch",
      event_name: "Missing Insert",
      event_data_json: '{"ok":true}',
    });
    missingInsertCtx.d1.beforeBatch = () => {
      missingInsertCtx.d1.db
        .prepare("DELETE FROM visits WHERE visit_id = ?")
        .run("visit-removed-before-batch");
    };

    await missingInsertCtx.object.alarm();
    expect(
      localRows<{ events: number }>(
        missingInsertCtx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events",
      )[0]?.events,
    ).toBe(1);
    expect(
      missingInsertCtx.d1.all<{ events: number }>(
        "SELECT COUNT(*) AS events FROM custom_events",
      )[0]?.events,
    ).toBe(0);
  });

  it("hydrates persisted orphan custom event visits and deletes old unresolved orphans during cleanup", async () => {
    const ctx = createTestDo();
    ctx.d1.insertVisit({
      visit_id: "late-persisted",
      status: "complete",
      ended_at: NOW - 1_000,
      finalized_at: NOW - 1_000,
    });

    for (let index = 0; index < 8; index += 1) {
      insertBufferedCustomEvent(ctx.sql, {
        event_id: `event-old-${index}`,
        visit_id: `missing-${index}`,
        occurred_at: NOW - VISIT_TIMEOUT_MS - 10_000 + index,
        received_at: NOW - VISIT_TIMEOUT_MS - 10_000 + index,
        created_at: toSeconds(NOW - VISIT_TIMEOUT_MS - 10_000 + index),
      });
    }
    insertBufferedCustomEvent(ctx.sql, {
      event_id: "event-hydrate",
      visit_id: "late-persisted",
      occurred_at: NOW - VISIT_TIMEOUT_MS - 1_000,
      received_at: NOW - VISIT_TIMEOUT_MS - 1_000,
      created_at: toSeconds(NOW - VISIT_TIMEOUT_MS - 1_000),
    });
    insertBufferedCustomEvent(ctx.sql, {
      event_id: "event-delete",
      visit_id: "still-missing",
      occurred_at: NOW - VISIT_TIMEOUT_MS - 500,
      received_at: NOW - VISIT_TIMEOUT_MS - 500,
      created_at: toSeconds(NOW - VISIT_TIMEOUT_MS - 500),
    });

    vi.setSystemTime(NOW + 60_000);

    await ctx.object.alarm();
    expect(
      localRows<{ dirty: number; status: string }>(
        ctx.sql,
        "SELECT dirty, status FROM buffered_visits WHERE visit_id = ?",
        "late-persisted",
      )[0],
    ).toEqual({ dirty: 0, status: "complete" });
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events WHERE event_id = ?",
        "event-hydrate",
      )[0]?.events,
    ).toBe(1);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events WHERE event_id = ?",
        "event-delete",
      )[0]?.events,
    ).toBe(0);
    // Its page view back, the event waits for the next alarm.
    expect(ctx.getAlarmAt()).toBe(NOW + 120_000);
  });

  it("repairs legacy buffered custom event schemas during initialization", () => {
    const legacySql = new SqliteSqlStorage();
    legacySql.exec(`
      CREATE TABLE buffered_custom_events (
        event_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visit_id TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        pathname TEXT NOT NULL,
        hostname TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        event_name TEXT NOT NULL,
        event_data_json TEXT NOT NULL DEFAULT '{}',
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    createTestDo({}, legacySql);

    expect(
      localRows<{ name: string }>(
        legacySql,
        "PRAGMA table_info(buffered_custom_events)",
      ).map((column) => column.name),
    ).toEqual(expect.arrayContaining(["received_at", "sequence"]));

    const preSchedulingSql = new SqliteSqlStorage();
    preSchedulingSql.exec(`
      CREATE TABLE buffered_custom_events (
        event_id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        visit_id TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        received_at INTEGER NOT NULL,
        sequence INTEGER NOT NULL DEFAULT 0,
        event_name TEXT NOT NULL,
        event_data_json TEXT NOT NULL DEFAULT '{}',
        dirty INTEGER NOT NULL DEFAULT 1,
        flush_attempts INTEGER NOT NULL DEFAULT 0,
        last_flush_error TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    createTestDo({}, preSchedulingSql);

    expect(
      localRows<{ name: string }>(
        preSchedulingSql,
        "PRAGMA table_info(buffered_custom_events)",
      ).map((column) => column.name),
    ).toEqual(expect.arrayContaining(["revenue_amount", "revenue_currency"]));
  });

  it("reads what the alarm writes and the visit deadlines through indexes", () => {
    const ctx = createTestDo();
    const plan = (query: string) =>
      localRows<{ detail: string }>(ctx.sql, `EXPLAIN QUERY PLAN ${query}`)
        .map((row) => row.detail)
        .join(" | ");

    const visitFlushPlan = plan(`
      SELECT visit_id FROM buffered_visits
      WHERE dirty = 1
      ORDER BY flush_attempts ASC, started_at ASC
      LIMIT 100
    `);
    expect(visitFlushPlan).toContain("idx_buffered_visits_dirty");
    expect(visitFlushPlan).not.toContain("TEMP B-TREE");
    const eventFlushPlan = plan(`
      SELECT event_id FROM buffered_custom_events
      WHERE dirty = 1
      ORDER BY flush_attempts ASC, occurred_at ASC
      LIMIT 100
    `);
    expect(eventFlushPlan).toContain("idx_buffered_custom_events_dirty");
    expect(eventFlushPlan).not.toContain("TEMP B-TREE");
    expect(
      plan(
        "SELECT MIN(last_activity_at) FROM buffered_visits WHERE status = 'open'",
      ),
    ).toContain("idx_buffered_visits_status_activity");
    expect(
      plan(
        "SELECT MIN(hidden_at) FROM buffered_visits WHERE status = 'hidden_pending' AND hidden_at IS NOT NULL",
      ),
    ).toContain("idx_buffered_visits_status_hidden_at");
  });

  it("writes every custom event whose page view is in D1 in one alarm", async () => {
    const ctx = createTestDo();
    const visit = {
      visit_id: "event-budget-visit",
      status: "complete",
      ended_at: NOW - 1_000,
      finalized_at: NOW - 1_000,
    };
    ctx.d1.insertVisit(visit);
    insertBufferedVisit(ctx.sql, { ...visit, dirty: 0 });

    for (let index = 0; index < 21; index += 1) {
      insertBufferedCustomEvent(ctx.sql, {
        event_id: `event-budget-${index}`,
        visit_id: "event-budget-visit",
        event_name: "Budget Event",
        event_data_json: '{"ok":true}',
      });
    }

    vi.setSystemTime(NOW + 60_000);

    await ctx.object.alarm();

    expect(
      ctx.d1.all<{ count: number }>(
        "SELECT COUNT(*) AS count FROM custom_events",
      )[0]?.count,
    ).toBe(21);
    expect(
      localRows<{ dirty: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS dirty FROM buffered_custom_events WHERE dirty = 1",
      )[0]?.dirty,
    ).toBe(0);
    // Nothing waits: the page view ended.
    expect(ctx.getAlarmAt()).toBeNull();
  });

  it("deletes a written custom event older than the retention in the same alarm", async () => {
    const ctx = createTestDo();
    const visit = {
      visit_id: "old-event-visit",
      status: "complete",
      ended_at: NOW - VISIT_TIMEOUT_MS + 60_000,
      finalized_at: NOW - VISIT_TIMEOUT_MS + 60_000,
      duration_source: "hidden",
    };
    ctx.d1.insertVisit(visit);
    insertBufferedVisit(ctx.sql, { ...visit, dirty: 0 });
    insertBufferedCustomEvent(ctx.sql, {
      event_id: "old-flushed-event",
      visit_id: "old-event-visit",
      event_name: "Old Flushed",
      event_data_json: '{"ok":true}',
      occurred_at: NOW - RECENT_EVENT_RETENTION_MS - 1,
      received_at: NOW - RECENT_EVENT_RETENTION_MS - 1,
      created_at: toSeconds(NOW - RECENT_EVENT_RETENTION_MS - 1),
    });

    vi.setSystemTime(NOW + 60_000);

    await ctx.object.alarm();
    expect(
      ctx.d1.all<{ event_id: string }>(
        "SELECT event_id FROM custom_events WHERE event_id = ?",
        "old-flushed-event",
      ),
    ).toEqual([{ event_id: "old-flushed-event" }]);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events WHERE event_id = ?",
        "old-flushed-event",
      )[0]?.events,
    ).toBe(0);
  });

  it("keeps an old orphan event whose page view arrives while cleanup asks D1 for it", async () => {
    const ctx = createTestDo();
    insertBufferedCustomEvent(ctx.sql, {
      event_id: "event-racing",
      visit_id: "arriving-visit",
      occurred_at: NOW - VISIT_TIMEOUT_MS - 1_000,
      received_at: NOW - VISIT_TIMEOUT_MS - 1_000,
      created_at: toSeconds(NOW - VISIT_TIMEOUT_MS - 1_000),
    });
    const prepare = ctx.d1.prepare.getMockImplementation()!;
    let arrived = false;
    ctx.d1.prepare.mockImplementation((query: string) => {
      if (!arrived && query.includes("AS visitId")) {
        arrived = true;
        insertBufferedVisit(ctx.sql, { visit_id: "arriving-visit" });
      }
      return prepare(query);
    });

    await ctx.object.alarm();

    expect(arrived).toBe(true);
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events WHERE event_id = ?",
        "event-racing",
      )[0]?.events,
    ).toBe(1);
  });

  it("keeps old orphan events when cleanup hydrates every missing visit from D1", async () => {
    const ctx = createTestDo();
    ctx.d1.insertVisit({
      visit_id: "only-persisted-orphan",
      status: "complete",
      ended_at: NOW - VISIT_TIMEOUT_MS - 1_000,
      finalized_at: NOW - VISIT_TIMEOUT_MS - 1_000,
    });
    for (let index = 0; index < 21; index += 1) {
      insertBufferedCustomEvent(ctx.sql, {
        event_id: `only-hydrated-event-${index}`,
        visit_id: "only-persisted-orphan",
        event_name: "Hydrated Orphan",
        event_data_json: '{"ok":true}',
        occurred_at: NOW - VISIT_TIMEOUT_MS - 1_000 + index,
        received_at: NOW - VISIT_TIMEOUT_MS - 1_000 + index,
        created_at: toSeconds(NOW - VISIT_TIMEOUT_MS - 1_000 + index),
      });
    }

    await ctx.object.alarm();
    expect(
      localRows<{ dirty: number }>(
        ctx.sql,
        "SELECT dirty FROM buffered_visits WHERE visit_id = ?",
        "only-persisted-orphan",
      )[0],
    ).toEqual({ dirty: 0 });
    expect(
      localRows<{ events: number }>(
        ctx.sql,
        "SELECT COUNT(*) AS events FROM buffered_custom_events WHERE event_id = ?",
        "only-hydrated-event-20",
      )[0]?.events,
    ).toBe(1);
  });

  it("records websocket initial snapshot send failures in the invocation log", async () => {
    const ctx = createTestDo();
    const client = new FakeWebSocket();
    const server = new FakeWebSocket();
    server.failSend = true;
    class FailingSnapshotWebSocketPair {
      constructor() {
        return [client, server];
      }
    }
    const RealResponse = globalThis.Response;
    vi.stubGlobal("WebSocketPair", FailingSnapshotWebSocketPair);
    vi.stubGlobal("Response", FakeUpgradeResponse);

    const response = await ctx.object.fetch({
      url: "https://ingest.internal/ws",
      method: "GET",
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "upgrade" ? "websocket" : null,
      },
    } as unknown as Request);
    vi.stubGlobal("Response", RealResponse);

    expect(response.status).toBe(101);
    expect(server.accepted).toBe(true);
    expect(console.error).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "do",
        trigger: "request",
        request: expect.objectContaining({ route: "/ws", status: 101 }),
        logs: expect.arrayContaining([
          expect.objectContaining({ message: "do.websocket.snapshot_failed" }),
        ]),
      }),
    );
  });

  it("ignores leave updates that lose the open-visit race", async () => {
    const ctx = createTestDo();
    await postIngest(
      ctx.object,
      envelope({
        visitId: "race-visit",
        startedAt: NOW - 10_000,
        timestamp: NOW - 10_000,
      }),
    );

    const originalExec = ctx.sql.exec.bind(ctx.sql);
    vi.spyOn(ctx.sql, "exec").mockImplementation(
      (query: string, ...bindings: SqlBinding[]) => {
        const normalized = query.replace(/\s+/g, " ");
        if (
          normalized.includes("UPDATE buffered_visits") &&
          normalized.includes("duration_source = ?") &&
          normalized.includes("exit_reason = ?") &&
          normalized.includes(
            "WHERE visit_id = ? AND status IN ('open', 'hidden_pending')",
          )
        ) {
          originalExec(
            "UPDATE buffered_visits SET status = 'complete' WHERE visit_id = ?",
            "race-visit",
          );
        }
        return originalExec(query, ...bindings);
      },
    );

    const response = await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "race-visit",
        timestamp: NOW,
      }),
    );

    expect(response.status).toBe(202);
    expect(console.log).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: "do",
        traceId: "trace-1",
        logs: expect.arrayContaining([
          expect.objectContaining({ message: "do.ingest.leave_race_lost" }),
          expect.objectContaining({ message: "do.ingest.leave_ignored" }),
        ]),
      }),
    );
    await expect(
      (
        await ctx.object.fetch(
          new Request(
            "https://ingest.internal/snapshot?from=0&to=9999999999999&limit=10",
          ),
        )
      ).json(),
    ).resolves.toMatchObject({
      events: expect.not.arrayContaining([
        expect.objectContaining({ eventType: "__presence_leave" }),
      ]),
    });
  });
});

describe("rollups of days the ingest buffer writes to afterwards", () => {
  const DAY_MS = 86_400_000;
  const HOUR_MS = 3_600_000;
  const DAY = Math.floor(NOW / DAY_MS);
  const NEXT_DAY_MS = (DAY + 1) * DAY_MS;
  // The day is rolled up at noon the next day.
  const ROLLUP_AT = NEXT_DAY_MS + 12 * HOUR_MS;

  function createRollupDo() {
    const database = createMigratedDatabase();
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const trace: SqliteD1Trace = {
      preparedSql: [],
      bindings: [],
      batchStatements: [],
    };
    const DB = createSqliteD1Database(database, trace);
    return { database, trace, ctx: createTestDo({ DB }), env: { DB } as Env };
  }

  /** The dirty-day marks the alarm's D1 batches carried. */
  function markStatements(trace: SqliteD1Trace): number {
    return (trace.batchStatements ?? [])
      .flat()
      .filter((sql) => sql.includes("visit_rollup_dirty_days")).length;
  }

  function dayRollup(database: DatabaseSync) {
    return database
      .prepare(
        "SELECT views, duration_ms_sum, duration_ms_count FROM visit_daily_rollups WHERE day = ?",
      )
      .get(DAY);
  }

  function dirtyDays(database: DatabaseSync) {
    return database
      .prepare("SELECT site_pk, day FROM visit_rollup_dirty_days")
      .all();
  }

  async function pageView(
    ctx: TestDoContext,
    visitId: string,
    at: number,
  ): Promise<void> {
    vi.setSystemTime(at);
    await postIngest(
      ctx.object,
      envelope({ visitId, startedAt: at, timestamp: at }, { receivedAt: at }),
    );
  }

  it("rebuilds a rolled-up day when the buffer finishes one of its page views afterwards", async () => {
    const { database, ctx, env } = createRollupDo();
    // Opened at 23:59 and hidden at 11:50 the next morning.
    const startedAt = NEXT_DAY_MS - 60_000;
    const hiddenAt = NEXT_DAY_MS + 11 * HOUR_MS + 50 * 60_000;
    await pageView(ctx, "late-tab", startedAt);
    vi.setSystemTime(hiddenAt);
    await postIngest(
      ctx.object,
      envelope(
        {
          kind: "visibility",
          visitId: "late-tab",
          visibilityState: "hidden",
          timestamp: hiddenAt,
        },
        { receivedAt: hiddenAt },
      ),
    );
    vi.setSystemTime(hiddenAt + 60_000);
    await ctx.object.alarm();
    // Its day isn't rolled up yet, so the flush marks nothing.
    expect(dirtyDays(database)).toEqual([]);

    // At noon the day is rolled up with the page view still hidden, and the
    // rollup task leaves the page view as the buffer wrote it.
    await runVisitRollups(env, ROLLUP_AT);
    expect(
      database.prepare("SELECT status, duration_ms FROM visits").get(),
    ).toEqual({ status: "hidden_pending", duration_ms: null });
    expect(dayRollup(database)).toEqual({
      views: 1,
      duration_ms_sum: 0,
      duration_ms_count: 0,
    });

    // After its grace period the buffer finishes it with its duration, and
    // marks its day in the same batch.
    vi.setSystemTime(hiddenAt + RECENT_EVENT_RETENTION_MS + 60_000);
    await ctx.object.alarm();
    expect(
      database.prepare("SELECT status, duration_ms FROM visits").get(),
    ).toEqual({ status: "complete", duration_ms: hiddenAt - startedAt });
    expect(dirtyDays(database)).toEqual([{ site_pk: 1, day: DAY }]);

    const next = await runVisitRollups(env, ROLLUP_AT + HOUR_MS);

    expect(next.summary).toMatchObject({ daysRebuilt: 1, daysRolledUp: 0 });
    expect(dayRollup(database)).toEqual({
      views: 1,
      duration_ms_sum: hiddenAt - startedAt,
      duration_ms_count: 1,
    });
    expect(dirtyDays(database)).toEqual([]);
  });

  it("marks a page view's day only once the day could be rolled up", async () => {
    const { database, trace, ctx, env } = createRollupDo();
    const flushFinished = async (
      visitId: string,
      startedAt: number,
      at: number,
    ) => {
      insertBufferedVisit(ctx.sql, {
        visit_id: visitId,
        visitor_id: visitId,
        status: "complete",
        started_at: startedAt,
        last_activity_at: startedAt + 1_000,
        ended_at: startedAt + 1_000,
        finalized_at: startedAt + 1_000,
      });
      vi.setSystemTime(at);
      await ctx.object.alarm();
    };

    // Today can't be rolled up: no statement for it.
    await flushFinished(
      "today",
      DAY * DAY_MS + 10 * HOUR_MS,
      DAY * DAY_MS + 11 * HOUR_MS,
    );
    expect(markStatements(trace)).toBe(0);

    await runVisitRollups(env, ROLLUP_AT);
    // The next day is rolled up at noon the day after. An hour and a minute
    // before, its page view still has nothing to mark.
    const nextRollupAt = ROLLUP_AT + DAY_MS;
    await flushFinished(
      "early",
      NEXT_DAY_MS + 23 * HOUR_MS,
      nextRollupAt - HOUR_MS - 60_000,
    );
    expect(markStatements(trace)).toBe(0);

    // Within the hour, a flush that may race the rollup marks it, though
    // only a rolled-up day is recorded.
    await flushFinished(
      "racing",
      NEXT_DAY_MS + 23 * HOUR_MS,
      nextRollupAt - 30 * 60_000,
    );
    expect(markStatements(trace)).toBe(1);
    expect(dirtyDays(database)).toEqual([]);

    // A rolled-up day's page view is marked.
    await flushFinished(
      "late",
      DAY * DAY_MS + 15 * HOUR_MS,
      nextRollupAt - 29 * 60_000,
    );
    expect(markStatements(trace)).toBe(2);
    expect(dirtyDays(database)).toEqual([{ site_pk: 1, day: DAY }]);
  });

  it("adds a page view flushed after its day was rolled up", async () => {
    const { database, ctx, env } = createRollupDo();
    await pageView(ctx, "on-time", DAY * DAY_MS + 10 * HOUR_MS);
    vi.setSystemTime(DAY * DAY_MS + 10 * HOUR_MS + 60_000);
    await ctx.object.alarm();
    // Viewed at 23:59; its flush is held up until after the rollup.
    await pageView(ctx, "held-up", NEXT_DAY_MS - 60_000);

    await runVisitRollups(env, ROLLUP_AT);
    expect(dayRollup(database)).toMatchObject({ views: 1 });

    vi.setSystemTime(ROLLUP_AT + 60_000);
    await ctx.object.alarm();
    expect(dirtyDays(database)).toEqual([{ site_pk: 1, day: DAY }]);
    const next = await runVisitRollups(env, ROLLUP_AT + HOUR_MS);

    expect(next.summary).toMatchObject({ daysRebuilt: 1 });
    expect(dayRollup(database)).toMatchObject({ views: 2 });
    expect(dirtyDays(database)).toEqual([]);
  });
});
describe("scroll depth", () => {
  function scrollDepths(ctx: TestDoContext) {
    return localRows<{ visit_id: string; scroll_depth: number | null }>(
      ctx.sql,
      "SELECT visit_id, scroll_depth FROM buffered_visits ORDER BY visit_id",
    );
  }

  function hidden(visitId: string, at: number, scrollDepth?: number) {
    return envelope({
      kind: "visibility",
      visitId,
      visibilityState: "hidden",
      timestamp: at,
      ...(scrollDepth === undefined ? {} : { scrollDepth }),
    });
  }

  function visible(visitId: string, at: number) {
    return envelope({
      kind: "visibility",
      visitId,
      visibilityState: "visible",
      timestamp: at,
    });
  }

  function leave(visitId: string, at: number, scrollDepth?: number) {
    return envelope({
      kind: "leave",
      visitId,
      timestamp: at,
      ...(scrollDepth === undefined ? {} : { scrollDepth }),
    });
  }

  async function flushAt(ctx: TestDoContext, at: number) {
    vi.setSystemTime(at);
    await ctx.object.alarm();
  }

  function d1ScrollDepths(ctx: TestDoContext) {
    return ctx.d1.all<{
      visit_id: string;
      status: string;
      scroll_depth: number | null;
    }>("SELECT visit_id, status, scroll_depth FROM visits ORDER BY visit_id");
  }

  it("keeps the deepest depth a page view reported when it leaves", async () => {
    const ctx = createTestDo();
    for (const visitId of ["deeper-before", "deeper-at-leave", "no-depth"]) {
      await postIngest(
        ctx.object,
        envelope({ visitId, startedAt: NOW - 30_000, timestamp: NOW - 30_000 }),
      );
    }

    await postIngest(ctx.object, hidden("deeper-before", NOW - 20_000, 40));
    await postIngest(ctx.object, visible("deeper-before", NOW - 15_000));
    await postIngest(ctx.object, leave("deeper-before", NOW - 5_000, 30));

    await postIngest(ctx.object, hidden("deeper-at-leave", NOW - 20_000, 20));
    await postIngest(ctx.object, visible("deeper-at-leave", NOW - 15_000));
    await postIngest(ctx.object, leave("deeper-at-leave", NOW - 5_000, 80));

    await postIngest(ctx.object, leave("no-depth", NOW - 5_000));

    expect(scrollDepths(ctx)).toEqual([
      { visit_id: "deeper-at-leave", scroll_depth: 80 },
      { visit_id: "deeper-before", scroll_depth: 40 },
      { visit_id: "no-depth", scroll_depth: null },
    ]);
  });

  it("merges a second hidden report into a page view that is still hidden", async () => {
    const ctx = createTestDo();
    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-1",
        startedAt: NOW - 30_000,
        timestamp: NOW - 30_000,
      }),
    );

    await postIngest(ctx.object, hidden("visit-1", NOW - 20_000, 20));
    await postIngest(ctx.object, hidden("visit-1", NOW - 19_000, 25));

    expect(scrollDepths(ctx)).toEqual([
      { visit_id: "visit-1", scroll_depth: 25 },
    ]);
  });

  it("closes a page ended by a route change with the depth the next pageview carries", async () => {
    const ctx = createTestDo();
    const route = (
      visitId: string,
      from: string,
      to: string,
      at: number,
      previousScrollDepth?: number,
    ) =>
      envelope({
        visitId,
        navigation: "route",
        startedAt: at,
        timestamp: at,
        pathname: to,
        referrerUrl: `https://example.com${from}`,
        ...(previousScrollDepth === undefined ? {} : { previousScrollDepth }),
      });

    await postIngest(
      ctx.object,
      envelope({
        visitId: "visit-1",
        startedAt: NOW - 30_000,
        timestamp: NOW - 30_000,
        pathname: "/first",
      }),
    );
    await postIngest(ctx.object, hidden("visit-1", NOW - 28_000, 30));
    await postIngest(ctx.object, visible("visit-1", NOW - 26_000));
    await postIngest(
      ctx.object,
      route("visit-2", "/first", "/second", NOW - 20_000, 65),
    );
    await postIngest(ctx.object, hidden("visit-2", NOW - 18_000, 50));
    await postIngest(ctx.object, visible("visit-2", NOW - 16_000));
    // A route pageview without a depth leaves the stored one.
    await postIngest(ctx.object, route("visit-3", "/second", "/third", NOW));

    expect(
      localRows(
        ctx.sql,
        "SELECT visit_id, status, scroll_depth FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      { visit_id: "visit-1", status: "complete", scroll_depth: 65 },
      { visit_id: "visit-2", status: "complete", scroll_depth: 50 },
      { visit_id: "visit-3", status: "open", scroll_depth: null },
    ]);
  });

  it("keeps a hidden page view's depth when it ends at the hidden timeout", async () => {
    const ctx = createTestDo();
    const startedAt = NOW - 40 * 60 * 1000;
    const hiddenAt = NOW - RECENT_EVENT_RETENTION_MS - 60_000;
    await postIngest(
      ctx.object,
      envelope(
        { visitId: "visit-1", startedAt, timestamp: startedAt },
        { receivedAt: startedAt },
      ),
    );
    await postIngest(
      ctx.object,
      envelope(
        {
          kind: "visibility",
          visitId: "visit-1",
          visibilityState: "hidden",
          timestamp: hiddenAt,
          scrollDepth: 55,
        },
        { receivedAt: hiddenAt },
      ),
    );

    await flushAt(ctx, NOW);

    expect(
      ctx.d1.all(
        "SELECT status, exit_reason, scroll_depth FROM visits WHERE visit_id = ?",
        "visit-1",
      ),
    ).toEqual([
      { status: "complete", exit_reason: "hidden_timeout", scroll_depth: 55 },
    ]);
  });

  it("writes a page view to D1 when it opens and when it ends, not while hidden, shown or active", async () => {
    const ctx = createTestDo();
    const visitWrites = () =>
      ctx.d1.prepare.mock.calls.filter(([query]) =>
        query.includes("INSERT INTO visits"),
      ).length;
    const at = (offset: number) => ({ receivedAt: NOW + offset });
    await postIngest(
      ctx.object,
      envelope({ visitId: "visit-1", startedAt: NOW, timestamp: NOW }),
    );
    await flushAt(ctx, NOW + 60_000);
    expect(d1ScrollDepths(ctx)).toEqual([
      { visit_id: "visit-1", status: "open", scroll_depth: null },
    ]);
    expect(visitWrites()).toBe(1);

    vi.setSystemTime(NOW + 60_000);
    await postIngest(ctx.object, {
      ...hidden("visit-1", NOW + 60_000, 35),
      request: { ...hidden("visit-1", 0).request, ...at(60_000) },
    });
    await postIngest(ctx.object, {
      ...visible("visit-1", NOW + 70_000),
      request: { ...visible("visit-1", 0).request, ...at(70_000) },
    });
    await postIngest(
      ctx.object,
      envelope(
        {
          kind: "custom_event",
          visitId: "visit-1",
          eventId: "event-1",
          eventName: "Signup",
          eventData: {},
          timestamp: NOW + 80_000,
        },
        at(80_000),
      ),
    );
    await flushAt(ctx, NOW + 120_000);
    // Only the custom event went to D1; the page view is as it opened.
    expect(ctx.d1.all("SELECT event_id FROM custom_events")).toEqual([
      { event_id: "event-1" },
    ]);
    expect(d1ScrollDepths(ctx)).toEqual([
      { visit_id: "visit-1", status: "open", scroll_depth: null },
    ]);
    expect(visitWrites()).toBe(1);

    await postIngest(ctx.object, {
      ...leave("visit-1", NOW + 120_000, 70),
      request: { ...leave("visit-1", 0).request, ...at(120_000) },
    });
    await flushAt(ctx, NOW + 180_000);
    expect(d1ScrollDepths(ctx)).toEqual([
      { visit_id: "visit-1", status: "complete", scroll_depth: 70 },
    ]);
    expect(visitWrites()).toBe(2);
  });

  it("keeps the depth of a page view read back from D1", async () => {
    const ctx = createTestDo();
    ctx.d1.insertVisit({
      visit_id: "visit-1",
      status: "hidden_pending",
      scroll_depth: 35,
    });

    // A custom event reads the page view back into the buffer.
    await postIngest(
      ctx.object,
      envelope({
        kind: "custom_event",
        visitId: "visit-1",
        eventName: "signup",
        eventData: {},
        timestamp: NOW,
      }),
    );
    await postIngest(ctx.object, leave("visit-1", NOW, 20));
    await flushAt(ctx, NOW + 60_000);

    expect(d1ScrollDepths(ctx)).toEqual([
      { visit_id: "visit-1", status: "complete", scroll_depth: 35 },
    ]);
  });
});

describe("page view properties", () => {
  it("flushes a page view's properties with it, once", async () => {
    const database = createMigratedDatabase();
    seedSites(database, [{ siteId: "site-1", sitePk: 1 }]);
    const ctx = createTestDo({ DB: createSqliteD1Database(database) });
    const properties = () =>
      database
        .prepare(
          "SELECT visit_id, key, value, site_pk, started_at FROM visit_properties ORDER BY visit_id, key",
        )
        .all();

    await postIngest(
      ctx.object,
      envelope({
        visitId: "with-props",
        props: { author: "Jane", section: "blog", seats: 5 },
      }),
    );
    await postIngest(
      ctx.object,
      envelope({ visitId: "without-props", pathname: "/pricing" }),
    );
    expect(
      localRows(
        ctx.sql,
        "SELECT visit_id, properties_json FROM buffered_visits ORDER BY visit_id",
      ),
    ).toEqual([
      {
        visit_id: "with-props",
        properties_json: JSON.stringify({ author: "Jane", section: "blog" }),
      },
      { visit_id: "without-props", properties_json: null },
    ]);
    vi.setSystemTime(NOW + 60_000);
    await ctx.object.alarm();

    const flushed = [
      {
        visit_id: "with-props",
        key: "author",
        value: "Jane",
        site_pk: 1,
        started_at: NOW - 1_000,
      },
      {
        visit_id: "with-props",
        key: "section",
        value: "blog",
        site_pk: 1,
        started_at: NOW - 1_000,
      },
    ];
    expect(properties()).toEqual(flushed);

    // The leave flushes the page view again; its properties stay as written.
    await postIngest(
      ctx.object,
      envelope({
        kind: "leave",
        visitId: "with-props",
        timestamp: NOW + 70_000,
      }),
    );
    vi.setSystemTime(NOW + 140_000);
    await ctx.object.alarm();

    expect(
      database
        .prepare("SELECT status FROM visits WHERE visit_id = 'with-props'")
        .get(),
    ).toEqual({ status: "complete" });
    expect(properties()).toEqual(flushed);
    database.close();
  });
});
