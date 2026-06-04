'use server';

import { db } from '@/db';
import { holdings, accounts } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { holdingInputSchema } from '@/lib/validators';
import { fetchQuotes, type Quote } from '@/lib/marketData';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

const today = () => new Date().toISOString().slice(0, 10);

async function ownsAccount(userId: string, accountId: string): Promise<boolean> {
  const [a] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  return Boolean(a);
}

interface HoldingValues {
  userId: string;
  accountId: string;
  symbol: string;
  quantity: number;
  costBasis?: number | null;
  name?: string | null;
  quote?: Quote;
}

// Upsert one position, deriving market value from the live quote when available.
async function upsertHolding(v: HoldingValues) {
  const price = v.quote?.price ?? null;
  const marketValue = price != null ? v.quantity * price : 0;
  const base = {
    name: v.name ?? v.quote?.name ?? null,
    quantity: String(v.quantity),
    costBasis: v.costBasis != null ? String(v.costBasis) : null,
    currentPrice: price != null ? String(price) : null,
    marketValue: String(marketValue),
    currency: v.quote?.currency ?? 'USD',
    asOfDate: today(),
  };
  await db
    .insert(holdings)
    .values({ userId: v.userId, accountId: v.accountId, symbol: v.symbol, ...base })
    .onConflictDoUpdate({
      target: [holdings.accountId, holdings.symbol],
      set: { ...base, updatedAt: new Date() },
    });
}

export async function createHolding(
  input: unknown,
): Promise<Result<{ symbol: string; priced: boolean }>> {
  const userId = await requireUser();
  const parsed = holdingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  if (!(await ownsAccount(userId, d.accountId))) return { ok: false, error: 'Account not found' };

  const symbol = d.symbol.trim().toUpperCase();
  const quotes = await fetchQuotes([symbol]);
  await upsertHolding({
    userId,
    accountId: d.accountId,
    symbol,
    quantity: d.quantity,
    costBasis: d.costBasis ?? null,
    name: d.name ?? null,
    quote: quotes.get(symbol),
  });

  revalidatePath('/net-worth');
  return { ok: true, data: { symbol, priced: quotes.has(symbol) } };
}

export async function deleteHolding(id: string): Promise<Result> {
  const userId = await requireUser();
  await db.delete(holdings).where(and(eq(holdings.id, id), eq(holdings.userId, userId)));
  revalidatePath('/net-worth');
  return { ok: true, data: null };
}

export interface HoldingImportRow {
  symbol: string;
  quantity: number;
  costBasis?: number | null;
  name?: string | null;
}

export async function importHoldings(
  accountId: string,
  rows: HoldingImportRow[],
): Promise<Result<{ inserted: number; priced: number; skipped: number }>> {
  const userId = await requireUser();
  if (!(await ownsAccount(userId, accountId))) return { ok: false, error: 'Account not found' };

  const clean = rows
    .map((r) => ({ ...r, symbol: r.symbol?.trim().toUpperCase() ?? '' }))
    .filter((r) => r.symbol && Number.isFinite(r.quantity) && r.quantity > 0);
  const skipped = rows.length - clean.length;
  if (clean.length === 0) return { ok: true, data: { inserted: 0, priced: 0, skipped } };

  const quotes = await fetchQuotes(clean.map((r) => r.symbol));
  let inserted = 0;
  let priced = 0;
  for (const r of clean) {
    const quote = quotes.get(r.symbol);
    if (quote) priced += 1;
    await upsertHolding({
      userId,
      accountId,
      symbol: r.symbol,
      quantity: r.quantity,
      costBasis: r.costBasis ?? null,
      name: r.name ?? null,
      quote,
    });
    inserted += 1;
  }

  revalidatePath('/net-worth');
  return { ok: true, data: { inserted, priced, skipped } };
}

export async function refreshHoldingPrices(
  accountId?: string,
): Promise<Result<{ updated: number; unpriced: number }>> {
  const userId = await requireUser();
  const conds = [eq(holdings.userId, userId)];
  if (accountId) conds.push(eq(holdings.accountId, accountId));
  const rows = await db.select().from(holdings).where(and(...conds));
  if (rows.length === 0) return { ok: true, data: { updated: 0, unpriced: 0 } };

  const quotes = await fetchQuotes(rows.map((h) => h.symbol));
  let updated = 0;
  let unpriced = 0;
  for (const h of rows) {
    const quote = quotes.get(h.symbol.toUpperCase());
    if (!quote) {
      unpriced += 1;
      continue;
    }
    const marketValue = parseFloat(h.quantity) * quote.price;
    await db
      .update(holdings)
      .set({
        currentPrice: String(quote.price),
        marketValue: String(marketValue),
        currency: quote.currency,
        asOfDate: today(),
        updatedAt: new Date(),
      })
      .where(and(eq(holdings.id, h.id), eq(holdings.userId, userId)));
    updated += 1;
  }

  revalidatePath('/net-worth');
  return { ok: true, data: { updated, unpriced } };
}
