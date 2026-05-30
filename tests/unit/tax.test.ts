import { describe, expect, it } from 'vitest';
import { calculateTaxes, calculateFederalIncomeTax } from '@/lib/tax';

describe('calculateFederalIncomeTax', () => {
  it('returns 0 on zero taxable income', () => {
    expect(calculateFederalIncomeTax(0, 'single').total).toBe(0);
  });

  it('matches expected at $50,000 taxable (single)', () => {
    const res = calculateFederalIncomeTax(50000, 'single');
    // 10% on first 11925 = 1192.5
    // 12% on (48475 - 11925) = 36550 * 0.12 = 4386
    // 22% on (50000 - 48475) = 1525 * 0.22 = 335.5
    // total ≈ 5914
    expect(res.total).toBeCloseTo(5914, 0);
    expect(res.marginal).toBe(0.22);
  });

  it('hits the top bracket', () => {
    const res = calculateFederalIncomeTax(2_000_000, 'single');
    expect(res.marginal).toBe(0.37);
    expect(res.total).toBeGreaterThan(500_000);
  });
});

describe('calculateTaxes — default case ($65k FL single)', () => {
  const base = {
    grossAnnual: 65000,
    filingStatus: 'single' as const,
    standardDeduction: 15000,
    retirement401kPct: 0,
    healthPremiumMonthly: 0,
    hsaContribAnnual: 0,
    state: 'FL',
    paychecksPerYear: 26,
  };

  it('produces the workbook-expected net annual ≈ $54,114', () => {
    const r = calculateTaxes(base);
    expect(r.netAnnual).toBeGreaterThan(53800);
    expect(r.netAnnual).toBeLessThan(54400);
  });

  it('net monthly is about $4,500', () => {
    const r = calculateTaxes(base);
    expect(r.netMonthly).toBeGreaterThan(4400);
    expect(r.netMonthly).toBeLessThan(4600);
  });

  it('effective rate is ~16.75% within tolerance', () => {
    const r = calculateTaxes(base);
    expect(r.effectiveRate).toBeGreaterThan(0.16);
    expect(r.effectiveRate).toBeLessThan(0.18);
  });

  it('marginal bracket is 22%', () => {
    const r = calculateTaxes(base);
    expect(r.marginalBracket).toBe(0.22);
  });

  it('per-paycheck biweekly gross is $2,500', () => {
    const r = calculateTaxes(base);
    expect(r.perPaycheckGross).toBeCloseTo(2500, 0);
  });

  it('FL state tax is zero', () => {
    const r = calculateTaxes(base);
    expect(r.stateIncomeTax).toBe(0);
  });
});

describe('calculateTaxes — variants', () => {
  it('NY state adds state income tax', () => {
    const r = calculateTaxes({
      grossAnnual: 65000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'NY',
      paychecksPerYear: 26,
    });
    expect(r.stateIncomeTax).toBeGreaterThan(0);
  });

  it('401k pre-tax reduces taxable income', () => {
    const noK = calculateTaxes({
      grossAnnual: 65000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'FL',
      paychecksPerYear: 26,
    });
    const withK = calculateTaxes({
      grossAnnual: 65000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 10,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'FL',
      paychecksPerYear: 26,
    });
    expect(withK.federalIncomeTax).toBeLessThan(noK.federalIncomeTax);
    expect(withK.taxableIncome).toBeLessThan(noK.taxableIncome);
  });

  it('mfj uses different brackets', () => {
    const single = calculateTaxes({
      grossAnnual: 150000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'FL',
      paychecksPerYear: 26,
    });
    const mfj = calculateTaxes({
      grossAnnual: 150000,
      filingStatus: 'mfj',
      standardDeduction: 30000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'FL',
      paychecksPerYear: 26,
    });
    expect(mfj.federalIncomeTax).toBeLessThan(single.federalIncomeTax);
  });

  it('HSA reduces taxable income', () => {
    const a = calculateTaxes({
      grossAnnual: 65000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 0,
      state: 'FL',
      paychecksPerYear: 26,
    });
    const b = calculateTaxes({
      grossAnnual: 65000,
      filingStatus: 'single',
      standardDeduction: 15000,
      retirement401kPct: 0,
      healthPremiumMonthly: 0,
      hsaContribAnnual: 3000,
      state: 'FL',
      paychecksPerYear: 26,
    });
    expect(b.taxableIncome).toBeLessThan(a.taxableIncome);
  });
});
