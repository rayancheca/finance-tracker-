'use server';

import { db } from '@/db';
import { netWorthSnapshots, accounts, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { snapshotInputSchema } from '@/lib/validators';
import { and, eq, lte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function createSnapshot(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = snapshotInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  const [row] = await db
    .insert(netWorthSnapshots)
    .values({
      userId,
      date: d.date,
      accountId: d.accountId,
      balance: String(d.balance),
      notes: d.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [netWorthSnapshots.userId, netWorthSnapshots.date, netWorthSnapshots.accountId],
      set: { balance: String(d.balance), notes: d.notes ?? null },
    })
    .returning();
  revalidatePath('/net-worth');
  revalidatePath('/');
  return { ok: true, data: row };
}

export async function deleteSnapshot(id: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .delete(netWorthSnapshots)
    .where(and(eq(netWorthSnapshots.id, id), eq(netWorthSnapshots.userId, userId)));
  revalidatePath('/net-worth');
  return { ok: true, data: null };
}

export async function bulkSnapshotFromTransactions(date: string): Promise<Result<{ inserted: number }>> {
  const userId = await requireUser();
  const accs = await db.select().from(accounts).where(eq(accounts.userId, userId));
  let inserted = 0;
  for (const a of accs) {
    const sums = await db
      .select({
        type: transactions.type,
        total: sql<string>`sum(${transactions.amount})`.as('total'),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, a.id),
          lte(transactions.date, date),
        ),
      )
      .groupBy(transactions.type);
    let bal = parseFloat(a.openingBalance);
    for (const s of sums) {
      const v = parseFloat(s.total);
      if (s.type === 'income') bal += v;
      else if (s.type === 'expense') bal -= v;
    }
    await db
      .insert(netWorthSnapshots)
      .values({ userId, date, accountId: a.id, balance: String(bal) })
      .onConflictDoUpdate({
        target: [netWorthSnapshots.userId, netWorthSnapshots.date, netWorthSnapshots.accountId],
        set: { balance: String(bal) },
      });
    inserted++;
  }
  revalidatePath('/net-worth');
  return { ok: true, data: { inserted } };
}
