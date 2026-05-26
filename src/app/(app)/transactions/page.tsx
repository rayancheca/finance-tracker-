import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { listTransactions, listAccounts, listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';
import { Plus, Upload, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  type?: 'income' | 'expense' | 'transfer';
  q?: string;
  page?: string;
}>;

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const userId = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const limit = 50;

  const [rows, accounts, categories] = await Promise.all([
    listTransactions(userId, {
      from: sp.from,
      to: sp.to,
      accountId: sp.account,
      categoryId: sp.category,
      type: sp.type,
      search: sp.q,
      limit,
      offset: (page - 1) * limit,
    }),
    listAccounts(userId),
    listCategories(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Add, filter, and bulk-manage your money movements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/transactions/import">
              <Upload className="mr-1 h-4 w-4" /> Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="mr-1 h-4 w-4" /> New
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input name="q" placeholder="Search…" defaultValue={sp.q} />
            <Input name="from" type="date" defaultValue={sp.from} />
            <Input name="to" type="date" defaultValue={sp.to} />
            <select
              name="type"
              defaultValue={sp.type ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select
              name="account"
              defaultValue={sp.account ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="font-medium">No transactions match</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust filters or{' '}
                <Link href="/transactions/new" className="text-primary underline">
                  add a transaction
                </Link>
                .
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular text-sm">
                      {format(new Date(r.date), 'MMM d')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.externalTransactionId && (
                          <Zap className="h-3 w-3 text-accent" />
                        )}
                        <div>
                          <div className="text-sm">{r.description}</div>
                          {r.merchant && (
                            <div className="text-xs text-muted-foreground">{r.merchant}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.categoryName ?? r.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{r.accountName}</TableCell>
                    <TableCell
                      className={
                        'tabular text-right text-sm font-medium ' +
                        (r.type === 'income' ? 'text-income' : 'text-expense')
                      }
                    >
                      {r.type === 'income' ? '+' : '−'}
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{rows.length} row(s) on page {page}</span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/transactions?page=${page - 1}`}
              className="rounded-md border px-3 py-1"
            >
              Prev
            </Link>
          )}
          {rows.length === limit && (
            <Link
              href={`/transactions?page=${page + 1}`}
              className="rounded-md border px-3 py-1"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
