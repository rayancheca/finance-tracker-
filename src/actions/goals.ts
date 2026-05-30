'use server';

import { db } from '@/db';
import { goals, goalContributions } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { goalInputSchema, goalContributionInputSchema } from '@/lib/validators';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function createGoal(input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      name: d.name,
      targetAmount: String(d.targetAmount),
      currentAmount: String(d.currentAmount ?? 0),
      targetDate: d.targetDate ?? null,
      priority: d.priority ?? 0,
      status: d.status ?? 'active',
      linkedAccountId: d.linkedAccountId ?? null,
      color: d.color ?? null,
      icon: d.icon ?? null,
      notes: d.notes ?? null,
    })
    .returning();
  revalidatePath('/goals');
  revalidatePath('/');
  return { ok: true, data: row };
}

export async function updateGoal(id: string, input: unknown): Promise<Result> {
  const userId = await requireUser();
  const parsed = goalInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;
  const [row] = await db
    .update(goals)
    .set({
      ...(d.name !== undefined && { name: d.name }),
      ...(d.targetAmount !== undefined && { targetAmount: String(d.targetAmount) }),
      ...(d.currentAmount !== undefined && { currentAmount: String(d.currentAmount) }),
      ...(d.targetDate !== undefined && { targetDate: d.targetDate }),
      ...(d.priority !== undefined && { priority: d.priority }),
      ...(d.status !== undefined && { status: d.status }),
      ...(d.linkedAccountId !== undefined && { linkedAccountId: d.linkedAccountId }),
      ...(d.color !== undefined && { color: d.color }),
      ...(d.icon !== undefined && { icon: d.icon }),
      ...(d.notes !== undefined && { notes: d.notes }),
      updatedAt: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning();
  revalidatePath('/goals');
  revalidatePath(`/goals/${id}`);
  return { ok: true, data: row };
}

export async function deleteGoal(id: string): Promise<Result> {
  const userId = await requireUser();
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  revalidatePath('/goals');
  return { ok: true, data: null };
}

export async function setGoalStatus(
  id: string,
  status: 'active' | 'paused' | 'completed' | 'abandoned',
): Promise<Result> {
  const userId = await requireUser();
  await db
    .update(goals)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  revalidatePath('/goals');
  return { ok: true, data: null };
}

export async function contributeToGoal(
  input: unknown,
): Promise<Result<{ achieved: boolean; newAmount: number }>> {
  const userId = await requireUser();
  const parsed = goalContributionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const d = parsed.data;

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, d.goalId), eq(goals.userId, userId)))
    .limit(1);
  if (!goal) return { ok: false, error: 'Goal not found' };

  await db.insert(goalContributions).values({
    goalId: d.goalId,
    date: d.date,
    amount: String(d.amount),
    notes: d.notes ?? null,
  });

  const newAmount = parseFloat(goal.currentAmount) + d.amount;
  const target = parseFloat(goal.targetAmount);
  const achieved = newAmount >= target && goal.status !== 'completed';

  await db
    .update(goals)
    .set({
      currentAmount: String(newAmount),
      status: achieved ? 'completed' : goal.status,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, d.goalId));

  revalidatePath('/goals');
  revalidatePath(`/goals/${d.goalId}`);
  revalidatePath('/');
  return { ok: true, data: { achieved, newAmount } };
}
