import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

/**
 * Ensure the Clerk user exists in our local `users` table.
 * Idempotent — safe to call on every authenticated request.
 * Triggers initial seeding on first insert.
 */
export async function ensureUserProvisioned(): Promise<string> {
  const userId = await requireUser();
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses[0]?.emailAddress ?? '';
  const fullName =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(' ').trim() || cu?.username || null;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);

  if (existing.length === 0) {
    await db.insert(users).values({ id: userId, email, fullName }).onConflictDoNothing();
    const { seedNewUser } = await import('@/db/seed');
    await seedNewUser(userId);
  }

  return userId;
}
