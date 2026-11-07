import { sha256Hex } from "@/lib/sha256";

export const TEN_MINUTES_MS = 10 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const DEFAULT_SESSION_WINDOW_MINUTES = 30;
export const MAX_SESSION_WINDOW_MINUTES = 24 * 60;

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

// The salt is random, kept only for its UTC day, and the site is part of the
// hash: a visitor gets a different id on every site and every day, and no
// past id can be recomputed once its day's salt is deleted.
export async function deriveVisitorId(input: {
  salt: string;
  siteId: string;
  ip: string;
  ua: string;
}): Promise<string> {
  return sha256Hex([input.salt, input.siteId, input.ip, input.ua].join("|"));
}

export function resolveSessionWindowMinutes(input: {
  SESSION_WINDOW_MINUTES?: string;
}): number {
  const raw = Number(input.SESSION_WINDOW_MINUTES || "");
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_SESSION_WINDOW_MINUTES;
  }
  return Math.max(1, Math.min(MAX_SESSION_WINDOW_MINUTES, Math.floor(raw)));
}

export async function deriveServerSessionId(input: {
  siteId: string;
  visitorId: string;
  visitId: string;
  startedAt: number;
}): Promise<string> {
  return sha256Hex(
    [
      "server-session-v1",
      input.siteId,
      input.visitorId,
      input.visitId,
      String(Math.floor(input.startedAt)),
    ].join("|"),
  );
}

export function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
