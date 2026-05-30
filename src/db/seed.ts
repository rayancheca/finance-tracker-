import { db } from './index';
import { accounts, categories, goals, settings } from './schema';
import { eq } from 'drizzle-orm';
import { SETTINGS_DEFAULTS } from '@/lib/validators';

interface SeedAccount {
  name: string;
  type:
    | 'checking'
    | 'savings'
    | 'credit_card'
    | 'cash'
    | 'brokerage'
    | 'retirement'
    | 'other';
  institution: string | null;
  openingBalance: string;
  color?: string;
}

const DEFAULT_ACCOUNTS: SeedAccount[] = [
  { name: 'Chase Checking', type: 'checking', institution: 'Chase', openingBalance: '0', color: '#0F3D3E' },
  { name: 'Apple Savings', type: 'savings', institution: 'Apple', openingBalance: '0', color: '#1B8B4F' },
  { name: 'Apple Card', type: 'credit_card', institution: 'Apple', openingBalance: '0', color: '#3A3A38' },
  { name: 'Brokerage', type: 'brokerage', institution: null, openingBalance: '0', color: '#C9A227' },
  { name: 'Cash', type: 'cash', institution: null, openingBalance: '0', color: '#A8A89E' },
];

interface SeedCategory {
  group: string;
  name: string;
  kind: 'income' | 'expense' | 'savings' | 'transfer';
  monthlyBudget: string;
}

const DEFAULT_CATEGORIES: SeedCategory[] = [
  { group: 'Housing', name: 'Rent', kind: 'expense', monthlyBudget: '2200' },
  { group: 'Housing', name: 'Utilities', kind: 'expense', monthlyBudget: '120' },
  { group: 'Housing', name: 'Internet', kind: 'expense', monthlyBudget: '65' },
  { group: 'Housing', name: 'Renter’s insurance', kind: 'expense', monthlyBudget: '18' },
  { group: 'Housing', name: 'NYC lease share', kind: 'expense', monthlyBudget: '1499' },
  { group: 'Food', name: 'Groceries', kind: 'expense', monthlyBudget: '400' },
  { group: 'Food', name: 'Restaurants', kind: 'expense', monthlyBudget: '300' },
  { group: 'Food', name: 'Coffee', kind: 'expense', monthlyBudget: '60' },
  { group: 'Food', name: 'Delivery', kind: 'expense', monthlyBudget: '80' },
  { group: 'Transportation', name: 'Public transit', kind: 'expense', monthlyBudget: '115' },
  { group: 'Transportation', name: 'Rideshare', kind: 'expense', monthlyBudget: '120' },
  { group: 'Transportation', name: 'Bike / scooter', kind: 'expense', monthlyBudget: '30' },
  { group: 'Transportation', name: 'Car', kind: 'expense', monthlyBudget: '0' },
  { group: 'Health', name: 'Medical premiums', kind: 'expense', monthlyBudget: '0' },
  { group: 'Health', name: 'Co-pays / Rx', kind: 'expense', monthlyBudget: '40' },
  { group: 'Health', name: 'Gym', kind: 'expense', monthlyBudget: '50' },
  { group: 'Personal', name: 'Clothing', kind: 'expense', monthlyBudget: '80' },
  { group: 'Personal', name: 'Grooming', kind: 'expense', monthlyBudget: '50' },
  { group: 'Personal', name: 'Laundry', kind: 'expense', monthlyBudget: '30' },
  { group: 'Subscriptions', name: 'Streaming', kind: 'expense', monthlyBudget: '50' },
  { group: 'Subscriptions', name: 'iCloud / Drive', kind: 'expense', monthlyBudget: '12' },
  { group: 'Subscriptions', name: 'VPN / security', kind: 'expense', monthlyBudget: '8' },
  { group: 'Subscriptions', name: 'Other apps', kind: 'expense', monthlyBudget: '20' },
  { group: 'Entertainment', name: 'Events / nightlife', kind: 'expense', monthlyBudget: '150' },
  { group: 'Entertainment', name: 'Hobbies', kind: 'expense', monthlyBudget: '50' },
  { group: 'Phone', name: 'Cell phone', kind: 'expense', monthlyBudget: '65' },
  { group: 'Travel', name: 'Flights', kind: 'expense', monthlyBudget: '200' },
  { group: 'Travel', name: 'Hotels / Airbnb', kind: 'expense', monthlyBudget: '100' },
  { group: 'Education', name: 'Books / courses', kind: 'expense', monthlyBudget: '40' },
  { group: 'Education', name: 'Certifications', kind: 'expense', monthlyBudget: '60' },
  { group: 'Legal & Pro', name: 'Immigration attorney', kind: 'expense', monthlyBudget: '420' },
  { group: 'Legal & Pro', name: 'OPT / USCIS fees', kind: 'expense', monthlyBudget: '50' },
  { group: 'Family / Gifts', name: 'Gifts', kind: 'expense', monthlyBudget: '50' },
  { group: 'Family / Gifts', name: 'Transfers home', kind: 'expense', monthlyBudget: '0' },
  { group: 'Savings', name: 'Emergency fund', kind: 'savings', monthlyBudget: '800' },
  { group: 'Savings', name: 'Investments', kind: 'savings', monthlyBudget: '400' },
  { group: 'Savings', name: 'Retirement (401k/IRA)', kind: 'savings', monthlyBudget: '0' },
  { group: 'Miscellaneous', name: 'Buffer', kind: 'expense', monthlyBudget: '100' },
  { group: 'Income', name: 'Salary', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Bonus', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Side income', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Family / Gift', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Tax refund', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Interest / Investment', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Reimbursement', kind: 'income', monthlyBudget: '0' },
  { group: 'Income', name: 'Other', kind: 'income', monthlyBudget: '0' },
];

interface SeedGoal {
  name: string;
  targetAmount: string;
  targetDate: string;
  priority: number;
}

const DEFAULT_GOALS: SeedGoal[] = [
  { name: 'Emergency Fund (3 months)', targetAmount: '13500', targetDate: '2027-06-30', priority: 100 },
  { name: 'Immigration attorney retainer', targetAmount: '5000', targetDate: '2026-08-31', priority: 95 },
  { name: 'Miami move-in buffer', targetAmount: '4000', targetDate: '2026-07-15', priority: 90 },
  { name: 'MS Cybersecurity reserve', targetAmount: '50000', targetDate: '2027-08-01', priority: 80 },
  { name: 'Spain trip', targetAmount: '2500', targetDate: '2026-12-31', priority: 60 },
  { name: 'New laptop (M-series)', targetAmount: '3500', targetDate: '2027-01-31', priority: 40 },
];

/**
 * Seed default accounts, categories, goals, and settings for a newly-provisioned user.
 * Idempotent — only inserts rows where none exist for the user.
 */
export async function seedNewUser(userId: string): Promise<void> {
  const existingAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .limit(1);
  if (existingAccounts.length === 0) {
    await db.insert(accounts).values(
      DEFAULT_ACCOUNTS.map((a) => ({
        userId,
        name: a.name,
        type: a.type,
        institution: a.institution,
        openingBalance: a.openingBalance,
        color: a.color ?? null,
      })),
    );
  }

  const existingCats = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);
  if (existingCats.length === 0) {
    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        userId,
        name: c.name,
        group: c.group,
        kind: c.kind,
        monthlyBudget: c.monthlyBudget,
        sortOrder: i,
      })),
    );
  }

  const existingGoals = await db
    .select({ id: goals.id })
    .from(goals)
    .where(eq(goals.userId, userId))
    .limit(1);
  if (existingGoals.length === 0) {
    await db.insert(goals).values(
      DEFAULT_GOALS.map((g) => ({
        userId,
        name: g.name,
        targetAmount: g.targetAmount,
        targetDate: g.targetDate,
        priority: g.priority,
        status: 'active' as const,
      })),
    );
  }

  const existingSettings = await db
    .select({ id: settings.id })
    .from(settings)
    .where(eq(settings.userId, userId))
    .limit(1);
  if (existingSettings.length === 0) {
    const rows = Object.entries(SETTINGS_DEFAULTS).map(([key, value]) => ({
      userId,
      key,
      value,
    }));
    await db.insert(settings).values(rows);
  }
}
