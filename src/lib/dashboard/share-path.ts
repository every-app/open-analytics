export function sharePath(slug: string, section?: string) {
  const base = `/share/${encodeURIComponent(slug)}`;
  return section ? `${base}/${section}` : base;
}
