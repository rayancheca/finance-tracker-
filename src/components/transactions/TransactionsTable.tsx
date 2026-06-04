'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Tags, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CategoryCombobox, type CategoryOption } from './CategoryCombobox';
import {
  bulkDeleteTransactions,
  bulkSetCleared,
  bulkUpdateCategory,
} from '@/actions/transactions';
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

type ActionResult = Awaited<ReturnType<typeof bulkDeleteTransactions>>;

interface TransactionsTableProps {
  rows: TransactionRow[];
  categories: CategoryOption[];
}

export function TransactionsTable({ rows, categories }: TransactionsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Selection survives router.refresh(), but the row set can change underneath
  // it (e.g. an inline edit drops a row from a filtered view). Derive the
  // actionable selection from the rows currently on screen so counts, header
  // state, and bulk actions never reference rows the user can't see.
  const rowIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);
  const validSelected = useMemo(
    () => new Set([...selected].filter((id) => rowIds.has(id))),
    [selected, rowIds],
  );

  const allSelected = rows.length > 0 && validSelected.size === rows.length;
  const headerState: boolean | 'indeterminate' = allSelected
    ? true
    : validSelected.size > 0
      ? 'indeterminate'
      : false;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(action: () => Promise<ActionResult>, successMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successMsg);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete() {
    const ids = Array.from(validSelected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} transaction${ids.length === 1 ? '' : 's'}?`)) return;
    runBulk(() => bulkDeleteTransactions(ids), `Deleted ${ids.length}`);
  }

  function handleSetCategory(categoryId: string) {
    setCatMenuOpen(false);
    const ids = Array.from(validSelected);
    if (ids.length === 0) return;
    runBulk(() => bulkUpdateCategory(ids, categoryId), 'Category updated');
  }

  function handleMarkCleared() {
    const ids = Array.from(validSelected);
    if (ids.length === 0) return;
    runBulk(() => bulkSetCleared(ids, true), 'Marked cleared');
  }

  const byGroup = new Map<string, CategoryOption[]>();
  for (const c of categories) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={headerState}
                onCheckedChange={toggleAll}
                aria-label="Select all transactions"
              />
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isSelected = selected.has(r.id);
            return (
              <TableRow key={r.id} data-state={isSelected ? 'selected' : undefined}>
                <TableCell className="w-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(r.id)}
                    aria-label={`Select ${r.description ?? 'transaction'}`}
                  />
                </TableCell>
                <TableCell className="tabular text-sm">
                  {format(new Date(r.date), 'MMM d')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {r.externalTransactionId && (
                      <span title="Auto-synced">
                        <Zap aria-hidden className="h-3 w-3 text-accent" />
                        <span className="sr-only">Auto-synced</span>
                      </span>
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
                  {r.type === 'transfer' ? (
                    <Badge variant="outline">transfer</Badge>
                  ) : (
                    <CategoryCombobox
                      transactionId={r.id}
                      transactionType={r.type}
                      currentCategoryId={r.categoryId}
                      currentLabel={r.categoryName ?? r.type}
                      categories={categories}
                      onChanged={() => router.refresh()}
                    />
                  )}
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
            );
          })}
        </TableBody>
      </Table>

      {validSelected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border bg-card/90 p-1.5 pl-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/75">
            <span className="text-sm font-medium">{validSelected.size} selected</span>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <Button variant="ghost" size="sm" onClick={handleMarkCleared} disabled={pending}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Mark cleared
            </Button>
            <Popover open={catMenuOpen} onOpenChange={setCatMenuOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={pending}>
                  <Tags className="mr-1 h-4 w-4" /> Set category…
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search categories…" />
                  <CommandList>
                    <CommandEmpty>No category found.</CommandEmpty>
                    {Array.from(byGroup.entries()).map(([group, opts]) => (
                      <CommandGroup key={group} heading={group}>
                        {opts.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${group} ${c.name}`}
                            onSelect={() => handleSetCategory(c.id)}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending}>
              <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Delete
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
