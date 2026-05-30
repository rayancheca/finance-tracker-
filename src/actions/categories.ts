'use server';

import { db } from '@/db';
import { categories, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { categoryInputSchema } from '@/lib/validators';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function createCategory(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  try {
    const [row] = await db
      .insert(categories)
      .values({
        userId,
        name: parsed.data.name,
        group: parsed.data.group,
        kind: parsed.data.kind,
        monthlyBudget: String(parsed.data.monthlyBudget ?? 0),
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
        isArchived: parsed.data.isArchived ?? false,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    revalidatePath('/categories');
    return { ok: true, data: row };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create category' };
  }
}

export async function updateCategory(id: string, input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = categoryInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const data = parsed.data;
  const [row] = await db
    .update(categories)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.group !== undefined && { group: data.group }),
      ...(data.kind !== undefined && { kind: data.kind }),
      ...(data.monthlyBudget !== undefined && { monthlyBudget: String(data.monthlyBudget) }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date(),
    })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();
  revalidatePath('/categories');
  return { ok: true, data: row };
}

export async function archiveCategory(id: string): Promise<Result> {
  const userId = await requireUser();
  await db
    .update(categories)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  revalidatePath('/categories');
  return { ok: true, data: null };
}

export async function reorderCategories(orderedIds: string[]): Promise<Result> {
  const userId = await requireUser();
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(categories)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(and(eq(categories.id, orderedIds[i]), eq(categories.userId, userId)));
  }
  revalidatePath('/categories');
  return { ok: true, data: null };
}

export async function deleteCategory(id: string): Promise<Result> {
  const userId = await requireUser();
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, id)))
    .limit(1);
  if (used.length > 0) {
    return { ok: false, error: 'Category is in use. Archive instead.' };
  }
  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  revalidatePath('/categories');
  return { ok: true, data: null };
}
