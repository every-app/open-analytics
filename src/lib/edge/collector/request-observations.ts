import { createDatabaseRuntime } from "@/lib/db";
import { requestIp } from "@/lib/edge/auth/collect-token";
import type { Env } from "@/lib/edge/types";

export type BlockedRequestCategory = "custom_block" | "bot" | "suspected_bot";

export interface BlockedRequest {
  request: Request;
  siteId: string;
  category: BlockedRequestCategory;
  reasons: readonly string[];
  kind?: string;
  hostname?: string;
  pathname?: string;
  origin: string | null;
}

/** How long observations are kept (analytics-retention.ts deletes older). */
export const REQUEST_OBSERVATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// A flood of blocked requests must not turn into a flood of D1 writes: past
// this many a minute per site and isolate, the rest go unrecorded.
const MAX_RECORDS_PER_SITE_MINUTE = 120;
const recorded = new Map<string, { minute: number; count: number }>();

function allowRecord(siteId: string, now: number): boolean {
  const minute = Math.floor(now / 60_000);
  const current = recorded.get(siteId);
  if (!current || current.minute !== minute) {
    if (recorded.size > 1_000) recorded.clear();
    recorded.set(siteId, { minute, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_RECORDS_PER_SITE_MINUTE;
}

/** The address's network, never the address: /24 for IPv4, /48 for IPv6. */
export function ipPrefix(ip: string): string {
  if (ip.includes(":")) {
    const groups = ip.split(":").filter(Boolean).slice(0, 3);
    return groups.length > 0 ? `${groups.join(":")}::/48` : "";
  }
  const octets = ip.split(".");
  return octets.length === 4 ? `${octets.slice(0, 3).join(".")}.0/24` : "";
}

function cfString(cf: Record<string, unknown>, key: string, max = 120) {
  const value = cf[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Records a refused /collect request for the Request Observation page. */
export function recordBlockedRequest(
  env: Pick<Env, "DB">,
  ctx: Pick<ExecutionContext, "waitUntil">,
  input: BlockedRequest,
): void {
  const now = Date.now();
  if (!input.siteId || !allowRecord(input.siteId, now)) return;
  const cf = ((input.request as Request & { cf?: unknown }).cf ?? {}) as Record<
    string,
    unknown
  >;
  const asn = typeof cf.asn === "number" ? cf.asn : null;
  const write = createDatabaseRuntime(env.DB)
    .run({
      sql: `
        INSERT INTO request_observations (
          site_id, received_at, category, reasons, kind, country, region, city,
          asn, as_organization, ip_prefix, user_agent, hostname, pathname, origin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      bindings: [
        input.siteId,
        now,
        input.category,
        input.reasons.join(",").slice(0, 500),
        (input.kind ?? "").slice(0, 40),
        cfString(cf, "country", 8),
        cfString(cf, "region"),
        cfString(cf, "city"),
        asn,
        cfString(cf, "asOrganization"),
        ipPrefix(requestIp(input.request)),
        (input.request.headers.get("user-agent") ?? "").slice(0, 300),
        (input.hostname ?? "").slice(0, 255),
        (input.pathname ?? "").slice(0, 500),
        (input.origin ?? "").slice(0, 255),
      ],
      tag: "collect.request_observations.insert",
    })
    .then(() => undefined)
    .catch(() => undefined);
  ctx.waitUntil(write);
}

export interface RequestObservationCount {
  value: string;
  count: number;
}

export interface RequestObservationSummary {
  sinceMs: number;
  total: number;
  byCategory: RequestObservationCount[];
  byReason: RequestObservationCount[];
  byCountry: RequestObservationCount[];
  byNetwork: RequestObservationCount[];
  byUserAgent: RequestObservationCount[];
  bySite: RequestObservationCount[];
  recent: Array<{
    receivedAt: number;
    siteId: string;
    category: string;
    reasons: string[];
    kind: string;
    country: string;
    city: string;
    asn: number | null;
    asOrganization: string;
    ipPrefix: string;
    userAgent: string;
    hostname: string;
    pathname: string;
  }>;
}

const TOP_LIMIT = 20;
const RECENT_LIMIT = 100;

/** Blocked traffic of the organization's sites since `sinceMs`. */
export async function readRequestObservationSummary(
  env: Pick<Env, "DB">,
  input: { sinceMs: number; teamId: string },
): Promise<RequestObservationSummary> {
  const db = createDatabaseRuntime(env.DB);
  const scope =
    "received_at >= ? AND site_id IN (SELECT id FROM sites WHERE team_id = ?)";
  const bindings = [input.sinceMs, input.teamId];
  const top = async (expression: string, tag: string) =>
    (
      await db.all<RequestObservationCount>({
        sql: `
          SELECT ${expression} AS value, COUNT(*) AS count
          FROM request_observations
          WHERE ${scope} AND ${expression} != ''
          GROUP BY value ORDER BY count DESC LIMIT ${TOP_LIMIT}
        `,
        bindings,
        tag: `admin.request_observations.${tag}`,
      })
    ).results;

  const [
    byCategory,
    byCountry,
    byNetwork,
    byUserAgent,
    bySite,
    reasons,
    recent,
  ] = await Promise.all([
    top("category", "by_category"),
    top("country", "by_country"),
    top(
      "CASE WHEN asn IS NULL THEN '' ELSE 'AS' || asn || ' ' || as_organization END",
      "by_network",
    ),
    top("user_agent", "by_user_agent"),
    top("site_id", "by_site"),
    db.all<{ reasons: string; count: number }>({
      sql: `
          SELECT reasons, COUNT(*) AS count FROM request_observations
          WHERE ${scope} GROUP BY reasons
        `,
      bindings,
      tag: "admin.request_observations.by_reasons",
    }),
    db.all<{
      receivedAt: number;
      siteId: string;
      category: string;
      reasons: string;
      kind: string;
      country: string;
      city: string;
      asn: number | null;
      asOrganization: string;
      ipPrefix: string;
      userAgent: string;
      hostname: string;
      pathname: string;
    }>({
      sql: `
          SELECT received_at AS receivedAt, site_id AS siteId, category,
                 reasons, kind, country, city, asn,
                 as_organization AS asOrganization, ip_prefix AS ipPrefix,
                 user_agent AS userAgent, hostname, pathname
          FROM request_observations
          WHERE ${scope}
          ORDER BY received_at DESC LIMIT ${RECENT_LIMIT}
        `,
      bindings,
      tag: "admin.request_observations.recent",
    }),
  ]);

  // One request can carry several reasons; count each.
  const reasonCounts = new Map<string, number>();
  for (const row of reasons.results) {
    for (const reason of row.reasons.split(",").filter(Boolean)) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + row.count);
    }
  }

  return {
    sinceMs: input.sinceMs,
    total: byCategory.reduce((sum, row) => sum + row.count, 0),
    byCategory,
    byReason: [...reasonCounts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_LIMIT),
    byCountry,
    byNetwork,
    byUserAgent,
    bySite,
    recent: recent.results.map((row) => ({
      ...row,
      reasons: row.reasons.split(",").filter(Boolean),
    })),
  };
}
