import { describe, it, expect } from 'vitest';
import { calculateLease } from '@/lib/lease';

const fixedAsOf = new Date('2026-05-26');

describe('calculateLease', () => {
  it('active lease counts full liability', () => {
    const r = calculateLease({
      status: 'active',
      monthlyShare: 1499,
      endDate: '2027-04-30',
      subletOffsetMonthly: 0,
      asOf: fixedAsOf,
    });
    expect(r.monthsRemaining).toBe(11);
    expect(r.effectiveMonthlyShare).toBe(1499);
    expect(r.totalRemainingLiability).toBe(11 * 1499);
  });

  it('subletting subtracts offset from monthly share', () => {
    const r = calculateLease({
      status: 'subletting',
      monthlyShare: 1499,
      endDate: '2027-04-30',
      subletOffsetMonthly: 1000,
      asOf: fixedAsOf,
    });
    expect(r.effectiveMonthlyShare).toBe(499);
    expect(r.totalRemainingLiability).toBe(11 * 499);
  });

  it('subletting offset cannot exceed share', () => {
    const r = calculateLease({
      status: 'subletting',
      monthlyShare: 500,
      endDate: '2027-04-30',
      subletOffsetMonthly: 1000,
      asOf: fixedAsOf,
    });
    expect(r.effectiveMonthlyShare).toBe(0);
    expect(r.totalRemainingLiability).toBe(0);
  });

  it('released lease has zero remaining liability', () => {
    const r = calculateLease({
      status: 'released',
      monthlyShare: 1499,
      endDate: '2027-04-30',
      subletOffsetMonthly: 0,
      asOf: fixedAsOf,
    });
    expect(r.totalRemainingLiability).toBe(0);
  });

  it('past end date floors months at 0', () => {
    const r = calculateLease({
      status: 'active',
      monthlyShare: 1499,
      endDate: '2024-01-01',
      subletOffsetMonthly: 0,
      asOf: fixedAsOf,
    });
    expect(r.monthsRemaining).toBe(0);
    expect(r.totalRemainingLiability).toBe(0);
  });

  it('releaseSavings computes the saved months', () => {
    const r = calculateLease({
      status: 'active',
      monthlyShare: 1000,
      endDate: '2027-05-31',
      subletOffsetMonthly: 0,
      asOf: new Date('2026-05-31'),
    });
    const savings = r.releaseSavings(new Date('2026-11-30'));
    expect(savings).toBe(6 * 1000);
  });
});
