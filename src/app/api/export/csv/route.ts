import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listTransactions } from '@/db/queries';
import { toCSV } from '@/lib/csv';

export async function GET(req: NextRequest) {
  const userId = await requireUser();
  const year = req.nextUrl.searchParams.get('year');
  const from = year ? `${year}-01-01` : undefined;
  const to = year ? `${year}-12-31` : undefined;
  const rows = await listTransactions(userId, { from, to, limit: 100000 });

  const csv = toCSV(
    rows.map((r) => ({
      date: r.date,
      type: r.type,
      description: r.description,
      merchant: r.merchant,
      category: r.categoryName,
      account: r.accountName,
      amount: r.amount,
      cleared: r.isCleared,
    })),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="transactions-${year ?? 'all'}.csv"`,
    },
  });
}
