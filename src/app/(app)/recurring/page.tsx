import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listRecurring } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { format } from 'date-fns';

const FREQ_TO_MONTHLY: Record<string, number> = {
  daily: 30,
  weekly: 4.33,
  biweekly: 2.17,
  monthly: 1,
  quarterly: 1 / 3,
  annually: 1 / 12,
};

export const dynamic = 'force-dynamic';

export default async function RecurringPage() {
  const userId = await requireUser();
  const items = await listRecurring(userId);

  const monthlyTotal = items
    .filter((i) => i.isActive && i.type === 'expense')
    .reduce((s, i) => s + parseFloat(i.amount) * (FREQ_TO_MONTHLY[i.frequency] ?? 1), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Recurring</h1>
        <p className="text-sm text-muted-foreground">
          Subscriptions and recurring bills. Auto-post entries fire on their next due date.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Subscriptions cost
          </p>
          <p className="tabular font-display text-3xl">
            {formatUSD(monthlyTotal)} <span className="text-base text-muted-foreground">/mo</span>
          </p>
          <p className="text-xs text-muted-foreground">{formatUSD(monthlyTotal * 12)}/year</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No recurring entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="capitalize">{r.frequency}</TableCell>
                    <TableCell>{format(new Date(r.nextDueDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="tabular text-right">
                      {formatUSD(parseFloat(r.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>
                        {r.isActive ? 'active' : 'paused'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
