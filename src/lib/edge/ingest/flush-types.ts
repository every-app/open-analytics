import type { DatabaseRuntime } from "@/lib/db";
import type {
  InvocationLogger,
  InvocationPerformanceCounter,
} from "@/lib/edge/observability/logger";

import type { RealtimeSnapshotRecord } from "./normalize";
import type { BufferedVisitRow, SqlWriter } from "./types";
export interface IngestFlushContext extends SqlWriter {
  /** D1, counting the invocation's queries: it refuses one past the limit. */
  db: DatabaseRuntime;
  /** Custom event names' ids in D1, by site and name. */
  eventNameIds: Map<string, number>;
  readPersistedVisitRow(
    siteId: string,
    visitId: string,
  ): Promise<BufferedVisitRow | null>;
  insertBufferedVisitRow(row: BufferedVisitRow): void;
  hasOpenVisitsForVisitor(siteId: string, visitorId: number): boolean;
  pushRealtimeRecord(record: RealtimeSnapshotRecord): Promise<void>;
  /**
   * Owned by the DO invocation boundary.  Flush helpers only report stable
   * aggregate counters and event codes; they never emit their own logs.
   */
  observability?: Pick<
    InvocationLogger,
    "increment" | "info" | "warn" | "error"
  >;
}
/**
 * The site's key in D1. It never changes, so the Durable Object stores it
 * after the first flush and later flushes don't ask D1. The site's first
 * flush also creates its identity.
 */
export async function resolveSitePk(
  context: IngestFlushContext,
  siteId: string,
): Promise<number> {
  const stored = context.sqlOne<{ sitePk: number }>(
    "SELECT site_pk AS sitePk FROM site_pks WHERE site_id = ?",
    siteId,
  );
  if (stored) return stored.sitePk;

  await context.db.run({
    sql: `INSERT OR IGNORE INTO site_identities (site_id) VALUES (?)`,
    bindings: [siteId],
    tag: "ingest.site_identities.insert",
  });
  const identity = await context.db.first<{ sitePk: number }>({
    sql: `SELECT site_pk AS sitePk FROM site_identities WHERE site_id = ? LIMIT 1`,
    bindings: [siteId],
    tag: "ingest.site_identities.first",
  });
  if (!identity) {
    throw new Error(`Failed to resolve site identity for ${siteId}`);
  }
  context.sqlRun(
    "INSERT INTO site_pks (site_id, site_pk) VALUES (?, ?)",
    siteId,
    identity.sitePk,
  );
  return identity.sitePk;
}
export function recordFlushCounter(
  context: IngestFlushContext,
  counter: InvocationPerformanceCounter,
  amount = 1,
): void {
  context.observability?.increment(counter, amount);
}
