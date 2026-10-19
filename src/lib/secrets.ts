// The purpose strings feed key derivation: changing one rotates every value
// derived from it (visitor salts, collect tokens), so they keep their names.
export const SECRET_PURPOSES = {
  visitorDailySalt: "insightflare:visitor-daily-salt:v1",
  collectTokenSigning: "insightflare:collect-token-signing:v1",
} as const;

export interface SecretSource {
  MAIN_SECRET?: string;
  DAILY_SALT_SECRET?: string;
}

// Roots and purposes come from deployment configuration, not request input.
// Cache resolved values so hot requests avoid repeating HMAC key derivation.
const derivedSecretCache = new Map<string, string>();

function bytes(input: string): Uint8Array {
  const encoded = new TextEncoder().encode(input);
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}

function toArrayBuffer(input: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(input.length);
  out.set(input);
  return out.buffer;
}

function hex(input: Uint8Array): string {
  return Array.from(input)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizedSecret(value: unknown): string {
  return String(value || "").trim();
}

export function rootSecret(source: SecretSource): string | null {
  return (
    normalizedSecret(source.MAIN_SECRET) ||
    normalizedSecret(source.DAILY_SALT_SECRET) ||
    null
  );
}

export async function deriveSecret(
  root: string,
  purpose: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(bytes(root)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(bytes(purpose)),
  );
  return hex(new Uint8Array(signature));
}

async function cachedDerivedSecret(
  root: string,
  purpose: string,
): Promise<string> {
  const cacheKey = `${root.length}:${root}${purpose}`;
  const cached = derivedSecretCache.get(cacheKey);
  if (cached) return cached;

  const derived = await deriveSecret(root, purpose);
  derivedSecretCache.set(cacheKey, derived);
  return derived;
}

export async function visitorDailySaltSecret(
  source: SecretSource,
): Promise<string | null> {
  const root = rootSecret(source);
  return root
    ? cachedDerivedSecret(root, SECRET_PURPOSES.visitorDailySalt)
    : null;
}

export async function collectTokenSigningSecret(
  source: SecretSource,
): Promise<string | null> {
  const root = rootSecret(source);
  return root
    ? cachedDerivedSecret(root, SECRET_PURPOSES.collectTokenSigning)
    : null;
}
