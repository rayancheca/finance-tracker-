import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { getAllSettings } from '@/db/queries';
import { requireUser, ensureUserProvisioned } from '@/lib/auth';
import { currentUser } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const userId = await requireUser();
  const cu = await currentUser();
  const settings = await getAllSettings(userId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Salary, tax, lease, and app preferences. Computed values across the app reflect these.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Email:</span>{' '}
            {cu?.primaryEmailAddress?.emailAddress ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Name:</span>{' '}
            {[cu?.firstName, cu?.lastName].filter(Boolean).join(' ') || '—'}
          </div>
        </CardContent>
      </Card>

      <SettingsForm initial={settings} />
    </div>
  );
}
