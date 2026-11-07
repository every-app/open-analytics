import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

const NUMBER_LOCALES = {
  en: "en-US",
} satisfies Record<Locale, string>;

export function formatNotificationNumber(
  value: unknown,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return Math.trunc(number).toLocaleString(NUMBER_LOCALES[locale]);
}
