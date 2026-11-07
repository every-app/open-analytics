import { currencyCode } from "@/lib/currency";

/** A custom event's revenue as stored: both columns set, or both null. */
export interface EventRevenue {
  readonly revenueAmount: number | null;
  readonly revenueCurrency: string | null;
}

const NO_REVENUE: EventRevenue = { revenueAmount: null, revenueCurrency: null };
const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

function revenueAmount(input: unknown): number | null {
  const amount =
    typeof input === "number"
      ? input
      : typeof input === "string" && DECIMAL_STRING.test(input.trim())
        ? Number(input.trim())
        : Number.NaN;
  return Number.isFinite(amount) ? amount : null;
}

/**
 * The tracker's `revenue: { amount, currency }`. The amount is a finite
 * number or a decimal string, the currency an ISO 4217 code in any case.
 * When either is invalid the revenue is dropped; the event is kept.
 */
export function normalizeEventRevenue(input: unknown): EventRevenue {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NO_REVENUE;
  }
  const { amount, currency } = input as Record<string, unknown>;
  const revenueAmountValue = revenueAmount(amount);
  const revenueCurrency = currencyCode(currency);
  if (revenueAmountValue === null || revenueCurrency === null) {
    return NO_REVENUE;
  }
  return { revenueAmount: revenueAmountValue, revenueCurrency };
}
