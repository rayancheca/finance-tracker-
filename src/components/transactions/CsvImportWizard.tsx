'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseCSV } from '@/lib/csv';
import { importTransactions } from '@/actions/transactions';
import { toast } from 'sonner';

interface AccountOpt {
  id: string;
  name: string;
}
interface CategoryOpt {
  id: string;
  name: string;
  group: string;
  kind: 'income' | 'expense' | 'savings' | 'transfer';
}

type Mapping = {
  date: string;
  amount: string;
  description: string;
  merchant?: string;
  type?: string;
  category?: string;
};

const REQUIRED: Array<keyof Mapping> = ['date', 'amount', 'description'];

export function CsvImportWizard({
  accounts,
  categories,
}: {
  accounts: AccountOpt[];
  categories: CategoryOpt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    date: '',
    amount: '',
    description: '',
  });
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    const guess = (kw: string[]) =>
      parsed.headers.find((h) => kw.some((k) => h.toLowerCase().includes(k))) ?? '';
    setMapping({
      date: guess(['date']),
      amount: guess(['amount', 'value']),
      description: guess(['description', 'memo', 'desc', 'narrative']),
      merchant: guess(['merchant', 'payee']),
      type: guess(['type']),
      category: guess(['category']),
    });
  }

  const preview = rows.slice(0, 10).map((r) => ({
    date: r[mapping.date],
    amount: r[mapping.amount],
    description: r[mapping.description],
    merchant: mapping.merchant ? r[mapping.merchant] : undefined,
    type: mapping.type ? r[mapping.type] : undefined,
  }));

  function confirm() {
    if (REQUIRED.some((k) => !mapping[k])) {
      toast.error('Map date, amount, and description first.');
      return;
    }
    const payload = rows
      .map((r) => {
        const amtRaw = (r[mapping.amount] ?? '').replace(/[^0-9.\-]/g, '');
        const amt = parseFloat(amtRaw);
        if (!Number.isFinite(amt)) return null;
        const typeRaw = mapping.type ? (r[mapping.type] ?? '').toLowerCase() : '';
        const type: 'income' | 'expense' =
          typeRaw.includes('credit') || typeRaw === 'income'
            ? 'income'
            : amt < 0
              ? 'expense'
              : 'expense';
        return {
          accountId,
          date: r[mapping.date],
          amount: Math.abs(amt),
          type: type as 'income' | 'expense',
          description: r[mapping.description] ?? '(imported)',
          merchant: mapping.merchant ? (r[mapping.merchant] ?? null) : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    startTransition(async () => {
      const res = await importTransactions(payload);
      if (res.ok) {
        toast.success(
          `Imported ${res.data.inserted} transactions (skipped ${res.data.skipped} duplicates)`,
        );
        router.push('/transactions');
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept=".csv,text/csv" onChange={onFile} />
          <div className="space-y-1">
            <Label>Target account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Map columns</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {(['date', 'amount', 'description', 'merchant', 'type'] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={mapping[k] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [k]: e.target.value }))}
                >
                  <option value="">(none)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Preview (first 10 rows)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.date}</TableCell>
                    <TableCell className="text-sm">{p.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.merchant}</TableCell>
                    <TableCell className="tabular text-right text-sm">{p.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={confirm} disabled={pending}>
            Import {rows.length} transactions
          </Button>
        </div>
      )}
    </div>
  );
}
