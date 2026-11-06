export const SUPPORTED_LOCALES = ["en", "zh", "zh-tw", "ja"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "if_locale";

export function isValidLocale(
  value: string | null | undefined,
): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isValidLocale(value) ? value : DEFAULT_LOCALE;
}

/** The first supported language in an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  const preferred = (header ?? "")
    .split(",")
    .map((part) => part.trim().split(";")[0].trim().toLowerCase())
    .map((tag) => {
      if (
        tag === "zh-tw" ||
        tag === "zh-hk" ||
        tag === "zh-mo" ||
        tag.startsWith("zh-hant")
      ) {
        return "zh-tw";
      }
      return isValidLocale(tag) ? tag : tag.slice(0, 2);
    })
    .find(isValidLocale);
  return preferred ?? DEFAULT_LOCALE;
}

export function localeToHtmlLang(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  if (locale === "zh-tw") return "zh-TW";
  return locale;
}
