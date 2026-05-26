import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAllSettings } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { calculateLease } from '@/lib/lease';
import { formatUSD } from '@/lib/currency';
import { LeaseForm } from '@/components/lease/LeaseForm';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function LeasePage() {
  const userId = await requireUser();
  const settings = await getAllSettings(userId);
  const lease = calculateLease({
    status: settings['lease.status'],
    monthlyShare: settings['lease.monthlyShare'],
    endDate: settings['lease.endDate'],
    subletOffsetMonthly: settings['lease.subletOffsetMonthly'],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">NYC Lease</h1>
        <p className="text-sm text-muted-foreground">
          Track your remaining liability and what subletting or releasing saves.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={lease.status === 'released' ? 'income' : 'expense'}>
          {lease.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Ends {format(new Date(settings['lease.endDate']), 'MMM d, yyyy')}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Months remaining
            </p>
            <p className="tabular font-display text-3xl">{lease.monthsRemaining}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Effective monthly
            </p>
            <p className="tabular font-display text-3xl">
              {formatUSD(lease.effectiveMonthlyShare)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total liability
            </p>
            <p className="tabular font-display text-3xl text-expense">
              {formatUSD(lease.totalRemainingLiability)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update lease</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaseForm
            initial={{
              status: settings['lease.status'],
              monthlyShare: settings['lease.monthlyShare'],
              endDate: settings['lease.endDate'],
              subletOffsetMonthly: settings['lease.subletOffsetMonthly'],
            }}
          />
        </CardContent>
      </Card>

      <Alert>
        <AlertTitle>Heads-up</AlertTitle>
        <AlertDescription>
          The “release” scenario assumes you find a replacement tenant or the lease is formally
          assigned. If you walk away unilaterally, your share remains payable.
        </AlertDescription>
      </Alert>
    </div>
  );
}
