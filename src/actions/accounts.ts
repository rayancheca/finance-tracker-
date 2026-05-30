'use server';

import { db } from '@/db';
import { accounts, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { accountInputSchema } from '@/lib/validators';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function createAccount(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const [row] = await db
    .insert(accounts)
    .values({
      userId,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency ?? 'USD',
      institution: parsed.data.institution ?? null,
      last4: parsed.data.last4 ?? null,
      openingBalance: String(parsed.data.openingBalance ?? 0),
      isActive: parsed.data.isActive ?? true,
      isHidden: parsed.data.isHidden ?? false,
      color: parsed.data.color ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true, data: row };
}

export async function updateAccount(id: string, input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = accountInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const data = parsed.data;
  const [row] = await db
    .update(accounts)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.institution !== undefined && { institution: data.institution }),
      ...(data.last4 !== undefined && { last4: data.last4 }),
      ...(data.openingBalance !== undefined && { openingBalance: String(data.openingBalance) }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.notes !== undefined && { notes: data.notes }),
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  revalidatePath('/accounts');
  revalidatePath('/');
  return { ok: true, data: row };
}

export async function archiveAccount(id: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .update(accounts)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  revalidatePath('/accounts');
  return { ok: true, data: null };
}

export async function deleteAccount(id: string): Promise<Result> {
  const userId = await requireUser();
  const txCount = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.accountId, id)))
    .limit(1);
  if (txCount.length > 0) {
    return { ok: false, error: 'Account has transactions. Archive instead.' };
  }
  await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  revalidatePath('/accounts');
  return { ok: true, data: null };
}
