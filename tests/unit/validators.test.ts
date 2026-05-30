import { describe, it, expect } from 'vitest';
import {
  transactionInputSchema,
  goalInputSchema,
  accountInputSchema,
  validateSetting,
} from '@/lib/validators';

describe('transactionInputSchema', () => {
  it('accepts a valid expense', () => {
    const r = transactionInputSchema.safeParse({
      accountId: '00000000-0000-0000-0000-000000000001',
      categoryId: '00000000-0000-0000-0000-000000000002',
      date: '2026-05-26',
      amount: 12.34,
      type: 'expense',
      description: 'Lunch',
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative amount', () => {
    const r = transactionInputSchema.safeParse({
      accountId: '00000000-0000-0000-0000-000000000001',
      categoryId: '00000000-0000-0000-0000-000000000002',
      date: '2026-05-26',
      amount: -10,
      type: 'expense',
      description: 'Lunch',
    });
    expect(r.success).toBe(false);
  });

  it('rejects transfer without transferAccountId', () => {
    const r = transactionInputSchema.safeParse({
      accountId: '00000000-0000-0000-0000-000000000001',
      date: '2026-05-26',
      amount: 10,
      type: 'transfer',
      description: 'Transfer',
    });
    expect(r.success).toBe(false);
  });

  it('rejects same-account transfer', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    const r = transactionInputSchema.safeParse({
      accountId: id,
      transferAccountId: id,
      date: '2026-05-26',
      amount: 10,
      type: 'transfer',
      description: 'Transfer',
    });
    expect(r.success).toBe(false);
  });
});

describe('goalInputSchema', () => {
  it('requires positive target', () => {
    const r = goalInputSchema.safeParse({ name: 'x', targetAmount: 0 });
    expect(r.success).toBe(false);
  });
});

describe('accountInputSchema', () => {
  it('accepts a checking account', () => {
    const r = accountInputSchema.safeParse({ name: 'Test', type: 'checking' });
    expect(r.success).toBe(true);
  });
});

describe('validateSetting', () => {
  it('accepts valid filing status', () => {
    const r = validateSetting('tax.filingStatus', 'single');
    expect(r.success).toBe(true);
  });
  it('rejects unknown filing status', () => {
    const r = validateSetting('tax.filingStatus', 'unknown');
    expect(r.success).toBe(false);
  });
});
