import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AccountBalanceChart } from '@/components/accounts/AccountBalanceChart';
import { getAccountActivity, getAccountBalances, getAccountBalanceSeries } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser();
  const { id } = await params;

  const [balances, txns, series] = await Promise.all([
    getAccountBalances(userId),
    getAccountActivity(userId, id, 25),
    getAccountBalanceSeries(userId, id),
  ]);

  const account = balances.find((a) => a.id === id);
  if (!account) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
        <Link href="/accounts">
          <ChevronLeft className="mr-1 h-4 w-4" /> Accounts
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="h-1.5" style={{ background: account.color ?? 'hsl(var(--primary))' }} />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight">
                  {account.name}
                </h1>
                {account.isAutoSynced && (
                  <span title="Auto-synced">
                    <Zap className="h-4 w-4 text-accent" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {account.institution ?? account.type}
                {account.last4 ? ` · ••${account.last4}` : ''}
              </p>
            </div>
            <Badge variant="outline" className="capitalize">
              {account.type.replace('_', ' ')}
            </Badge>
          </div>
          <div className="tabular mt-4 font-display text-4xl">{formatUSD(account.balance)}</div>
          {!account.isActive && (
            <Badge variant="secondary" className="mt-2">
              archived
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance over time</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountBalanceChart data={series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txns.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular text-sm">
                      {format(new Date(r.date), 'MMM d')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.description}</div>
                      {r.merchant && (
                        <div className="text-xs text-muted-foreground">{r.merchant}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.type === 'transfer'
                          ? r.inbound
                            ? 'Transfer in'
                            : 'Transfer out'
                          : (r.categoryName ?? r.type)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'tabular text-right text-sm font-medium',
                        r.inbound ? 'text-income' : 'text-expense',
                      )}
                    >
                      {r.inbound ? '+' : '−'}
                      {formatUSD(parseFloat(r.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/transactions/${r.id}/edit`}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Edit
                      </Link>
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
