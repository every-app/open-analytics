export interface SecretSource {
  MAIN_SECRET?: string;
}

export function rootSecret(source: SecretSource): string | null {
  return String(source.MAIN_SECRET || "").trim() || null;
}
