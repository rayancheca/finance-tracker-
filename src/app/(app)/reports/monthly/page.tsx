import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getMonthlyPivot } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const userId = await requireUser();
  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()), 10);
  const pivot = await getMonthlyPivot(userId, year);

  const totalsByMonth = Array(12).fill(0);
  pivot.forEach((r) => r.months.forEach((m, i) => (totalsByMonth[i] += m)));
  const grandTotal = totalsByMonth.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Monthly Report</h1>
          <p className="text-sm text-muted-foreground">
            Category × month pivot for {year}. Drill into any cell to see transactions.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/reports/monthly?year=${year - 1}`} className="rounded-md border px-3 py-1.5">
            ← {year - 1}
          </Link>
          <Link href={`/reports/monthly?year=${year + 1}`} className="rounded-md border px-3 py-1.5">
            {year + 1} →
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                {MONTHS.map((m) => (
                  <TableHead key={m} className="text-right">
                    {m}
                  </TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivot.map((r) => {
                const rowTotal = r.months.reduce((s, n) => s + n, 0);
                return (
                  <TableRow key={r.categoryId}>
                    <TableCell>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.group}</div>
                    </TableCell>
                    {r.months.map((m, i) => (
                      <TableCell key={i} className="tabular text-right text-sm">
                        {m > 0 ? formatUSD(m) : '·'}
                      </TableCell>
                    ))}
                    <TableCell className="tabular text-right text-sm font-medium">
                      {formatUSD(rowTotal)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {pivot.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="p-6 text-center text-sm text-muted-foreground">
                    No data for {year}.
                  </TableCell>
                </TableRow>
              )}
              {pivot.length > 0 && (
                <TableRow className="bg-muted/40">
                  <TableCell className="font-medium">Monthly total</TableCell>
                  {totalsByMonth.map((t, i) => (
                    <TableCell key={i} className="tabular text-right text-sm font-medium">
                      {t > 0 ? formatUSD(t) : '·'}
                    </TableCell>
                  ))}
                  <TableCell className="tabular text-right text-sm font-semibold">
                    {formatUSD(grandTotal)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
