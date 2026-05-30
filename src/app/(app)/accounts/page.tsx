import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAccountBalances } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const userId = await requireUser();
  const accs = await getAccountBalances(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Where your money lives. Auto-synced accounts show a ⚡ badge.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accs.map((a) => (
          <Card key={a.id} className="overflow-hidden">
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
        ))}
        {accs.length === 0 && (
          <p className="text-sm text-muted-foreground">No accounts yet.</p>
        )}
      </div>
    </div>
  );
}
