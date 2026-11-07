import type { Locale } from "@/lib/i18n/config";

const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
};

const DURATION_UNITS: Record<
  Locale,
  {
    second: string;
    minute: string;
    hour: string;
    join: string;
  }
> = {
  en: {
    second: "s",
    minute: "m",
    hour: "h",
    join: " ",
  },
};

const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();
const PERCENT_FORMATTERS = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: Locale): Intl.NumberFormat {
  const key = intlLocale(locale);
  const cached = NUMBER_FORMATTERS.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(key);
  NUMBER_FORMATTERS.set(key, formatter);
  return formatter;
}

function getPercentFormatter(locale: Locale): Intl.NumberFormat {
  const key = intlLocale(locale);
  const cached = PERCENT_FORMATTERS.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(key, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  PERCENT_FORMATTERS.set(key, formatter);
  return formatter;
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

export function numberFormat(locale: Locale, value: number): string {
  return getNumberFormatter(locale).format(value);
}

export function percentFormat(locale: Locale, value: number): string {
  return getPercentFormatter(locale).format(value);
}

/** An amount in an ISO 4217 currency, e.g. "$1,234.50" for USD. */
export function currencyFormat(
  locale: Locale,
  value: number,
  currency: string,
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
  }).format(value);
}

type DateValue = number | string | Date | null | undefined;

function toValidDate(value: DateValue): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      if (numeric <= 0) return null;
      const date = new Date(numeric);
      return Number.isFinite(date.getTime()) ? date : null;
    }

    const date = new Date(trimmed);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
}

/**
 * A date and time to the minute, in the given zone. The zone is required:
 * text rendered on the server and again in the browser must name the same
 * zone, or hydration fails.
 */
export function shortDateTime(
  locale: Locale,
  value: DateValue,
  timeZone: string,
): string {
  const date = toValidDate(value);
  if (!date) return "--";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function durationFormat(locale: Locale, ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const unit = DURATION_UNITS[locale];

  if (seconds < 60) {
    return `${seconds}${unit.second}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  if (minutes < 60) {
    if (remain === 0) return `${minutes}${unit.minute}`;
    return `${minutes}${unit.minute}${unit.join}${remain}${unit.second}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (remainMinutes === 0) return `${hours}${unit.hour}`;
  return `${hours}${unit.hour}${unit.join}${remainMinutes}${unit.minute}`;
}
