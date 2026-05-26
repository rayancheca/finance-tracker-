import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMonthlyPivot } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const userId = await requireUser();
  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()), 10);
  const pivot = await getMonthlyPivot(userId, year);

  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;
  let biggestExpense = { name: '', amount: 0 };
  let biggestIncome = { name: '', amount: 0 };

  for (const r of pivot) {
    const total = r.months.reduce((s, n) => s + n, 0);
    if (r.kind === 'income') {
      totalIncome += total;
      if (total > biggestIncome.amount) biggestIncome = { name: r.name, amount: total };
    } else if (r.kind === 'savings') {
      totalSavings += total;
    } else {
      totalExpense += total;
      if (total > biggestExpense.amount) biggestExpense = { name: r.name, amount: total };
    }
  }

  const savingsRate = totalIncome > 0 ? totalSavings / totalIncome : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Annual Report {year}
          </h1>
          <p className="text-sm text-muted-foreground">
            Income, expense, savings summary for the year.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/reports/annual?year=${year - 1}`}
            className="rounded-md border px-3 py-1.5"
          >
            ← {year - 1}
          </Link>
          <Link
            href={`/reports/annual?year=${year + 1}`}
            className="rounded-md border px-3 py-1.5"
          >
            {year + 1} →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total income" value={formatUSD(totalIncome)} tone="positive" />
        <Stat label="Total expenses" value={formatUSD(totalExpense)} tone="negative" />
        <Stat label="Total saved" value={formatUSD(totalSavings)} />
        <Stat label="Savings rate" value={`${(savingsRate * 100).toFixed(1)}%`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Biggest expense category
            </p>
            <p className="font-display text-2xl">{biggestExpense.name || '—'}</p>
            <p className="tabular text-sm text-muted-foreground">
              {formatUSD(biggestExpense.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Biggest income source
            </p>
            <p className="font-display text-2xl">{biggestIncome.name || '—'}</p>
            <p className="tabular text-sm text-muted-foreground">
              {formatUSD(biggestIncome.amount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <a href={`/api/export/csv?year=${year}`}>Download CSV</a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/export/xlsx?year=${year}`}>Download XLSX</a>
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={[
            'tabular font-display text-2xl',
            tone === 'positive' ? 'text-income' : '',
            tone === 'negative' ? 'text-expense' : '',
          ].join(' ')}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
