/**
 * format — locale-aware formatters for the TrustFund domain (INR currency,
 * numbers, dates, percentages). Pure helpers, safe to unit test.
 */

/** Default locale used across the app. */
export const APP_LOCALE = 'en-IN';

const currencyFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const currencyPreciseFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(APP_LOCALE);

const percentFormatter = new Intl.NumberFormat(APP_LOCALE, {
  style: 'percent',
  maximumFractionDigits: 0,
});

/** Format an amount as INR whole rupees, e.g. 1250000 → "₹12,50,000". */
export function formatCurrency(amount: number | string): string {
  return currencyFormatter.format(toNumber(amount));
}

/** Format an amount with paise, e.g. for receipts. */
export function formatCurrencyPrecise(amount: number | string): string {
  return currencyPreciseFormatter.format(toNumber(amount));
}

/** Format a plain number, e.g. 10500 → "10,500". */
export function formatNumber(value: number | string): string {
  return numberFormatter.format(toNumber(value));
}

/** 0 → "0%", 0.42 → "42%". */
export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

/**
 * A backend amounts arrive as strings (Django Decimal). Ratio is capped to
 * 100% for campaign progress bars (e.g. raised 150% of goal → 100%).
 */
export function clampPercentage(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(Math.max(ratio, 0), 1);
}

/**
 * ISO → compact date, e.g. "2026-09-02" → "2 Sep 2026".
 * Invalid input returns the input unchanged rather than "Invalid Date".
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO → relative "today / yesterday / MM DD" style label for activity feeds. */
export function formatRelativeDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDay.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(iso);
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}