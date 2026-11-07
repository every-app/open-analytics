/**
 * Custom properties are named by JSON pointers, as event payload paths are:
 * a page view's property, and an event payload's top-level key, `key` is at
 * `/key`.
 */
export function propertyPath(key: string): string {
  return `/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}

/** The key a top-level JSON pointer names; null for a nested path. */
export function propertyKeyOf(path: string): string | null {
  if (!path.startsWith("/")) return null;
  const segment = path.slice(1);
  if (segment.includes("/")) return null;
  return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}
