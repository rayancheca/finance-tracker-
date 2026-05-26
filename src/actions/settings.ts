'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { SETTINGS_SCHEMA, type SettingsKey, validateSetting } from '@/lib/validators';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

type Result<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function updateSetting(key: SettingsKey, value: unknown): Promise<Result> {
  const userId = await requireUser();
  if (!(key in SETTINGS_SCHEMA)) return { ok: false, error: 'Unknown setting key' };
  const parsed = validateSetting(key, value);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  await db
    .insert(settings)
    .values({ userId, key, value: parsed.data as unknown as object })
    .onConflictDoUpdate({
      target: [settings.userId, settings.key],
      set: { value: parsed.data as unknown as object, updatedAt: new Date() },
    });
  revalidatePath('/settings');
  revalidatePath('/tax-calculator');
  revalidatePath('/lease');
  revalidatePath('/');
  return { ok: true, data: null };
}

export async function updateSettingsBatch(
  entries: Array<{ key: SettingsKey; value: unknown }>,
): Promise<Result> {
  const userId = await requireUser();
  for (const e of entries) {
    if (!(e.key in SETTINGS_SCHEMA)) return { ok: false, error: `Unknown key: ${e.key}` };
    const parsed = validateSetting(e.key, e.value);
    if (!parsed.success) return { ok: false, error: `Invalid value for ${e.key}` };
    await db
      .insert(settings)
      .values({ userId, key: e.key, value: parsed.data as unknown as object })
      .onConflictDoUpdate({
        target: [settings.userId, settings.key],
        set: { value: parsed.data as unknown as object, updatedAt: new Date() },
      });
  }
  revalidatePath('/settings');
  revalidatePath('/tax-calculator');
  revalidatePath('/lease');
  revalidatePath('/');
  return { ok: true, data: null };
}
