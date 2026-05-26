import { z } from 'zod';

export const accountTypeZ = z.enum([
  'checking',
  'savings',
  'credit_card',
  'cash',
  'brokerage',
  'retirement',
  'other',
]);

export const categoryKindZ = z.enum(['income', 'expense', 'savings', 'transfer']);
export const transactionTypeZ = z.enum(['income', 'expense', 'transfer']);
export const goalStatusZ = z.enum(['active', 'paused', 'completed', 'abandoned']);
export const recurrenceFreqZ = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually',
]);
export const leaseStatusZ = z.enum(['active', 'subletting', 'released']);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must be in YYYY-MM-DD format');

const positiveAmount = z.number().positive().max(1_000_000);
const nonNegAmount = z.number().min(0).max(1_000_000);

// ─── Account ───────────────────────────────────────────────────────

export const accountInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  type: accountTypeZ,
  currency: z.string().length(3).default('USD'),
  institution: z.string().max(80).nullable().optional(),
  last4: z.string().regex(/^\d{0,4}$/u).nullable().optional(),
  openingBalance: z.number().default(0),
  isActive: z.boolean().default(true),
  isHidden: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/u).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});
export type AccountInput = z.infer<typeof accountInputSchema>;

// ─── Category ──────────────────────────────────────────────────────

export const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(60),
  group: z.string().min(1).max(60),
  kind: categoryKindZ,
  monthlyBudget: nonNegAmount.default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/u).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  isArchived: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

// ─── Transaction ───────────────────────────────────────────────────

const transactionBaseSchema = z.object({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  transferAccountId: z.string().uuid().nullable().optional(),
  date: isoDate,
  amount: positiveAmount,
  type: transactionTypeZ,
  merchant: z.string().max(120).nullable().optional(),
  description: z.string().min(1).max(200),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(40)).default([]),
  isCleared: z.boolean().default(true),
});

export const transactionInputSchema = transactionBaseSchema.superRefine((val, ctx) => {
  if (val.type === 'transfer') {
    if (!val.transferAccountId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Transfer requires transferAccountId',
        path: ['transferAccountId'],
      });
    }
    if (val.transferAccountId === val.accountId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Transfer accounts must differ',
        path: ['transferAccountId'],
      });
    }
  } else {
    if (!val.categoryId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Category required for income / expense',
        path: ['categoryId'],
      });
    }
  }
});

export const transactionPatchSchema = transactionBaseSchema.partial();

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type TransactionPatch = z.infer<typeof transactionPatchSchema>;

// ─── Goal ──────────────────────────────────────────────────────────

export const goalInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  targetAmount: positiveAmount,
  currentAmount: nonNegAmount.default(0),
  targetDate: isoDate.nullable().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  status: goalStatusZ.default('active'),
  linkedAccountId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/u).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type GoalInput = z.infer<typeof goalInputSchema>;

export const goalContributionInputSchema = z.object({
  goalId: z.string().uuid(),
  date: isoDate,
  amount: positiveAmount,
  notes: z.string().max(500).nullable().optional(),
});
export type GoalContributionInput = z.infer<typeof goalContributionInputSchema>;

// ─── Net worth snapshot ────────────────────────────────────────────

export const snapshotInputSchema = z.object({
  id: z.string().uuid().optional(),
  date: isoDate,
  accountId: z.string().uuid(),
  balance: z.number(),
  notes: z.string().max(500).nullable().optional(),
});
export type SnapshotInput = z.infer<typeof snapshotInputSchema>;

// ─── Recurring transaction ─────────────────────────────────────────

export const recurringInputSchema = z.object({
  id: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(80),
  amount: positiveAmount,
  type: transactionTypeZ,
  frequency: recurrenceFreqZ,
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
  nextDueDate: isoDate,
  isActive: z.boolean().default(true),
  autoPost: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
});
export type RecurringInput = z.infer<typeof recurringInputSchema>;

// ─── Settings ──────────────────────────────────────────────────────

export const SETTINGS_SCHEMA = {
  'salary.annualGross': z.number().min(0),
  'salary.payFrequency': z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
  'salary.paychecksPerYear': z.number().int().min(1).max(52),
  'salary.employer': z.string().max(120),
  'salary.jobTitle': z.string().max(120),
  'salary.startDate': isoDate,
  'salary.state': z.string().length(2),
  'salary.sideIncomeMonthly': z.number().min(0),
  'tax.filingStatus': z.enum(['single', 'mfj', 'mfs', 'hoh']),
  'tax.standardDeduction': z.number().min(0),
  'tax.401kContribPct': z.number().min(0).max(100),
  'tax.healthPremiumMonthly': z.number().min(0),
  'tax.hsaContribAnnual': z.number().min(0),
  'lease.status': leaseStatusZ,
  'lease.monthlyShare': z.number().min(0),
  'lease.endDate': isoDate,
  'lease.subletOffsetMonthly': z.number().min(0),
  'housing.scenario': z.enum(['employer_provided', 'rent']),
  'housing.miamiRentMonthly': z.number().min(0),
  'app.currency': z.literal('USD'),
  'app.dateFormat': z.enum(['MM/dd/yyyy', 'yyyy-MM-dd', 'dd/MM/yyyy']),
  'app.theme': z.enum(['light', 'dark', 'system']),
  'app.firstDayOfMonth': z.number().int().min(1).max(28),
} as const;

export type SettingsKey = keyof typeof SETTINGS_SCHEMA;

export const SETTINGS_DEFAULTS: { [K in SettingsKey]: z.infer<(typeof SETTINGS_SCHEMA)[K]> } = {
  'salary.annualGross': 65000,
  'salary.payFrequency': 'biweekly',
  'salary.paychecksPerYear': 26,
  'salary.employer': 'IT Italian Trattoria',
  'salary.jobTitle': 'IT Manager',
  'salary.startDate': '2026-06-15',
  'salary.state': 'FL',
  'salary.sideIncomeMonthly': 0,
  'tax.filingStatus': 'single',
  'tax.standardDeduction': 15000,
  'tax.401kContribPct': 0,
  'tax.healthPremiumMonthly': 0,
  'tax.hsaContribAnnual': 0,
  'lease.status': 'active',
  'lease.monthlyShare': 1499,
  'lease.endDate': '2027-04-30',
  'lease.subletOffsetMonthly': 0,
  'housing.scenario': 'rent',
  'housing.miamiRentMonthly': 2200,
  'app.currency': 'USD',
  'app.dateFormat': 'MM/dd/yyyy',
  'app.theme': 'system',
  'app.firstDayOfMonth': 1,
};

export function validateSetting<K extends SettingsKey>(key: K, value: unknown) {
  return SETTINGS_SCHEMA[key].safeParse(value);
}
