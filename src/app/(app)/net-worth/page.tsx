import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAccountBalances, getNetWorthSeries, listHoldings, listSnapshots } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD, formatSignedUSD } from '@/lib/currency';
import { format } from 'date-fns';
import { NetWorthChart } from '@/components/net-worth/NetWorthChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { LineChart } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NetWorthPage() {
  const userId = await requireUser();
  const [balances, series, snaps, holds] = await Promise.all([
    getAccountBalances(userId),
    getNetWorthSeries(userId),
    listSnapshots(userId),
    listHoldings(userId),
  ]);

  const netWorth = balances.reduce((s, a) => s + a.balance, 0);
  const totalMarket = holds.reduce((s, h) => s + parseFloat(h.marketValue), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Net Worth</h1>
        <p className="text-sm text-muted-foreground">
          Track your overall balance over time across accounts.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Current</p>
          <p className="tabular font-display text-4xl">{formatUSD(netWorth)}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Net worth over time</CardTitle>
            </CardHeader>
            <CardContent>
              <NetWorthChart data={series} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots">
          <Card>
            <CardContent className="p-0">
              {snaps.length === 0 ? (
                <EmptyState
                  icon={LineChart}
                  heading="No snapshots yet"
                  subline="Snapshots capture each account's balance over time."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snaps.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.accountId.slice(0, 8)}…
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {formatUSD(parseFloat(s.balance))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings">
          <Card>
            <CardContent className="p-0">
              {holds.length === 0 ? (
                <EmptyState
                  icon={LineChart}
                  heading="No holdings yet"
                  subline="Connect a brokerage in Connections to populate your positions."
                  action={{ label: 'Go to Connections', href: '/connections' }}
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">% Portfolio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holds.map((h) => {
                        const mv = parseFloat(h.marketValue);
                        const pct = totalMarket > 0 ? (mv / totalMarket) * 100 : 0;
                        return (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">{h.symbol}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {h.accountName}
                            </TableCell>
                            <TableCell className="tabular text-right">{h.quantity}</TableCell>
                            <TableCell className="tabular text-right">
                              {h.currentPrice ? formatUSD(parseFloat(h.currentPrice)) : '—'}
                            </TableCell>
                            <TableCell className="tabular text-right">{formatUSD(mv)}</TableCell>
                            <TableCell className="tabular text-right">{pct.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
