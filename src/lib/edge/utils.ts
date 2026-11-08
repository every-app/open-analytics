import { sha256Hex } from "@/lib/sha256";

export const TEN_MINUTES_MS = 10 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function coerceString(input: unknown, fallback = ""): string {
  if (typeof input !== "string") {
    return fallback;
  }
  return input;
}

export function coerceNumber(
  input: unknown,
  fallback: number | null = null,
): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string" && input.length > 0) {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function jsonCloneRecord(
  input: unknown,
): Record<string, unknown> | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function safeHostname(urlLike: string): string {
  if (!urlLike) return "";
  try {
    return new URL(urlLike).hostname;
  } catch {
    return "";
  }
}

function normalizeHostnameForComparison(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}

export function isSameHostname(left: string, right: string): boolean {
  const normalizedLeft = normalizeHostnameForComparison(left);
  const normalizedRight = normalizeHostnameForComparison(right);
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";

  if (!origin && !referer) return null;

  const requestHost = new URL(request.url).hostname;
  const sourceHost = origin ? safeHostname(origin) : safeHostname(referer);

  if (!sourceHost || !isSameHostname(requestHost, sourceHost)) {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
}

export function clampString(input: string, maxLen: number): string {
  if (input.length <= maxLen) {
    return input;
  }
  return input.slice(0, maxLen);
}

/**
 * How many hex digits of an id's SHA-256 make the stored id: 13, 52 bits,
 * so it stays below Number.MAX_SAFE_INTEGER. D1 returns integers as JS
 * numbers and binds no BigInt.
 */
export const ID_HEX_DIGITS = 13;

/**
 * A visitor or session id from its SHA-256 hex digest: the integer of its
 * first `ID_HEX_DIGITS` hex digits. The one mapping from a hex id to a
 * stored one: migration 0016 and the ingest buffer convert ids stored as
 * hex with it.
 */
export function idFromSha256Hex(hex: string): number {
  if (!/^[0-9a-f]{13,}$/.test(hex)) {
    throw new TypeError("Expected a lowercase SHA-256 hex digest.");
  }
  return Number.parseInt(hex.slice(0, ID_HEX_DIGITS), 16);
}

// The salt is random, kept only for its UTC day, and the site is part of the
// hash: a visitor gets a different id on every site and every day, and no
// past id can be recomputed once its day's salt is deleted.
export async function deriveVisitorId(input: {
  salt: string;
  siteId: string;
  ip: string;
  ua: string;
}): Promise<number> {
  return idFromSha256Hex(
    await sha256Hex([input.salt, input.siteId, input.ip, input.ua].join("|")),
  );
}

export async function deriveServerSessionId(input: {
  siteId: string;
  visitorId: number;
  visitId: string;
  startedAt: number;
}): Promise<number> {
  return idFromSha256Hex(
    await sha256Hex(
      [
        "server-session-v1",
        input.siteId,
        String(input.visitorId),
        input.visitId,
        String(Math.floor(input.startedAt)),
      ].join("|"),
    ),
  );
}

export function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
