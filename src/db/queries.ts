import { db } from './index';
import {
  accounts,
  categories,
  transactions,
  goals,
  netWorthSnapshots,
  settings,
  recurringTransactions,
  holdings,
} from './schema';
import { and, asc, desc, eq, gte, lte, sql, isNull, inArray } from 'drizzle-orm';
import { SETTINGS_DEFAULTS, type SettingsKey } from '@/lib/validators';
import {
  currentMonthRange,
  lastNMonths,
  toISODate,
  startOfMonth,
  endOfMonth,
  subMonths,
} from '@/lib/dates';

type Num = number;

export async function listAccounts(userId: string) {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.name));
}

export async function listCategories(userId: string) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.group), asc(categories.sortOrder), asc(categories.name));
}

export async function listTransactions(
  userId: string,
  opts: {
    from?: string;
    to?: string;
    accountId?: string;
    categoryId?: string;
    type?: 'income' | 'expense' | 'transfer';
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const conds = [eq(transactions.userId, userId)];
  if (opts.from) conds.push(gte(transactions.date, opts.from));
  if (opts.to) conds.push(lte(transactions.date, opts.to));
  if (opts.accountId) conds.push(eq(transactions.accountId, opts.accountId));
  if (opts.categoryId) conds.push(eq(transactions.categoryId, opts.categoryId));
  if (opts.type) conds.push(eq(transactions.type, opts.type));
  if (opts.search) {
    conds.push(
      sql`(${transactions.description} ILIKE ${'%' + opts.search + '%'} OR ${transactions.merchant} ILIKE ${'%' + opts.search + '%'})`,
    );
  }

  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      merchant: transactions.merchant,
      description: transactions.description,
      notes: transactions.notes,
      tags: transactions.tags,
      isCleared: transactions.isCleared,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      transferAccountId: transactions.transferAccountId,
      isManuallyEdited: transactions.isManuallyEdited,
      externalTransactionId: transactions.externalTransactionId,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryGroup: categories.group,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...conds))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(opts.limit ?? 100)
    .offset(opts.offset ?? 0);
}

export async function listGoals(userId: string) {
  return db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId))
    .orderBy(desc(goals.priority), asc(goals.name));
}

export async function listSnapshots(userId: string) {
  return db
    .select()
    .from(netWorthSnapshots)
    .where(eq(netWorthSnapshots.userId, userId))
    .orderBy(desc(netWorthSnapshots.date));
}

export async function listRecurring(userId: string) {
  return db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.userId, userId))
    .orderBy(asc(recurringTransactions.nextDueDate));
}

export async function listHoldings(userId: string) {
  return db
    .select({
      id: holdings.id,
      accountId: holdings.accountId,
      accountName: accounts.name,
      symbol: holdings.symbol,
      name: holdings.name,
      quantity: holdings.quantity,
      costBasis: holdings.costBasis,
      currentPrice: holdings.currentPrice,
      marketValue: holdings.marketValue,
      asOfDate: holdings.asOfDate,
    })
    .from(holdings)
    .leftJoin(accounts, eq(holdings.accountId, accounts.id))
    .where(eq(holdings.userId, userId))
    .orderBy(desc(holdings.marketValue));
}

export async function getSetting<K extends SettingsKey>(
  userId: string,
  key: K,
): Promise<(typeof SETTINGS_DEFAULTS)[K]> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .limit(1);
  if (row.length === 0) return SETTINGS_DEFAULTS[key];
  return row[0].value as (typeof SETTINGS_DEFAULTS)[K];
}

export async function getAllSettings(
  userId: string,
): Promise<typeof SETTINGS_DEFAULTS> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.userId, userId));
  const out = { ...SETTINGS_DEFAULTS };
  for (const r of rows) {
    if (r.key in out) {
      (out as Record<string, unknown>)[r.key] = r.value;
    }
  }
  return out;
}

export interface MonthlyTotals {
  income: number;
  expense: number;
  savings: number;
  cashFlow: number;
  savingsRate: number;
  topCategory: { id: string | null; name: string | null; amount: number };
}

export async function getMonthlyTotals(userId: string, asOf = new Date()): Promise<MonthlyTotals> {
  const { start, end } = currentMonthRange(asOf);
  const rows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryKind: categories.kind,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, toISODate(start)),
        lte(transactions.date, toISODate(end)),
      ),
    );

  let income = 0;
  let expense = 0;
  let savings = 0;
  const byCategory = new Map<string, { name: string; amount: Num }>();

  for (const r of rows) {
    const amt = parseFloat(r.amount);
    if (r.type === 'income') income += amt;
    else if (r.type === 'expense') {
      expense += amt;
      if (r.categoryKind === 'savings') savings += amt;
      if (r.categoryId && r.categoryName) {
        const prev = byCategory.get(r.categoryId) ?? { name: r.categoryName, amount: 0 };
        prev.amount += amt;
        byCategory.set(r.categoryId, prev);
      }
    }
  }

  let topCategory: MonthlyTotals['topCategory'] = { id: null, name: null, amount: 0 };
  for (const [id, c] of byCategory) {
    if (c.amount > topCategory.amount) topCategory = { id, name: c.name, amount: c.amount };
  }

  const cashFlow = income - expense;
  const savingsRate = income > 0 ? savings / income : 0;

  return { income, expense, savings, cashFlow, savingsRate, topCategory };
}

export async function getIncomeVsExpensesByMonth(userId: string, months = 6) {
  const range = lastNMonths(months);
  const start = range[0].start;
  const end = range[range.length - 1].end;

  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`.as('month'),
      type: transactions.type,
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, toISODate(start)),
        lte(transactions.date, toISODate(end)),
      ),
    )
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`, transactions.type);

  return range.map((r) => {
    const monthKey = toISODate(r.start).slice(0, 7);
    const income = rows
      .filter((x) => x.month === monthKey && x.type === 'income')
      .reduce((s, x) => s + parseFloat(x.total), 0);
    const expense = rows
      .filter((x) => x.month === monthKey && x.type === 'expense')
      .reduce((s, x) => s + parseFloat(x.total), 0);
    return { month: monthKey, label: r.label, income, expense, net: income - expense };
  });
}

export async function getExpenseBreakdown(userId: string, asOf = new Date()) {
  const { start, end } = currentMonthRange(asOf);
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      group: categories.group,
      color: categories.color,
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        gte(transactions.date, toISODate(start)),
        lte(transactions.date, toISODate(end)),
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.group, categories.color);

  return rows
    .filter((r) => r.name)
    .map((r) => ({
      name: r.name!,
      group: r.group ?? '',
      color: r.color ?? '#888',
      value: parseFloat(r.total),
    }))
    .sort((a, b) => b.value - a.value);
}

export async function getAccountBalances(userId: string) {
  const accs = await listAccounts(userId);
  const accIds = accs.map((a) => a.id);
  if (accIds.length === 0) return [] as Array<(typeof accs)[number] & { balance: number; computedBalance: number }>;

  const sums = await db
    .select({
      accountId: transactions.accountId,
      type: transactions.type,
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.accountId, accIds)))
    .groupBy(transactions.accountId, transactions.type);

  const transferOut = await db
    .select({
      accountId: transactions.accountId,
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'transfer'),
        inArray(transactions.accountId, accIds),
      ),
    )
    .groupBy(transactions.accountId);

  const transferIn = await db
    .select({
      transferAccountId: transactions.transferAccountId,
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'transfer'),
        inArray(transactions.transferAccountId, accIds),
      ),
    )
    .groupBy(transactions.transferAccountId);

  return accs.map((a) => {
    const opening = parseFloat(a.openingBalance);
    const inc = sums
      .filter((s) => s.accountId === a.id && s.type === 'income')
      .reduce((sum, s) => sum + parseFloat(s.total), 0);
    const exp = sums
      .filter((s) => s.accountId === a.id && s.type === 'expense')
      .reduce((sum, s) => sum + parseFloat(s.total), 0);
    const tOut = transferOut
      .filter((t) => t.accountId === a.id)
      .reduce((sum, t) => sum + parseFloat(t.total), 0);
    const tIn = transferIn
      .filter((t) => t.transferAccountId === a.id)
      .reduce((sum, t) => sum + parseFloat(t.total), 0);
    const computedBalance = opening + inc - exp - tOut + tIn;
    const live =
      a.lastReportedBalance && a.lastBalanceSync
        ? parseFloat(a.lastReportedBalance)
        : null;
    const fresh =
      a.lastBalanceSync &&
      Date.now() - new Date(a.lastBalanceSync).getTime() < 48 * 3600 * 1000;
    return { ...a, balance: fresh && live !== null ? live : computedBalance, computedBalance };
  });
}

export async function getNetWorthSeries(userId: string) {
  const snaps = await db
    .select({ date: netWorthSnapshots.date, balance: netWorthSnapshots.balance })
    .from(netWorthSnapshots)
    .where(eq(netWorthSnapshots.userId, userId))
    .orderBy(asc(netWorthSnapshots.date));

  const byDate = new Map<string, number>();
  for (const s of snaps) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + parseFloat(s.balance));
  }
  return Array.from(byDate.entries()).map(([date, total]) => ({ date, total }));
}

export async function getCashFlowLast12Months(userId: string) {
  return getIncomeVsExpensesByMonth(userId, 12);
}

export async function getMonthlyPivot(userId: string, year: number) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryGroup: categories.group,
      categoryKind: categories.kind,
      monthlyBudget: categories.monthlyBudget,
      month: sql<string>`to_char(${transactions.date}, 'MM')`.as('month'),
      total: sql<string>`sum(${transactions.amount})`.as('total'),
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .groupBy(
      transactions.categoryId,
      categories.name,
      categories.group,
      categories.kind,
      categories.monthlyBudget,
      sql`to_char(${transactions.date}, 'MM')`,
    );

  const byCat = new Map<
    string,
    {
      categoryId: string;
      name: string;
      group: string;
      kind: string;
      budget: number;
      months: number[];
    }
  >();
  for (const r of rows) {
    if (!r.categoryId || !r.categoryName) continue;
    let entry = byCat.get(r.categoryId);
    if (!entry) {
      entry = {
        categoryId: r.categoryId,
        name: r.categoryName,
        group: r.categoryGroup ?? '',
        kind: r.categoryKind ?? 'expense',
        budget: parseFloat(r.monthlyBudget ?? '0'),
        months: Array(12).fill(0),
      };
      byCat.set(r.categoryId, entry);
    }
    const m = parseInt(r.month, 10);
    if (m >= 1 && m <= 12) {
      entry.months[m - 1] += parseFloat(r.total);
    }
  }
  return Array.from(byCat.values()).sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.name.localeCompare(b.name);
  });
}

export { startOfMonth, endOfMonth, subMonths };
