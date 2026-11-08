/** Limits on the custom properties of a page view or a custom event. */
export const PROPERTY_LIMITS = {
  count: 30,
  keyLength: 64,
  valueLength: 255,
} as const;

/**
 * A page view's or custom event's custom properties: flat key-value pairs,
 * as Plausible keeps them. A string, number or boolean value is kept as a
 * string, trimmed; an object, array or null is dropped, key by key, and the
 * rest are kept. At most `count` pairs are kept, in the order sent. A pair
 * with an empty key or value, or a key over the limit, is dropped (cutting
 * keys could merge two of them); a value over the limit is cut to it.
 */
export function normalizeProperties(input: unknown): Record<string, string> {
  const properties = new Map<string, string>();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (properties.size >= PROPERTY_LIMITS.count) break;
    const key = rawKey.trim();
    if (!key || key.length > PROPERTY_LIMITS.keyLength) continue;
    if (
      typeof rawValue !== "string" &&
      typeof rawValue !== "number" &&
      typeof rawValue !== "boolean"
    ) {
      continue;
    }
    const value = String(rawValue).trim().slice(0, PROPERTY_LIMITS.valueLength);
    if (value) properties.set(key, value);
  }
  // fromEntries defines own keys, so "__proto__" stays an ordinary key.
  return Object.fromEntries(properties);
}
