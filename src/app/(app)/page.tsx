import { format } from 'date-fns';
import { KpiTile } from '@/components/dashboard/KpiTile';
import { IncomeVsExpensesChart } from '@/components/dashboard/IncomeVsExpensesChart';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { ExpensePieChart } from '@/components/dashboard/ExpensePieChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  getMonthlyTotals,
  getIncomeVsExpensesByMonth,
  getCashFlowLast12Months,
  getExpenseBreakdown,
  getAccountBalances,
  getNetWorthSeries,
  listGoals,
  listTransactions,
  getAllSettings,
} from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD, formatPercent, formatSignedUSD } from '@/lib/currency';
import { calculateLease } from '@/lib/lease';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const userId = await requireUser();
  const today = new Date();

  const [totals, ivse, cf, breakdown, balances, nwSeries, goals, recent, settings] =
    await Promise.all([
      getMonthlyTotals(userId, today),
      getIncomeVsExpensesByMonth(userId, 6),
      getCashFlowLast12Months(userId),
      getExpenseBreakdown(userId, today),
      getAccountBalances(userId),
      getNetWorthSeries(userId),
      listGoals(userId),
      listTransactions(userId, { limit: 10 }),
      getAllSettings(userId),
    ]);

  const netWorth = balances.reduce((s, a) => s + a.balance, 0);
  const lease = calculateLease({
    status: settings['lease.status'],
    monthlyShare: settings['lease.monthlyShare'],
    endDate: settings['lease.endDate'],
    subletOffsetMonthly: settings['lease.subletOffsetMonthly'],
    asOf: today,
  });

  const activeGoals = goals.filter((g) => g.status === 'active');
  const topGoal = activeGoals[0];

  let nwDelta = 0;
  if (nwSeries.length >= 2) {
    const latest = nwSeries[nwSeries.length - 1].total;
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 30);
    const past =
      nwSeries.find((s) => new Date(s.date) >= cutoff) ?? nwSeries[0];
    nwDelta = latest - past.total;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Here&rsquo;s your money this month
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Net Income"
          value={formatUSD(totals.income)}
          sub="this month"
          href="/transactions"
          tone={totals.income > 0 ? 'positive' : 'default'}
        />
        <KpiTile
          label="Expenses"
          value={formatUSD(totals.expense)}
          sub="this month"
          href="/transactions"
          tone={totals.expense > 0 ? 'negative' : 'default'}
        />
        <KpiTile
          label="Cash Flow"
          value={formatSignedUSD(totals.cashFlow)}
          sub="this month"
          tone={totals.cashFlow >= 0 ? 'positive' : 'negative'}
        />
        <KpiTile
          label="Savings Rate"
          value={formatPercent(totals.savingsRate)}
          sub={`${formatUSD(totals.savings)} saved`}
        />
        <KpiTile
          label="Net Worth"
          value={formatUSD(netWorth)}
          sub={nwDelta !== 0 ? `${formatSignedUSD(nwDelta)} 30d` : 'add a snapshot'}
          href="/net-worth"
        />
        <KpiTile
          label="Top Category"
          value={totals.topCategory.name ?? '—'}
          sub={
            totals.topCategory.amount > 0
              ? `${formatUSD(totals.topCategory.amount)} this mo`
              : 'no expenses yet'
          }
          href="/reports/monthly"
        />
        <KpiTile
          label="Top Goal"
          value={topGoal?.name ?? 'No active goal'}
          sub={
            topGoal
              ? `${formatPercent(parseFloat(topGoal.currentAmount) / parseFloat(topGoal.targetAmount))} done`
              : undefined
          }
          href={topGoal ? `/goals/${topGoal.id}` : '/goals'}
        />
        <KpiTile
          label="NYC Lease"
          value={formatUSD(lease.totalRemainingLiability)}
          sub={`${lease.monthsRemaining} mo remaining`}
          href="/lease"
          tone="negative"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeVsExpensesChart data={ivse} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensePieChart data={breakdown} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Net Cash Flow (12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={cf} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No transactions yet.{' '}
                <Link href="/transactions/new" className="text-primary underline">
                  Add one
                </Link>
                .
              </p>
            )}
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b border-border/40 py-2 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={t.type === 'income' ? 'income' : 'expense'}>
                    {t.categoryName ?? t.type}
                  </Badge>
                  <div>
                    <div className="text-sm">{t.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(t.date), 'MMM d')} · {t.accountName}
                    </div>
                  </div>
                </div>
                <div
                  className={
                    'tabular text-sm font-medium ' +
                    (t.type === 'income' ? 'text-income' : 'text-expense')
                  }
                >
                  {t.type === 'income' ? '+' : '−'}
                  {formatUSD(parseFloat(t.amount))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.slice(0, 6).map((g) => {
              const cur = parseFloat(g.currentAmount);
              const tgt = parseFloat(g.targetAmount);
              const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
              return (
                <Link href={`/goals/${g.id}`} key={g.id} className="block space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular text-muted-foreground">
                      {formatUSD(cur)} / {formatUSD(tgt)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </Link>
              );
            })}
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No goals yet.{' '}
                <Link href="/goals" className="text-primary underline">
                  Create one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
