'use server';

import { db } from '@/db';
import { recurringTransactions, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { recurringInputSchema } from '@/lib/validators';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { and, eq, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { fromISODate, toISODate } from '@/lib/dates';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

function advance(d: Date, freq: string): Date {
  switch (freq) {
    case 'daily':
      return addDays(d, 1);
    case 'weekly':
      return addWeeks(d, 1);
    case 'biweekly':
      return addWeeks(d, 2);
    case 'monthly':
      return addMonths(d, 1);
    case 'quarterly':
      return addMonths(d, 3);
    case 'annually':
      return addYears(d, 1);
    default:
      return addMonths(d, 1);
  }
}

export async function createRecurring(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = recurringInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  const [row] = await db
    .insert(recurringTransactions)
    .values({
      userId,
      accountId: d.accountId,
      categoryId: d.categoryId ?? null,
      name: d.name,
      amount: String(d.amount),
      type: d.type,
      frequency: d.frequency,
      startDate: d.startDate,
      endDate: d.endDate ?? null,
      nextDueDate: d.nextDueDate,
      isActive: d.isActive ?? true,
      autoPost: d.autoPost ?? false,
      notes: d.notes ?? null,
    })
    .returning();
  revalidatePath('/recurring');
  return { ok: true, data: row };
}

export async function updateRecurring(id: string, input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = recurringInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  await db
    .update(recurringTransactions)
    .set({
      ...(d.accountId !== undefined && { accountId: d.accountId }),
      ...(d.categoryId !== undefined && { categoryId: d.categoryId }),
      ...(d.name !== undefined && { name: d.name }),
      ...(d.amount !== undefined && { amount: String(d.amount) }),
      ...(d.type !== undefined && { type: d.type }),
      ...(d.frequency !== undefined && { frequency: d.frequency }),
      ...(d.startDate !== undefined && { startDate: d.startDate }),
      ...(d.endDate !== undefined && { endDate: d.endDate }),
      ...(d.nextDueDate !== undefined && { nextDueDate: d.nextDueDate }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.autoPost !== undefined && { autoPost: d.autoPost }),
      ...(d.notes !== undefined && { notes: d.notes }),
      updatedAt: new Date(),
    })
    .where(
      and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)),
    );
  revalidatePath('/recurring');
  return { ok: true, data: null };
}

export async function deleteRecurring(id: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .delete(recurringTransactions)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
  revalidatePath('/recurring');
  return { ok: true, data: null };
}

export async function postRecurringNow(id: string): Promise<Result> {
  const userId = await requireUser();
  const [r] = await db
    .select()
    .from(recurringTransactions)
    .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
    .limit(1);
  if (!r) return { ok: false, error: 'Recurring entry not found' };

  await db.insert(transactions).values({
    userId,
    accountId: r.accountId,
    categoryId: r.categoryId ?? null,
    date: r.nextDueDate,
    amount: r.amount,
    type: r.type,
    description: r.name,
    recurringId: r.id,
  });

  const next = advance(fromISODate(r.nextDueDate), r.frequency);
  await db
    .update(recurringTransactions)
    .set({ nextDueDate: toISODate(next), updatedAt: new Date() })
    .where(eq(recurringTransactions.id, id));

  revalidatePath('/recurring');
  revalidatePath('/transactions');
  return { ok: true, data: null };
}

export async function postAllDueRecurring(): Promise<Result<{ posted: number }>> {
  const userId = await requireUser();
  const today = toISODate(new Date());
  const due = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
        eq(recurringTransactions.autoPost, true),
        lte(recurringTransactions.nextDueDate, today),
      ),
    );
  let posted = 0;
  for (const r of due) {
    await db.insert(transactions).values({
      userId,
      accountId: r.accountId,
      categoryId: r.categoryId ?? null,
      date: r.nextDueDate,
      amount: r.amount,
      type: r.type,
      description: r.name,
      recurringId: r.id,
    });
    const next = advance(fromISODate(r.nextDueDate), r.frequency);
    await db
      .update(recurringTransactions)
      .set({ nextDueDate: toISODate(next), updatedAt: new Date() })
      .where(eq(recurringTransactions.id, r.id));
    posted++;
  }
  revalidatePath('/recurring');
  revalidatePath('/transactions');
  return { ok: true, data: { posted } };
}
