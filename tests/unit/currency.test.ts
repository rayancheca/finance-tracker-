import { describe, it, expect } from 'vitest';
import { formatUSD, formatSignedUSD, formatPercent, parseAmount } from '@/lib/currency';

describe('formatUSD', () => {
  it('formats positive numbers', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56');
  });
  it('formats negatives', () => {
    expect(formatUSD(-50)).toBe('-$50.00');
  });
  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });
  it('handles strings', () => {
    expect(formatUSD('1234.5')).toBe('$1,234.50');
  });
  it('handles null/undefined', () => {
    expect(formatUSD(null)).toBe('$0.00');
    expect(formatUSD(undefined)).toBe('$0.00');
  });
  it('compact mode for large numbers', () => {
    expect(formatUSD(1_500_000, { compact: true })).toMatch(/M/);
  });
});

describe('formatSignedUSD', () => {
  it('prefixes positive numbers with +', () => {
    expect(formatSignedUSD(100)).toBe('+$100.00');
  });
  it('leaves negative numbers as-is', () => {
    expect(formatSignedUSD(-100)).toBe('-$100.00');
  });
});

describe('formatPercent', () => {
  it('formats fraction as percent', () => {
    expect(formatPercent(0.255)).toBe('25.5%');
  });
});

describe('parseAmount', () => {
  it('parses currency-formatted strings', () => {
    expect(parseAmount('$1,234.56')).toBe(1234.56);
  });
  it('returns null on empty/garbage input', () => {
    expect(parseAmount('')).toBe(null);
    expect(parseAmount('abc')).toBe(null);
  });
});
