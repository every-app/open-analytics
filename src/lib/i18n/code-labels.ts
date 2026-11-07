import type { Locale } from "./config";

const COUNTRY_CODE_ALIAS: Record<string, string> = {
  UK: "GB",
};

export const COUNTRY_PRIMARY_LANGUAGE_CODE: Record<string, string> = {
  CN: "zh",
  HK: "zh-tw",
  MO: "zh-tw",
  TW: "zh-tw",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  JP: "ja",
  KR: "ko",
  FR: "fr",
  DE: "de",
  ES: "es",
  IT: "it",
  RU: "ru",
  BR: "pt",
  PT: "pt",
  ID: "id",
  TH: "th",
  VN: "vi",
  MY: "ms",
  SG: "en",
  IN: "hi",
};

const LANGUAGE_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    en: "English",
    zh: "Chinese",
    "zh-tw": "Traditional Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    de: "German",
    es: "Spanish",
    pt: "Portuguese",
    ru: "Russian",
    ar: "Arabic",
    it: "Italian",
    nl: "Dutch",
    tr: "Turkish",
    vi: "Vietnamese",
    th: "Thai",
    id: "Indonesian",
    ms: "Malay",
    hi: "Hindi",
  },
};

const countryNameFormatters = new Map<Locale, Intl.DisplayNames>();
const languageNameFormatters = new Map<Locale, Intl.DisplayNames>();

function getCountryFormatter(locale: Locale): Intl.DisplayNames | null {
  const cached = countryNameFormatters.get(locale);
  if (cached) return cached;
  try {
    const formatter = new Intl.DisplayNames([locale], {
      type: "region",
    });
    countryNameFormatters.set(locale, formatter);
    return formatter;
  } catch {
    return null;
  }
}

function getLanguageFormatter(locale: Locale): Intl.DisplayNames | null {
  const cached = languageNameFormatters.get(locale);
  if (cached) return cached;
  try {
    const formatter = new Intl.DisplayNames([locale], {
      type: "language",
    });
    languageNameFormatters.set(locale, formatter);
    return formatter;
  } catch {
    return null;
  }
}

function normalizeCountryCode(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "ZZ") return null;
  const canonical = COUNTRY_CODE_ALIAS[normalized] ?? normalized;
  return /^[A-Z]{2}$/.test(canonical) ? canonical : null;
}

function normalizeLanguageCode(raw: string): string | null {
  const normalized = raw.trim().replace(/_/g, "-");
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (
    lower === "zh-tw" ||
    lower === "zh-hk" ||
    lower === "zh-mo" ||
    lower.startsWith("zh-hant")
  ) {
    return "zh-tw";
  }
  const primary = lower.split("-")[0] ?? "";
  if (!primary) return null;
  return /^[a-z]{2,3}$/.test(primary) ? primary : null;
}

export function resolveCountryLabel(
  raw: string,
  locale: Locale,
  unknownLabel: string,
): { label: string; code: string | null } {
  const value = raw.trim();
  const code = normalizeCountryCode(value);
  if (!code) {
    return {
      label: value || unknownLabel,
      code: null,
    };
  }

  const formatter = getCountryFormatter(locale);
  const fromIntl = formatter?.of(code);
  if (fromIntl) {
    return { label: fromIntl, code };
  }

  return { label: code, code };
}

export function resolveLanguageLabel(
  raw: string,
  locale: Locale,
  unknownLabel: string,
): { label: string; code: string | null } {
  const value = raw.trim();
  const code = normalizeLanguageCode(value);
  if (!code) {
    return {
      label: value || unknownLabel,
      code: null,
    };
  }

  const fromTable = LANGUAGE_LABELS[locale][code];
  if (fromTable) {
    return { label: fromTable, code };
  }

  const formatter = getLanguageFormatter(locale);
  const fromIntl = formatter?.of(code);
  if (fromIntl) {
    return { label: fromIntl, code };
  }

  return { label: code, code };
}

export function resolveContinentLabel(
  raw: string,
  unknownLabel: string,
  labels: Record<string, string>,
): string {
  const value = raw.trim();
  if (!value) return unknownLabel;

  const normalized = value.toUpperCase().replace(/_/g, " ");
  const compacted = normalized.replace(/\s+/g, " ").trim();

  return labels[normalized] ?? labels[compacted] ?? value;
}

export function resolveCountryFlagCode(
  countryCode: string | null,
): string | null {
  if (!countryCode) return null;
  if (countryCode === "GB") return "GB-UKM";
  return countryCode;
}
