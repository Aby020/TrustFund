import {
  clampPercentage,
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelativeDay,
} from './format';

describe('format — currency', () => {
  it('formats whole INR with en-IN grouping', () => {
    expect(formatCurrency(1250000)).toBe('₹12,50,000');
    expect(formatCurrency('1250000')).toBe('₹12,50,000');
  });

  it('formats with paise for precise amounts', () => {
    expect(formatCurrencyPrecise(1234.5)).toBe('₹1,234.50');
  });

  it('tolerates non-numeric strings', () => {
    expect(formatCurrency('nope')).toBe('₹0');
  });
});

describe('format — numbers and percents', () => {
  it('formats plain numbers', () => {
    expect(formatNumber(10500)).toBe('10,500');
  });

  it('formats a ratio as a whole percent', () => {
    expect(formatPercent(0.42)).toBe('42%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('clamps ratios to the [0, 1] chart range', () => {
    expect(clampPercentage(1.5)).toBe(1);
    expect(clampPercentage(-0.2)).toBe(0);
    expect(clampPercentage(0.42)).toBe(0.42);
    expect(clampPercentage(Number.NaN)).toBe(0);
  });
});

describe('format — dates', () => {
  it('renders compact dates from ISO strings', () => {
    // CLDR versions differ on the September abbreviation ("Sep" vs "Sept").
    const out = formatDate('2026-09-02');
    expect(out).toMatch(/^2 Sep(t)? 2026$/);
  });

  it('returns a dash for missing and the input for invalid values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('renders compact date and time from an ISO datetime', () => {
    // CLDR versions differ on the September abbreviation ("Sep" vs "Sept"),
    // and the rendered day follows the runner's local timezone — assert the
    // shape (Sep 2026, time in 12-hour form) rather than one exact value.
    const out = formatDateTime('2026-09-02T18:30:00Z');
    expect(out).toMatch(/^\d{1,2} Sep(t)? 2026, \d{1,2}:\d{2} (am|pm)$/);
  });

  it('returns a dash for missing datetimes', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });

  it('labels today and yesterday relatively', () => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(formatRelativeDay(today)).toBe('Today');

    const y = new Date(now.getTime() - 86_400_000);
    const yesterday = [
      y.getFullYear(),
      String(y.getMonth() + 1).padStart(2, '0'),
      String(y.getDate()).padStart(2, '0'),
    ].join('-');
    expect(formatRelativeDay(yesterday)).toBe('Yesterday');
  });
});