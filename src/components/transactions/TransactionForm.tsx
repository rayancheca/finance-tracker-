'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/actions/transactions';

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

export function TransactionForm({
  accounts,
  categories,
  initial,
  onDone,
}: {
  accounts: AccountOpt[];
  categories: CategoryOpt[];
  initial?: {
    id?: string;
    type: 'income' | 'expense' | 'transfer';
    date: string;
    amount: number;
    accountId: string;
    transferAccountId?: string | null;
    categoryId?: string | null;
    merchant?: string | null;
    description: string;
    notes?: string | null;
    isCleared?: boolean;
  };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(initial?.type ?? 'expense');
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [transferAccountId, setTransferAccountId] = useState(initial?.transferAccountId ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isCleared, setIsCleared] = useState(initial?.isCleared ?? true);

  const eligibleCategories = categories.filter((c) =>
    type === 'income' ? c.kind === 'income' : c.kind === 'expense' || c.kind === 'savings',
  );

  function submit() {
    const payload = {
      accountId,
      categoryId: type === 'transfer' ? null : categoryId || null,
      transferAccountId: type === 'transfer' ? transferAccountId || null : null,
      date,
      amount: parseFloat(amount),
      type,
      merchant: merchant || null,
      description,
      notes: notes || null,
      tags: [],
      isCleared,
    };
    startTransition(async () => {
      const res = initial?.id
        ? await updateTransaction(initial.id, payload)
        : await createTransaction(payload);
      if (res.ok) {
        toast.success(initial?.id ? 'Transaction updated' : 'Transaction added');
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (!confirm('Delete this transaction?')) return;
    startTransition(async () => {
      const res = await deleteTransaction(initial.id!);
      if (res.ok) {
        toast.success('Deleted');
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-2">
        {(['expense', 'income', 'transfer'] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={type === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Account</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
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

      {type === 'transfer' ? (
        <div className="space-y-1">
          <Label>Transfer to</Label>
          <Select value={transferAccountId} onValueChange={setTransferAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {eligibleCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.group} · {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="merchant">Merchant (optional)</Label>
        <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isCleared} onCheckedChange={setIsCleared} id="cleared" />
        <Label htmlFor="cleared">Cleared</Label>
      </div>

      <div className="flex items-center justify-between gap-2">
        {initial?.id && (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button type="submit" disabled={pending}>
            {initial?.id ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </form>
  );
}
