import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listTransactions, getMonthlyPivot } from '@/db/queries';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  const userId = await requireUser();
  const year = req.nextUrl.searchParams.get('year');
  const from = year ? `${year}-01-01` : undefined;
  const to = year ? `${year}-12-31` : undefined;

  const [rows, pivot] = await Promise.all([
    listTransactions(userId, { from, to, limit: 100000 }),
    year ? getMonthlyPivot(userId, parseInt(year, 10)) : Promise.resolve([]),
  ]);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Transactions');
  ws.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Merchant', key: 'merchant', width: 20 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Account', key: 'account', width: 20 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Cleared', key: 'cleared', width: 10 },
  ];
  rows.forEach((r) =>
    ws.addRow({
      date: r.date,
      type: r.type,
      description: r.description,
      merchant: r.merchant,
      category: r.categoryName,
      account: r.accountName,
      amount: parseFloat(r.amount),
      cleared: r.isCleared,
    }),
  );
  ws.getRow(1).font = { bold: true };

  if (pivot.length > 0) {
    const piv = wb.addWorksheet('Monthly');
    piv.columns = [
      { header: 'Category', key: 'cat', width: 24 },
      ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
        (m) => ({ header: m, key: m, width: 12 }),
      ),
      { header: 'Total', key: 'total', width: 14 },
    ];
    for (const r of pivot) {
      const row: Record<string, string | number> = { cat: `${r.group} · ${r.name}` };
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(
        (m, i) => (row[m] = r.months[i]),
      );
      row.total = r.months.reduce((s, n) => s + n, 0);
      piv.addRow(row);
    }
    piv.getRow(1).font = { bold: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="finance-${year ?? 'all'}.xlsx"`,
    },
  });
}
