export function formatI18nTemplate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_full, key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * A template's pieces in order, literal text and placeholder names, for a
 * renderer that puts a node (code, a link) where a value goes.
 */
export function splitI18nTemplate(
  template: string,
): Array<{ text: string } | { placeholder: string }> {
  const parts: Array<{ text: string } | { placeholder: string }> = [];
  template.split(/\{(\w+)\}/g).forEach((part, index) => {
    if (index % 2 === 1) parts.push({ placeholder: part });
    else if (part) parts.push({ text: part });
  });
  return parts;
}
