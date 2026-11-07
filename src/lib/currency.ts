/** The ISO 4217 currency codes the runtime knows, upper case: "USD", "EUR". */
export const CURRENCY_CODES: readonly string[] =
  Intl.supportedValuesOf("currency");

const CURRENCY_CODE_SET: ReadonlySet<string> = new Set(CURRENCY_CODES);

/** `input` as an upper-case ISO 4217 code, or null when it isn't one. */
export function currencyCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  return CURRENCY_CODE_SET.has(code) ? code : null;
}
