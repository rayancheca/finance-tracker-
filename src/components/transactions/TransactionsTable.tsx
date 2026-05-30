'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryCombobox, type CategoryOption } from './CategoryCombobox';
import { formatUSD } from '@/lib/currency';
import { cn } from '@/lib/utils';

export interface TransactionRow {
  id: string;
  date: string;
  amount: string;
  type: 'income' | 'expense' | 'transfer';
  merchant: string | null;
  description: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  externalTransactionId: string | null;
}

interface TransactionsTableProps {
  rows: TransactionRow[];
  categories: CategoryOption[];
}

export function TransactionsTable({ rows, categories }: TransactionsTableProps) {
  const router = useRouter();

  return (
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
            <TableCell className="tabular text-sm">{format(new Date(r.date), 'MMM d')}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {r.externalTransactionId && <Zap className="h-3 w-3 text-accent" />}
                <div>
                  <div className="text-sm">{r.description}</div>
                  {r.merchant && (
                    <div className="text-xs text-muted-foreground">{r.merchant}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <CategoryCombobox
                transactionId={r.id}
                currentCategoryId={r.categoryId}
                currentLabel={r.categoryName ?? r.type}
                categories={categories}
                onChanged={() => router.refresh()}
              />
            </TableCell>
            <TableCell className="text-sm">{r.accountName}</TableCell>
            <TableCell
              className={cn(
                'tabular text-right text-sm font-medium',
                r.type === 'income' ? 'text-income' : 'text-expense',
              )}
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
  );
}
