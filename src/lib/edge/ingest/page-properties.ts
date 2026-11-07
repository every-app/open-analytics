/** Limits on a page view's custom properties. */
export const PAGE_PROPERTY_LIMITS = {
  count: 30,
  keyLength: 64,
  valueLength: 255,
} as const;

/**
 * A page view's custom properties from the tracker's `props`: flat string
 * pairs, trimmed, at most `count` of them in the order sent. A pair with an
 * empty key or value, a value that isn't a string, or a key over the limit
 * is dropped (cutting keys could merge two of them); a value over the limit
 * is cut to it.
 */
export function normalizePageProperties(
  input: unknown,
): Record<string, string> {
  const properties = new Map<string, string>();
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (properties.size >= PAGE_PROPERTY_LIMITS.count) break;
    const key = rawKey.trim();
    if (!key || key.length > PAGE_PROPERTY_LIMITS.keyLength) continue;
    if (typeof rawValue !== "string") continue;
    const value = rawValue.trim().slice(0, PAGE_PROPERTY_LIMITS.valueLength);
    if (value) properties.set(key, value);
  }
  // fromEntries defines own keys, so "__proto__" stays an ordinary key.
  return Object.fromEntries(properties);
}
