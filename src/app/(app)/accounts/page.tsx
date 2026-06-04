import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AccountDialog } from '@/components/accounts/AccountDialog';
import { getAccountBalances } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { Wallet, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const userId = await requireUser();
  const accs = await getAccountBalances(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Where your money lives. Auto-synced accounts show a ⚡ badge.
          </p>
        </div>
        <AccountDialog />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accs.map((a) => (
          <Link
            key={a.id}
            href={`/accounts/${a.id}`}
            className="rounded-xl transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full overflow-hidden">
              <div className="h-1.5" style={{ background: a.color ?? 'hsl(var(--primary))' }} />
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{a.name}</h3>
                      {a.isAutoSynced && (
                        <span title="Auto-synced">
                          <Zap className="h-3.5 w-3.5 text-accent" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.institution ?? a.type} {a.last4 ? `· ••${a.last4}` : ''}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {a.type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="tabular font-display text-2xl">{formatUSD(a.balance)}</div>
                {!a.isActive && (
                  <Badge variant="secondary" className="mt-1">
                    archived
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
        {accs.length === 0 && (
          <EmptyState
            icon={Wallet}
            heading="No accounts yet"
            subline="Accounts are seeded automatically on your first sign-in."
            className="col-span-full"
          />
        )}
      </div>
    </div>
  );
}
