import { DurableObject } from "cloudflare:workers";

import { createDatabaseRuntime } from "@/lib/db";
import { instrumentEnv } from "@/lib/edge/observability/bindings";
import {
  createInvocationLogger,
  currentInvocationLogger,
  errorLogData,
  type InvocationLogger,
  runWithInvocationLogger,
} from "@/lib/edge/observability/logger";
import {
  BudgetedDatabase,
  D1_QUERIES_PER_INVOCATION,
} from "@/lib/edge/scheduled-tasks/d1-query-budget";
import type {
  Env,
  IngestEnvelopePayload,
  NormalizedCustomEvent,
  NormalizedLeave,
  NormalizedPageview,
  NormalizedVisibility,
} from "@/lib/edge/types";

import {
  findRecentVisitorSession,
  getVisitContext as getVisitContextFromBufferStore,
  hasOpenVisitsForVisitor,
  insertBufferedCustomEvent,
  insertBufferedVisitRow,
  insertCustomEvent,
  insertVisit,
  propertiesJson,
  readPersistedVisitRow,
  updateOpenVisitActivity,
} from "./buffer-store";
import {
  ACTIVE_NOW_WINDOW_MS,
  D1_FLUSH_INTERVAL_MS,
  HIDDEN_LEAVE_GRACE_MS,
  WS_PRESENCE_LEAVE_EVENT,
} from "./constants";
import { ENGAGED_DURATION_AT_SQL, engagedDurationMs } from "./engaged-time";
import { MaintenanceOutcome, runCleanup, runMaintenance } from "./flush";
import type { IngestFlushContext } from "./flush-types";
import { nextAlarmAt } from "./next-alarm";
import { jsonResponse, type RealtimeSnapshotRecord } from "./normalize";
import {
  pushInitialRealtimeSnapshot,
  pushRealtimeRecordToSockets,
  readActiveRealtimeVisits,
  readRecentRealtimeEvents,
  snapshotQueryParams,
} from "./realtime";
import { normalizeIngestRecord } from "./record-normalize";
import { DEEPEST_SCROLL_DEPTH_SQL } from "./scroll-depth";
import type { SqlBinding } from "./sql";
import { IngestSqlAccess } from "./sql-access";
import { toUnixSeconds } from "./time";
import type { NormalizeResult, StoredOpenVisit } from "./types";
import { deleteExpiredVisitorSalts, visitorSaltFor } from "./visitor-salts";
import {
  getDurableObjectWebSockets,
  WEBSOCKET_ATTACHMENT_VERSION,
  type WebSocketAttachment,
  websocketCloseCode,
} from "./websocket-support";
export class IngestDurableObject extends DurableObject {
  private readonly doState: DurableObjectState;
  private readonly doEnv: Env;
  private readonly schemaReady: Promise<void>;
  private readonly sql: IngestSqlAccess;
  private readonly eventNameIds = new Map<string, number>();
  private activeNowCache: {
    readonly cutoffBucket: number;
    readonly expiresAtMs: number;
    readonly activeNow: number;
  } | null = null;
  /**
   * When the alarm is set to run, null if it isn't; undefined until read
   * from storage. Only this object sets it, so requests check it here.
   */
  private alarmAt: number | null | undefined;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.doState = state;
    this.doEnv = env;
    this.sql = new IngestSqlAccess(state);
    // Auto responses are Durable Object state configuration rather than
    // per-connection state. Register them during reconstruction so an
    // application-level heartbeat remains handled while the object hibernates
    // and after the constructor runs again.
    this.configureWebSocketAutoResponse();
    this.schemaReady = this.doState.blockConcurrencyWhile(async () => {
      this.sql.initializeSchema();
    });
  }

  private sqlRun(query: string, ...bindings: SqlBinding[]): number {
    return this.sql.sqlRun(query, ...bindings);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const logger = createInvocationLogger({
      source: "do",
      trigger: "request",
    });
    logger.info("do.request.started");

    try {
      return await runWithInvocationLogger(logger, async () => {
        await logger.measure("do.schema_ready", () => this.schemaReady);
        const response = await this.handleRequest(request, url, logger);
        logger.setRequest({
          route: url.pathname,
          method: request.method,
          status: response.status,
          outcome: response.status >= 400 ? "error" : "ok",
        });
        return response;
      });
    } catch (error) {
      logger.error("do.request.unhandled_error", errorLogData(error));
      logger.setRequest({
        route: url.pathname,
        method: request.method,
        status: 500,
        outcome: "error",
      });
      throw error;
    } finally {
      logger.info("do.request.completed");
      logger.emit();
    }
  }

  private async handleRequest(
    request: Request,
    url: URL,
    logger: InvocationLogger,
  ): Promise<Response> {
    if (url.pathname === "/ws") {
      return this.handleWebSocket(request, url, logger);
    }

    if (url.pathname === "/ingest" && request.method === "POST") {
      return this.handleIngest(request, logger);
    }

    if (url.pathname === "/snapshot" && request.method === "GET") {
      return this.handleSnapshot(url, logger);
    }

    if (url.pathname === "/active" && request.method === "GET") {
      return this.handleActive(logger);
    }

    if (url.pathname === "/reconcile" && request.method === "POST") {
      logger.info("do.alarm.reconcile_internal_started");
      // The every-30-minutes sweep calls this on every site, so a quiet
      // site's salt and finished page views are still deleted on time.
      deleteExpiredVisitorSalts(this.sql, Date.now());
      const outcome = await logger.measure("do.cleanup", () =>
        runCleanup(this.flushStoreContext(logger)),
      );
      await this.reconcileAlarm(logger, outcome);
      logger.info("do.alarm.reconcile_internal_completed");
      return jsonResponse({ ok: true });
    }

    return new Response("Not Found", { status: 404 });
  }

  async alarm(alarmInfo?: {
    retryCount?: number;
    isRetry?: boolean;
  }): Promise<void> {
    const logger = createInvocationLogger({ source: "do", trigger: "alarm" });
    logger.info("do.alarm.started");
    try {
      await runWithInvocationLogger(logger, async () => {
        await logger.measure("do.schema_ready", () => this.schemaReady);
        logger.info("do.alarm.invocation", {
          retryCount: alarmInfo?.retryCount ?? 0,
          isRetry: Boolean(alarmInfo?.isRetry),
        });
        // This alarm is spent. A request meanwhile may set the next one.
        this.alarmAt = null;
        const outcome = await logger.measure("do.maintenance", () =>
          this.runMaintenance(logger),
        );
        const now = Date.now();
        // Out of D1 queries, the next invocation goes on at once.
        await this.setNextAlarm(
          logger,
          outcome === MaintenanceOutcome.OutOfQueries
            ? now
            : nextAlarmAt(this.sql, now),
        );
      });
    } catch (error) {
      try {
        // The alarm platform retries a rejected invocation, but the current
        // alarm may already have been consumed. Run again after a flush
        // interval before preserving the original failure for the platform.
        await runWithInvocationLogger(logger, () =>
          this.setAlarm(logger, Date.now() + D1_FLUSH_INTERVAL_MS),
        );
      } catch (reconcileError) {
        // A storage failure while scheduling recovery must not hide the
        // maintenance error that caused this invocation to fail.
        logger.error("do.alarm.reconcile_failed", errorLogData(reconcileError));
      }
      logger.error("do.alarm.failed", errorLogData(error));
      throw error;
    } finally {
      logger.info("do.alarm.completed");
      logger.emit();
    }
  }

  private async handleIngest(
    request: Request,
    logger: InvocationLogger,
  ): Promise<Response> {
    let envelope: IngestEnvelopePayload;
    try {
      envelope = (await logger.measure("do.request_body_read", () =>
        request.json(),
      )) as IngestEnvelopePayload;
    } catch {
      logger.warn("do.ingest.bad_request");
      return new Response("Bad Request", { status: 400 });
    }

    const traceId = envelope.trace?.id || "";
    logger.setTraceId(traceId || undefined);
    logger.info("do.ingest.received");

    const normalized = await logger.measure("do.ingest.normalize", () =>
      this.normalizeRecord(envelope),
    );
    const record = normalized.record;
    if (!record) {
      // A custom event that came before its page view waits in the buffer
      // and is written to D1 after it.
      logger.warn(`do.ingest.ignored.${normalized.reason || "unknown"}`);
      return new Response(`ignored:${normalized.reason || "unknown"}`, {
        status: 202,
      });
    }

    // Any accepted record can change the active visitor projection. The
    // one-second /active cache is only a derived read optimization.
    this.activeNowCache = null;

    if (record.kind === "pageview") {
      await logger.measure("do.ingest.pageview", () =>
        this.handlePageview(record, logger),
      );
    } else if (record.kind === "leave") {
      await logger.measure("do.ingest.leave", () =>
        this.handleLeave(record, logger),
      );
    } else if (record.kind === "visibility") {
      await logger.measure("do.ingest.visibility", () =>
        this.handleVisibility(record, logger),
      );
    } else {
      await logger.measure("do.ingest.custom_event", () =>
        this.handleCustomEvent(record, logger),
      );
    }

    logger.info("do.ingest.completed");
    return new Response("ok", { status: 202 });
  }

  private async handleWebSocket(
    request: Request,
    _url: URL,
    logger: InvocationLogger,
  ): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    // Worker 层已验证 Session，此处不再需要额外的 token 验证
    // 如果需要额外的安全层，可以在这里添加站点权限检查

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.doState.acceptWebSocket(server);
    server.serializeAttachment({
      version: WEBSOCKET_ATTACHMENT_VERSION,
      connectedAtMs: Date.now(),
    } satisfies WebSocketAttachment);
    logger.info("do.websocket.connected");
    if (
      await logger.measure("do.websocket.initial_snapshot", () =>
        this.pushInitialSnapshotToSocket(server, logger),
      )
    ) {
      logger.info("do.websocket.snapshot_sent");
    } else {
      logger.error("do.websocket.snapshot_failed");
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private configureWebSocketAutoResponse(): void {
    const setAutoResponse = this.doState.setWebSocketAutoResponse;
    const pairConstructor = (
      globalThis as typeof globalThis & {
        WebSocketRequestResponsePair?: new (
          request: string,
          response: string,
        ) => unknown;
      }
    ).WebSocketRequestResponsePair;
    if (
      typeof setAutoResponse !== "function" ||
      typeof pairConstructor !== "function"
    ) {
      return;
    }
    setAutoResponse.call(
      this.doState,
      new pairConstructor("ping", "pong") as WebSocketRequestResponsePair,
    );
  }

  webSocketMessage(_socket: WebSocket, _message: string | ArrayBuffer): void {
    // The realtime channel is server-to-client only. Handling the event is
    // intentionally a no-op so client messages cannot keep the object awake.
  }

  webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
    _wasClean: boolean,
  ): void {
    this.emitWebSocketLifecycle(
      "do.websocket.closed",
      this.webSocketConnectedAt(socket),
      { code },
    );
    // The project's compatibility date predates the runtime's automatic
    // Close-frame reply. Complete the handshake explicitly so an otherwise
    // clean peer close is not surfaced as an abnormal 1006 close.
    try {
      socket.close(websocketCloseCode(code), reason);
    } catch {
      // The runtime may already have closed the socket by the time the
      // hibernation callback is delivered, or the reason may exceed the
      // WebSocket close-frame limit. Try the runtime's default normal close.
      try {
        socket.close();
      } catch {
        // no-op
      }
    }
  }

  webSocketError(socket: WebSocket, _error: unknown): void {
    this.emitWebSocketLifecycle(
      "do.websocket.error",
      this.webSocketConnectedAt(socket),
    );
    try {
      socket.close();
    } catch {
      // no-op
    }
  }

  private webSocketConnectedAt(socket: WebSocket): number {
    try {
      const attachment =
        socket.deserializeAttachment() as Partial<WebSocketAttachment> | null;
      if (
        attachment?.version === WEBSOCKET_ATTACHMENT_VERSION &&
        typeof attachment.connectedAtMs === "number" &&
        Number.isFinite(attachment.connectedAtMs)
      ) {
        return attachment.connectedAtMs;
      }
    } catch {
      // Older connections may not have an attachment. Use a zero-duration
      // fallback rather than making lifecycle logging break close handling.
    }
    return Date.now();
  }

  private emitWebSocketLifecycle(
    event: "do.websocket.closed" | "do.websocket.error",
    connectedAt: number,
    data?: { code: number },
  ): void {
    const logger = createInvocationLogger({ source: "do", trigger: "request" });
    logger.setRequest({
      route: "/ws",
      method: "WEBSOCKET",
      status: event === "do.websocket.error" ? 500 : 101,
      outcome: event === "do.websocket.error" ? "error" : "ok",
    });
    logger.setPerformance({
      webSocketDurationMs: Math.max(0, Math.round(Date.now() - connectedAt)),
    });
    if (event === "do.websocket.error") {
      logger.error(event);
    } else {
      logger.info(event, data);
    }
    logger.emit();
  }

  private async handleSnapshot(
    url: URL,
    logger: InvocationLogger,
  ): Promise<Response> {
    const { fromMs, toMs, limit } = snapshotQueryParams(url);
    const cutoffMs = Date.now() - ACTIVE_NOW_WINDOW_MS;
    const events = await logger.measure(
      "do.snapshot.realtime_events",
      async () =>
        readRecentRealtimeEvents(
          {
            sqlAll: <T>(query: string, ...bindings: SqlBinding[]) =>
              this.sql.measuredSqlAll<T>(logger, query, ...bindings),
          },
          fromMs,
          toMs,
          limit,
        ),
    );
    const visits = await logger.measure(
      "do.snapshot.realtime_visits",
      async () =>
        readActiveRealtimeVisits(
          {
            sqlAll: <T>(query: string, ...bindings: SqlBinding[]) =>
              this.sql.measuredSqlAll<T>(logger, query, ...bindings),
          },
          cutoffMs,
        ),
    );
    const activeNow = new Set(
      visits
        .map((visit) => visit.visitorId)
        .filter((visitorId) => visitorId !== null && visitorId !== undefined),
    ).size;

    return jsonResponse({
      ok: true,
      buffered: 0,
      activeNow,
      events,
      visits,
    });
  }

  private async handleActive(logger: InvocationLogger): Promise<Response> {
    const now = Date.now();
    const cutoffMs = now - ACTIVE_NOW_WINDOW_MS;
    const cutoffBucket = Math.floor(cutoffMs / 1000);
    const cached = this.activeNowCache;
    const activeNow =
      cached && cached.cutoffBucket === cutoffBucket && now < cached.expiresAtMs
        ? cached.activeNow
        : await logger.measure("do.active.visits", async () => {
            const visits = readActiveRealtimeVisits(
              {
                sqlAll: <T>(query: string, ...bindings: SqlBinding[]) =>
                  this.sql.measuredSqlAll<T>(logger, query, ...bindings),
              },
              cutoffMs,
            );
            const value = new Set(
              visits
                .map((visit) => visit.visitorId)
                .filter(
                  (visitorId) => visitorId !== null && visitorId !== undefined,
                ),
            ).size;
            this.activeNowCache = {
              cutoffBucket,
              expiresAtMs: now + 1_000,
              activeNow: value,
            };
            return value;
          });

    return jsonResponse({ ok: true, activeNow });
  }

  private async getAlarm(logger: InvocationLogger): Promise<number | null> {
    logger.increment("doAlarmOperations");
    logger.increment("doAlarmGets");
    this.alarmAt = await this.doState.storage.getAlarm();
    return this.alarmAt;
  }

  private async setAlarm(logger: InvocationLogger, at: number): Promise<void> {
    logger.increment("doAlarmOperations");
    logger.increment("doAlarmSets");
    await this.doState.storage.setAlarm(at);
    this.alarmAt = at;
  }

  private async deleteAlarm(logger: InvocationLogger): Promise<void> {
    logger.increment("doAlarmOperations");
    logger.increment("doAlarmDeletes");
    await this.doState.storage.deleteAlarm();
    this.alarmAt = null;
  }

  /** Makes sure the alarm runs by `at`: sets it unless it already does. */
  private async setAlarmBy(logger: InvocationLogger, at: number) {
    const current =
      this.alarmAt === undefined ? await this.getAlarm(logger) : this.alarmAt;
    if (current !== null && current <= at) return;
    await this.setAlarm(logger, at);
    logger.info("do.alarm.set", { previousAlarmAt: current, alarmAt: at });
  }

  /** A row became dirty: the alarm writes it to D1 within the interval. */
  private async scheduleFlush(logger: InvocationLogger): Promise<void> {
    await this.setAlarmBy(logger, Date.now() + D1_FLUSH_INTERVAL_MS);
  }

  private async setNextAlarm(
    logger: InvocationLogger,
    at: number | null,
  ): Promise<void> {
    if (at === null) {
      await this.deleteAlarm(logger);
    } else {
      await this.setAlarm(logger, at);
    }
    logger.info("do.alarm.next", { alarmAt: at });
  }

  /**
   * The sweep's check of a site's alarm. One the platform stranded (overdue
   * by more than a flush interval) runs now; otherwise the alarm is set by
   * the buffer's next work.
   */
  private async reconcileAlarm(
    logger: InvocationLogger,
    outcome: MaintenanceOutcome,
  ): Promise<void> {
    const now = Date.now();
    const current = await this.getAlarm(logger);
    const target =
      outcome === MaintenanceOutcome.OutOfQueries
        ? now
        : nextAlarmAt(this.sql, now);
    if (target === null) return;
    if (current !== null && current < now - D1_FLUSH_INTERVAL_MS) {
      await this.setAlarm(logger, now);
      logger.info("do.alarm.stranded_repaired", { previousAlarmAt: current });
      return;
    }
    await this.setAlarmBy(logger, target);
  }

  private async normalizeRecord(
    envelope: IngestEnvelopePayload,
  ): Promise<NormalizeResult> {
    return normalizeIngestRecord(envelope, {
      visitorSalt: (day) => visitorSaltFor(this.sql, day, Date.now()),
      getVisitContext: this.getVisitContext.bind(this),
      findRecentVisitorSession: (input) =>
        findRecentVisitorSession(this.sql, input),
      insertBufferedCustomEvent: (input) =>
        insertBufferedCustomEvent(this.sql, input),
    });
  }

  private async handlePageview(
    record: NormalizedPageview,
    logger: InvocationLogger,
  ): Promise<void> {
    const now = toUnixSeconds(record.receivedAt);

    // A route change ends the page view it navigated from.
    const closedPrevious =
      record.previousVisitId && record.previousVisitStartedAt !== null
        ? this.sqlRun(
            `
              UPDATE buffered_visits
              SET status = 'complete',
                  last_activity_at = ?,
                  ended_at = ?,
                  finalized_at = ?,
                  duration_ms = ${ENGAGED_DURATION_AT_SQL},
                  scroll_depth = ${DEEPEST_SCROLL_DEPTH_SQL},
                  hidden_at = NULL,
                  duration_source = 'server',
                  dirty = 1,
                  buffer_revision = buffer_revision + 1,
                  updated_at = ?
              WHERE visit_id = ? AND status IN ('open', 'hidden_pending')
            `,
            record.startedAt,
            record.startedAt,
            record.startedAt,
            record.startedAt,
            record.startedAt,
            record.previousScrollDepth,
            record.previousScrollDepth,
            now,
            record.previousVisitId,
          )
        : 0;
    if (closedPrevious > 0) {
      logger.info("do.ingest.previous_visit_closed");
    }

    const inserted = insertVisit(this.sql, record);
    if (closedPrevious > 0 || inserted) await this.scheduleFlush(logger);
    if (!inserted) {
      logger.info("do.ingest.pageview_duplicate");
      return;
    }
    logger.info("do.ingest.pageview_buffered");
    await this.pushRealtimeRecord({
      id: record.visitId,
      eventType: "visit",
      eventKind: "pageview",
      eventAt: record.startedAt,
      siteId: record.siteId,
      traceId: record.traceId,
      receivedAt: record.receivedAt,
      visitId: record.visitId,
      sessionId: record.sessionId,
      startedAt: record.startedAt,
      previousVisitId: record.previousVisitId,
      previousVisitStartedAt: record.previousVisitStartedAt,
      pathname: record.pathname,
      queryString: record.queryString,
      hash: record.hashFragment,
      title: record.title,
      hostname: record.hostname,
      referrerUrl: record.referrerUrl,
      referrerHost: record.referrerHost,
      utmSource: record.utmSource,
      utmMedium: record.utmMedium,
      utmCampaign: record.utmCampaign,
      utmTerm: record.utmTerm,
      utmContent: record.utmContent,
      visitorId: record.visitorId,
      isEU: record.isEU,
      country: record.country,
      region: record.region,
      regionCode: record.regionCode,
      city: record.city,
      continent: record.continent,
      timezone: record.timezone,
      browser: record.browser,
      browserVersion: record.browserVersion,
      os: record.os,
      osVersion: record.osVersion,
      deviceType: record.deviceType,
      screenWidth: record.screenWidth,
      screenHeight: record.screenHeight,
      language: record.language,
      status: "open",
      visibilityState: "visible",
      latitude: record.latitude,
      longitude: record.longitude,
    });
    await this.pushBufferedCustomEventsForVisit(record);
  }

  private async pushBufferedCustomEventsForVisit(
    record: NormalizedPageview,
  ): Promise<void> {
    const pendingEvents = this.sql.sqlAll<{
      eventId: string;
      eventAt: number;
      receivedAt: number;
      sequence: number;
      eventName: string;
      propertiesJson: string | null;
    }>(
      `
        SELECT
          event_id AS eventId,
          occurred_at AS eventAt,
          received_at AS receivedAt,
          sequence,
          event_name AS eventName,
          properties_json AS propertiesJson
        FROM buffered_custom_events
        WHERE site_id = ? AND visit_id = ?
        ORDER BY occurred_at ASC, created_at ASC
      `,
      record.siteId,
      record.visitId,
    );

    for (const pending of pendingEvents) {
      if (getDurableObjectWebSockets(this.doState).length === 0) continue;
      await this.pushRealtimeRecord({
        id: pending.eventId,
        eventType: pending.eventName,
        eventKind: "custom_event",
        eventAt: pending.eventAt,
        siteId: record.siteId,
        traceId: record.traceId,
        receivedAt: pending.receivedAt,
        sequence: pending.sequence,
        eventId: pending.eventId,
        eventName: pending.eventName,
        propertiesJson: pending.propertiesJson,
        visitId: record.visitId,
        sessionId: record.sessionId,
        startedAt: record.startedAt,
        pathname: record.pathname,
        queryString: record.queryString,
        hash: record.hashFragment,
        title: record.title,
        hostname: record.hostname,
        referrerUrl: record.referrerUrl,
        referrerHost: record.referrerHost,
        utmSource: record.utmSource,
        utmMedium: record.utmMedium,
        utmCampaign: record.utmCampaign,
        utmTerm: record.utmTerm,
        utmContent: record.utmContent,
        visitorId: record.visitorId,
        isEU: record.isEU,
        country: record.country,
        region: record.region,
        regionCode: record.regionCode,
        city: record.city,
        continent: record.continent,
        timezone: record.timezone,
        browser: record.browser,
        browserVersion: record.browserVersion,
        os: record.os,
        osVersion: record.osVersion,
        deviceType: record.deviceType,
        screenWidth: record.screenWidth,
        screenHeight: record.screenHeight,
        language: record.language,
        status: "open",
        visibilityState: "visible",
        latitude: record.latitude,
        longitude: record.longitude,
      });
    }
  }

  private async handleLeave(
    record: NormalizedLeave,
    logger: InvocationLogger,
  ): Promise<void> {
    const visit = this.sql.sqlOne<{
      visitId: string;
      startedAt: number;
      visitorId: number;
      siteId: string;
      sessionId: number;
      pathname: string;
      queryString: string;
      hash: string;
      title: string;
      hostname: string;
      referrerUrl: string;
      referrerHost: string;
      utmSource: string;
      utmMedium: string;
      utmCampaign: string;
      utmTerm: string;
      utmContent: string;
      isEU: number;
      country: string;
      region: string;
      regionCode: string;
      city: string;
      continent: string;
      timezone: string;
      browser: string;
      browserVersion: string;
      os: string;
      osVersion: string;
      deviceType: string;
      language: string;
      screenWidth: number | null;
      screenHeight: number | null;
      endedAt: number | null;
      finalizedAt: number | null;
      durationMs: number | null;
      durationSource: string;
      exitReason: string;
      screenSize: string;
      latitude: number | null;
      longitude: number | null;
      status: string;
      hiddenAt: number | null;
      hiddenMs: number;
    }>(
      `
        SELECT visit_id AS visitId, started_at AS startedAt, visitor_id AS visitorId, site_id AS siteId,
               session_id AS sessionId, pathname, query_string AS queryString,
               hash_fragment AS hash, title, hostname,
               referrer_url AS referrerUrl, referrer_host AS referrerHost,
               utm_source AS utmSource, utm_medium AS utmMedium,
               utm_campaign AS utmCampaign, utm_term AS utmTerm,
               utm_content AS utmContent,
               is_eu AS isEU,
               country, region, region_code AS regionCode, city, continent, timezone,
               browser, browser_version AS browserVersion, os, os_version AS osVersion,
               device_type AS deviceType, language,
               screen_width AS screenWidth, screen_height AS screenHeight,
               CASE
                 WHEN screen_width IS NOT NULL AND screen_height IS NOT NULL
                   THEN CAST(screen_width AS TEXT) || 'x' || CAST(screen_height AS TEXT)
                 ELSE ''
               END AS screenSize,
               latitude, longitude, ended_at AS endedAt, finalized_at AS finalizedAt,
               duration_ms AS durationMs, duration_source AS durationSource,
               exit_reason AS exitReason,
               status, hidden_at AS hiddenAt, hidden_ms AS hiddenMs
        FROM buffered_visits
        WHERE site_id = ? AND visit_id = ? AND status IN ('open', 'hidden_pending')
        LIMIT 1
      `,
      record.siteId,
      record.visitId,
    );

    let closedVisit = false;
    let closedLeaveAt = record.leaveAt;
    let closedDurationMs: number | null = null;
    let closedDurationSource = "";
    let closedExitReason = "";
    if (visit) {
      const reportedLeaveAt = Math.max(record.leaveAt, visit.startedAt);
      const hiddenAt =
        typeof visit.hiddenAt === "number"
          ? Math.max(visit.hiddenAt, visit.startedAt)
          : null;
      const useHiddenFallback =
        hiddenAt !== null && reportedLeaveAt - hiddenAt > HIDDEN_LEAVE_GRACE_MS;
      const leaveAt = useHiddenFallback ? hiddenAt : reportedLeaveAt;
      closedLeaveAt = leaveAt;
      const durationMs = engagedDurationMs({
        startedAt: visit.startedAt,
        endAt: leaveAt,
        hiddenAt,
        hiddenMs: visit.hiddenMs,
      });
      const durationSource = useHiddenFallback ? "hidden" : "server";
      const exitReason = useHiddenFallback
        ? "hidden_timeout"
        : record.exitReason || "pagehide";
      closedDurationMs = durationMs;
      closedDurationSource = durationSource;
      closedExitReason = exitReason;

      const rowsWritten = this.sqlRun(
        `
          UPDATE buffered_visits
          SET status = 'complete',
              last_activity_at = ?,
              hidden_at = NULL,
              ended_at = ?,
              finalized_at = ?,
              duration_ms = ?,
              scroll_depth = ${DEEPEST_SCROLL_DEPTH_SQL},
              duration_source = ?,
              exit_reason = ?,
              dirty = 1,
              buffer_revision = buffer_revision + 1,
              updated_at = ?
          WHERE visit_id = ? AND status IN ('open', 'hidden_pending')
        `,
        leaveAt,
        leaveAt,
        leaveAt,
        durationMs,
        record.scrollDepth,
        record.scrollDepth,
        durationSource,
        exitReason,
        toUnixSeconds(record.receivedAt),
        visit.visitId,
      );
      closedVisit = rowsWritten > 0;
      logger.info(
        closedVisit ? "do.ingest.leave_closed" : "do.ingest.leave_race_lost",
      );
    }

    if (!visit || !closedVisit) {
      logger.info("do.ingest.leave_ignored");
      return;
    }
    await this.scheduleFlush(logger);

    if (!hasOpenVisitsForVisitor(this.sql, visit.siteId, visit.visitorId)) {
      await this.pushRealtimeRecord({
        id: `leave:${visit.visitId}`,
        eventType: WS_PRESENCE_LEAVE_EVENT,
        eventKind: "leave",
        eventAt: closedLeaveAt,
        siteId: visit.siteId,
        receivedAt: record.receivedAt,
        visitId: visit.visitId,
        sessionId: visit.sessionId,
        startedAt: visit.startedAt,
        pathname: visit.pathname,
        queryString: visit.queryString,
        hash: visit.hash,
        title: visit.title,
        hostname: visit.hostname,
        referrerUrl: visit.referrerUrl,
        referrerHost: visit.referrerHost,
        utmSource: visit.utmSource,
        utmMedium: visit.utmMedium,
        utmCampaign: visit.utmCampaign,
        utmTerm: visit.utmTerm,
        utmContent: visit.utmContent,
        visitorId: visit.visitorId,
        isEU: visit.isEU,
        country: visit.country,
        region: visit.region,
        regionCode: visit.regionCode,
        city: visit.city,
        continent: visit.continent,
        timezone: visit.timezone,
        browser: visit.browser,
        browserVersion: visit.browserVersion,
        os: visit.os,
        osVersion: visit.osVersion,
        deviceType: visit.deviceType,
        language: visit.language,
        screenWidth: visit.screenWidth,
        screenHeight: visit.screenHeight,
        status: "complete",
        hiddenAt: null,
        endedAt: closedLeaveAt,
        finalizedAt: closedLeaveAt,
        durationMs: closedDurationMs,
        durationSource: closedDurationSource,
        exitReason: closedExitReason,
        leaveAt: closedLeaveAt,
        latitude: visit.latitude,
        longitude: visit.longitude,
      });
    }
  }

  private async handleVisibility(
    record: NormalizedVisibility,
    logger: InvocationLogger,
  ): Promise<void> {
    // Hiding and showing a page view change only the buffer: D1 receives
    // the page view's state when it ends.
    const updatedAt = toUnixSeconds(record.receivedAt);
    if (record.visibilityState === "hidden") {
      let rowsWritten = this.sqlRun(
        `
          UPDATE buffered_visits
          SET status = 'hidden_pending',
              hidden_at = ?,
              scroll_depth = ${DEEPEST_SCROLL_DEPTH_SQL},
              last_activity_at = CASE WHEN last_activity_at > ? THEN last_activity_at ELSE ? END,
              updated_at = ?
          WHERE site_id = ?
            AND visit_id = ?
            AND status = 'open'
        `,
        record.eventAt,
        record.scrollDepth,
        record.scrollDepth,
        record.eventAt,
        record.eventAt,
        updatedAt,
        record.siteId,
        record.visitId,
      );
      if (rowsWritten === 0) {
        rowsWritten = this.sqlRun(
          `
            UPDATE buffered_visits
            SET hidden_at = COALESCE(hidden_at, ?),
                scroll_depth = ${DEEPEST_SCROLL_DEPTH_SQL},
                last_activity_at = CASE WHEN last_activity_at > ? THEN last_activity_at ELSE ? END,
                updated_at = ?
            WHERE site_id = ?
              AND visit_id = ?
              AND status = 'hidden_pending'
              AND (
                last_activity_at < ?
                OR (hidden_at IS NULL AND last_activity_at = ?)
              )
          `,
          record.eventAt,
          record.scrollDepth,
          record.scrollDepth,
          record.eventAt,
          record.eventAt,
          updatedAt,
          record.siteId,
          record.visitId,
          record.eventAt,
          record.eventAt,
        );
      }
      logger.info(
        rowsWritten > 0
          ? "do.ingest.visibility_hidden_buffered"
          : "do.ingest.visibility_hidden_ignored",
      );
      if (rowsWritten > 0) {
        // The alarm finishes the page view if the visitor doesn't come back.
        await this.setAlarmBy(logger, record.eventAt + HIDDEN_LEAVE_GRACE_MS);
        await this.pushVisibilityRealtimeRecord(record);
      }
      return;
    }

    const rowsWritten = this.sqlRun(
      `
        UPDATE buffered_visits
        SET status = 'open',
            hidden_ms = hidden_ms + CASE
              WHEN hidden_at IS NULL THEN 0
              ELSE MAX(0, ? - MAX(hidden_at, started_at))
            END,
            hidden_at = NULL,
            last_activity_at = CASE WHEN last_activity_at > ? THEN last_activity_at ELSE ? END,
            updated_at = ?
        WHERE site_id = ?
          AND visit_id = ?
          AND status = 'hidden_pending'
          AND (hidden_at IS NULL OR ? - hidden_at <= ?)
      `,
      record.eventAt,
      record.eventAt,
      record.eventAt,
      updatedAt,
      record.siteId,
      record.visitId,
      record.eventAt,
      HIDDEN_LEAVE_GRACE_MS,
    );
    logger.info(
      rowsWritten > 0
        ? "do.ingest.visibility_visible_restored"
        : "do.ingest.visibility_visible_ignored",
    );
    if (rowsWritten > 0) {
      await this.pushVisibilityRealtimeRecord(record);
    }
  }

  private async pushVisibilityRealtimeRecord(
    record: NormalizedVisibility,
  ): Promise<void> {
    const visit = await this.getVisitContext(record.siteId, record.visitId);
    if (!visit) return;

    await this.pushRealtimeRecord({
      id: `visibility:${record.visitId}:${record.eventAt}:${record.visibilityState}`,
      eventType: "visibility",
      eventKind: "visibility",
      eventAt: record.eventAt,
      siteId: record.siteId,
      traceId: record.traceId,
      receivedAt: record.receivedAt,
      visitId: visit.visitId,
      sessionId: visit.sessionId,
      startedAt: visit.startedAt,
      pathname: visit.pathname,
      queryString: visit.queryString,
      hash: visit.hashFragment,
      title: visit.title,
      hostname: visit.hostname,
      referrerUrl: visit.referrerUrl,
      referrerHost: visit.referrerHost,
      utmSource: visit.utmSource,
      utmMedium: visit.utmMedium,
      utmCampaign: visit.utmCampaign,
      utmTerm: visit.utmTerm,
      utmContent: visit.utmContent,
      visitorId: visit.visitorId,
      isEU: visit.isEU,
      country: visit.country,
      region: visit.region,
      regionCode: visit.regionCode,
      city: visit.city,
      continent: visit.continent,
      timezone: visit.timezone,
      browser: visit.browser,
      browserVersion: visit.browserVersion,
      os: visit.os,
      osVersion: visit.osVersion,
      deviceType: visit.deviceType,
      screenWidth: visit.screenWidth,
      screenHeight: visit.screenHeight,
      language: visit.language,
      status: record.visibilityState === "hidden" ? "hidden_pending" : "open",
      hiddenAt: record.visibilityState === "hidden" ? record.eventAt : null,
      visibilityState: record.visibilityState,
      latitude: visit.latitude,
      longitude: visit.longitude,
    });
  }

  private async handleCustomEvent(
    record: NormalizedCustomEvent,
    logger: InvocationLogger,
  ): Promise<void> {
    const inserted = insertCustomEvent(this.sql, record);
    if (!inserted) {
      logger.info("do.ingest.custom_event_duplicate");
      return;
    }
    logger.info("do.ingest.custom_event_buffered");
    updateOpenVisitActivity(this.sql, record.visitId, record.eventAt);
    await this.scheduleFlush(logger);
    await this.pushRealtimeRecord({
      id: record.eventId,
      eventType: record.eventName,
      eventKind: "custom_event",
      eventAt: record.eventAt,
      siteId: record.siteId,
      traceId: record.traceId,
      receivedAt: record.receivedAt,
      sequence: record.sequence,
      eventId: record.eventId,
      eventName: record.eventName,
      propertiesJson: propertiesJson(record.properties),
      visitId: record.visitId,
      sessionId: record.sessionId,
      startedAt: record.startedAt,
      pathname: record.pathname,
      queryString: record.queryString,
      hash: record.hashFragment,
      title: record.title,
      hostname: record.hostname,
      referrerUrl: record.referrerUrl,
      referrerHost: record.referrerHost,
      utmSource: record.utmSource,
      utmMedium: record.utmMedium,
      utmCampaign: record.utmCampaign,
      utmTerm: record.utmTerm,
      utmContent: record.utmContent,
      visitorId: record.visitorId,
      isEU: record.isEU,
      country: record.country,
      region: record.region,
      regionCode: record.regionCode,
      city: record.city,
      continent: record.continent,
      timezone: record.timezone,
      browser: record.browser,
      browserVersion: record.browserVersion,
      os: record.os,
      osVersion: record.osVersion,
      deviceType: record.deviceType,
      screenWidth: record.screenWidth,
      screenHeight: record.screenHeight,
      language: record.language,
      status: "open",
      visibilityState: "visible",
      latitude: record.latitude,
      longitude: record.longitude,
    });
  }

  private async getVisitContext(
    siteId: string,
    visitId: string,
  ): Promise<StoredOpenVisit | null> {
    const logger = currentInvocationLogger();
    return getVisitContextFromBufferStore(
      this.sql,
      createDatabaseRuntime(
        (logger ? instrumentEnv(this.doEnv, logger) : this.doEnv).DB,
      ),
      siteId,
      visitId,
    );
  }

  private async pushRealtimeRecord(
    record: RealtimeSnapshotRecord,
  ): Promise<void> {
    await pushRealtimeRecordToSockets(
      getDurableObjectWebSockets(this.doState),
      record,
    );
  }

  private async pushInitialSnapshotToSocket(
    socket: WebSocket,
    logger: InvocationLogger,
  ): Promise<boolean> {
    return pushInitialRealtimeSnapshot(
      {
        sqlAll: <T>(query: string, ...bindings: SqlBinding[]) =>
          this.sql.measuredSqlAll<T>(logger, query, ...bindings),
      },
      socket,
    );
  }

  private flushStoreContext(logger: InvocationLogger): IngestFlushContext {
    const db = new BudgetedDatabase(
      createDatabaseRuntime(instrumentEnv(this.doEnv, logger).DB),
      D1_QUERIES_PER_INVOCATION,
    );
    return {
      db,
      eventNameIds: this.eventNameIds,
      sqlAll: <T>(query: string, ...bindings: SqlBinding[]) =>
        this.sql.measuredSqlAll<T>(logger, query, ...bindings),
      sqlOne: <T>(query: string, ...bindings: SqlBinding[]) =>
        this.sql.measuredSqlOne<T>(logger, query, ...bindings),
      sqlRun: (query: string, ...bindings: SqlBinding[]) =>
        this.sql.measuredSqlRun(logger, query, ...bindings),
      readPersistedVisitRow: (siteId: string, visitId: string) =>
        readPersistedVisitRow(db, siteId, visitId),
      insertBufferedVisitRow: (row) => insertBufferedVisitRow(this.sql, row),
      hasOpenVisitsForVisitor: (siteId: string, visitorId: number) =>
        hasOpenVisitsForVisitor(this.sql, siteId, visitorId),
      pushRealtimeRecord: this.pushRealtimeRecord.bind(this),
      observability: logger,
    };
  }

  private async runMaintenance(
    logger: InvocationLogger,
  ): Promise<MaintenanceOutcome> {
    this.activeNowCache = null;
    return runMaintenance(this.flushStoreContext(logger));
  }
}
