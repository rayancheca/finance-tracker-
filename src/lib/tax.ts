/**
 * US federal + payroll + state tax estimation for 2025 brackets.
 * Single-user, informational only. Mirrors the source workbook's logic.
 */

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

export interface TaxInput {
  grossAnnual: number;
  filingStatus: FilingStatus;
  standardDeduction: number;
  retirement401kPct: number;
  healthPremiumMonthly: number;
  hsaContribAnnual: number;
  state: string;
  paychecksPerYear: number;
}

export interface TaxResult {
  gross: number;
  preTaxDeductions: number;
  taxableIncome: number;
  federalIncomeTax: number;
  federalBracketBreakdown: Array<{ rate: number; from: number; to: number; tax: number }>;
  socialSecurity: number;
  medicare: number;
  stateIncomeTax: number;
  totalTax: number;
  netAnnual: number;
  netMonthly: number;
  perPaycheckGross: number;
  perPaycheckNet: number;
  effectiveRate: number;
  marginalBracket: number;
}

// 2025 federal income tax brackets
const BRACKETS_2025: Record<FilingStatus, Array<[number, number]>> = {
  // [upper limit (Infinity for last), marginal rate]
  single: [
    [11925, 0.10],
    [48475, 0.12],
    [103350, 0.22],
    [197300, 0.24],
    [250525, 0.32],
    [626350, 0.35],
    [Infinity, 0.37],
  ],
  mfj: [
    [23850, 0.10],
    [96950, 0.12],
    [206700, 0.22],
    [394600, 0.24],
    [501050, 0.32],
    [751600, 0.35],
    [Infinity, 0.37],
  ],
  mfs: [
    [11925, 0.10],
    [48475, 0.12],
    [103350, 0.22],
    [197300, 0.24],
    [250525, 0.32],
    [375800, 0.35],
    [Infinity, 0.37],
  ],
  hoh: [
    [17000, 0.10],
    [64850, 0.12],
    [103350, 0.22],
    [197300, 0.24],
    [250500, 0.32],
    [626350, 0.35],
    [Infinity, 0.37],
  ],
};

// FICA
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE_2025 = 176100;
const MEDICARE_RATE = 0.0145;

// Simplified state income tax flat rates (effective approximations for v1)
const STATE_FLAT_RATES: Record<string, number> = {
  FL: 0,
  TX: 0,
  WA: 0,
  NV: 0,
  AK: 0,
  SD: 0,
  WY: 0,
  TN: 0,
  NH: 0,
  NY: 0.0633,
  NJ: 0.0537,
  CA: 0.093,
  MA: 0.05,
  PA: 0.0307,
  IL: 0.0495,
  CT: 0.0535,
  GA: 0.0539,
  NC: 0.045,
  VA: 0.0575,
};

export function calculateFederalIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
): { total: number; breakdown: TaxResult['federalBracketBreakdown']; marginal: number } {
  if (taxableIncome <= 0) {
    return { total: 0, breakdown: [], marginal: 0 };
  }

  const brackets = BRACKETS_2025[filingStatus];
  const breakdown: TaxResult['federalBracketBreakdown'] = [];
  let total = 0;
  let lower = 0;
  let marginal = 0;

  for (const [upper, rate] of brackets) {
    if (taxableIncome <= lower) break;
    const slice = Math.min(taxableIncome, upper) - lower;
    if (slice > 0) {
      const tax = slice * rate;
      breakdown.push({ rate, from: lower, to: Math.min(taxableIncome, upper), tax });
      total += tax;
      marginal = rate;
    }
    lower = upper;
  }

  return { total, breakdown, marginal };
}

export function calculateStateTax(taxableIncome: number, state: string): number {
  const rate = STATE_FLAT_RATES[state.toUpperCase()];
  if (rate === undefined) return 0;
  return Math.max(0, taxableIncome) * rate;
}

export function calculateTaxes(input: TaxInput): TaxResult {
  const gross = Math.max(0, input.grossAnnual);
  const retirement = gross * (Math.max(0, Math.min(100, input.retirement401kPct)) / 100);
  const health = Math.max(0, input.healthPremiumMonthly) * 12;
  const hsa = Math.max(0, input.hsaContribAnnual);
  const preTaxDeductions = retirement + health + hsa;

  const agiAdjusted = gross - preTaxDeductions;
  const taxableIncome = Math.max(0, agiAdjusted - Math.max(0, input.standardDeduction));

  const fed = calculateFederalIncomeTax(taxableIncome, input.filingStatus);
  const ssWages = Math.min(gross - health - hsa, SOCIAL_SECURITY_WAGE_BASE_2025);
  const socialSecurity = Math.max(0, ssWages) * SOCIAL_SECURITY_RATE;
  const medicare = Math.max(0, gross - health - hsa) * MEDICARE_RATE;

  const stateIncomeTax = calculateStateTax(taxableIncome, input.state);

  const totalTax = fed.total + socialSecurity + medicare + stateIncomeTax;
  const netAnnual = gross - preTaxDeductions - totalTax;
  const netMonthly = netAnnual / 12;
  const paychecks = Math.max(1, input.paychecksPerYear || 26);
  const perPaycheckGross = gross / paychecks;
  const perPaycheckNet = netAnnual / paychecks;
  const effectiveRate = gross > 0 ? totalTax / gross : 0;

  return {
    gross,
    preTaxDeductions,
    taxableIncome,
    federalIncomeTax: fed.total,
    federalBracketBreakdown: fed.breakdown,
    socialSecurity,
    medicare,
    stateIncomeTax,
    totalTax,
    netAnnual,
    netMonthly,
    perPaycheckGross,
    perPaycheckNet,
    effectiveRate,
    marginalBracket: fed.marginal,
  };
}
