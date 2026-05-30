'use server';

import { db } from '@/db';
import { transactions, categories, goals, goalContributions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { transactionInputSchema, transactionPatchSchema } from '@/lib/validators';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function assertCategoryMatchesType(
  userId: string,
  categoryId: string | null | undefined,
  type: 'income' | 'expense' | 'transfer',
): Promise<string | null> {
  if (!categoryId || type === 'transfer') return null;
  const [cat] = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!cat) return 'Category not found';
  if (type === 'income' && cat.kind !== 'income') {
    return 'Income transaction needs an income category';
  }
  if (type === 'expense' && cat.kind === 'income') {
    return 'Expense cannot use an income category';
  }
  return null;
}

export async function createTransaction(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = transactionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const data = parsed.data;
  const catErr = await assertCategoryMatchesType(userId, data.categoryId ?? null, data.type);
  if (catErr) return { ok: false, error: catErr };

  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      accountId: data.accountId,
      categoryId: data.type === 'transfer' ? null : (data.categoryId ?? null),
      transferAccountId: data.type === 'transfer' ? (data.transferAccountId ?? null) : null,
      date: data.date,
      amount: String(data.amount),
      type: data.type,
      merchant: data.merchant ?? null,
      description: data.description,
      notes: data.notes ?? null,
      tags: data.tags ?? [],
      isCleared: data.isCleared ?? true,
    })
    .returning();

  revalidatePath('/transactions');
  revalidatePath('/');
  revalidatePath('/reports/monthly');
  return { ok: true, data: row };
}

export async function updateTransaction(id: string, input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = transactionPatchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const data = parsed.data;

  const [row] = await db
    .update(transactions)
    .set({
      ...(data.accountId !== undefined && { accountId: data.accountId }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.transferAccountId !== undefined && { transferAccountId: data.transferAccountId }),
      ...(data.date !== undefined && { date: data.date }),
      ...(data.amount !== undefined && { amount: String(data.amount) }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.merchant !== undefined && { merchant: data.merchant }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.isCleared !== undefined && { isCleared: data.isCleared }),
      isManuallyEdited: true,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();

  revalidatePath('/transactions');
  revalidatePath('/');
  revalidatePath('/reports/monthly');
  return { ok: true, data: row };
}

export async function deleteTransaction(id: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true, data: null };
}

export async function bulkDeleteTransactions(ids: string[]): Promise<Result> {
  const userId = await requireUser();
  if (ids.length === 0) return { ok: true, data: 0 };
  await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true, data: ids.length };
}

export async function bulkUpdateCategory(ids: string[], categoryId: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .update(transactions)
    .set({ categoryId, isManuallyEdited: true, updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
  revalidatePath('/transactions');
  return { ok: true, data: ids.length };
}

export async function bulkSetCleared(ids: string[], cleared: boolean): Promise<Result> {
  const userId = await requireUser();
  await db
    .update(transactions)
    .set({ isCleared: cleared, updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
  revalidatePath('/transactions');
  return { ok: true, data: ids.length };
}

export interface ImportRow {
  accountId: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  merchant?: string | null;
  categoryId?: string | null;
}

export async function importTransactions(rows: ImportRow[]): Promise<Result<{ inserted: number; skipped: number }>> {
  const userId = await requireUser();
  if (rows.length === 0) return { ok: true, data: { inserted: 0, skipped: 0 } };

  let inserted = 0;
  for (const r of rows) {
    const dupes = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, r.accountId),
          eq(transactions.date, r.date),
          eq(transactions.amount, String(r.amount)),
          eq(transactions.description, r.description),
        ),
      )
      .limit(1);
    if (dupes.length > 0) continue;
    await db.insert(transactions).values({
      userId,
      accountId: r.accountId,
      categoryId: r.categoryId ?? null,
      date: r.date,
      amount: String(r.amount),
      type: r.type,
      merchant: r.merchant ?? null,
      description: r.description,
    });
    inserted++;
  }

  revalidatePath('/transactions');
  revalidatePath('/');
  return { ok: true, data: { inserted, skipped: rows.length - inserted } };
}
