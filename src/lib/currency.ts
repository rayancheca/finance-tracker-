const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatUSD(amount: number | string | null | undefined, opts?: { compact?: boolean }) {
  const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (Number.isNaN(value)) return '$0.00';
  return opts?.compact ? usdCompactFormatter.format(value) : usdFormatter.format(value);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '—';
  return percentFormatter.format(value);
}

export function formatSignedUSD(amount: number) {
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatUSD(amount)}`;
}

export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
