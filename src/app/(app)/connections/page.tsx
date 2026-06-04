import { Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/db';
import { aggregatorConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage() {
  const userId = await requireUser();
  const conns = await db
    .select()
    .from(aggregatorConnections)
    .where(eq(aggregatorConnections.userId, userId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Manage Plaid and SnapTrade connections that auto-sync your accounts.
        </p>
      </div>

      <Alert>
        <AlertTitle>Heads-up about auto-sync</AlertTitle>
        <AlertDescription>
          Plaid and Robinhood (via SnapTrade) can lag, miss recurring transactions, or temporarily
          disconnect when your bank updates its security. Treat synced data as a starting point and
          review categorizations. Your manual edits always win over future sync updates.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        {conns.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="p-0">
              <EmptyState
                icon={Plug}
                heading="No connections yet"
                subline={
                  <>
                    Plaid (banks/cards/brokerages) and SnapTrade (Robinhood) integration is wired
                    but requires API keys. Set <code>PLAID_*</code> and <code>SNAPTRADE_*</code> env
                    vars and enable Phase 11.5 to connect.
                  </>
                }
              />
            </CardContent>
          </Card>
        ) : (
          conns.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {c.institutionName}
                  <Badge variant="outline">{c.provider}</Badge>
                  <Badge
                    variant={
                      c.status === 'active'
                        ? 'income'
                        : c.status === 'needs_reauth'
                          ? 'expense'
                          : 'secondary'
                    }
                  >
                    {c.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Last sync:{' '}
                {c.lastSyncedAt
                  ? format(new Date(c.lastSyncedAt), 'MMM d, yyyy h:mm a')
                  : 'never'}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
