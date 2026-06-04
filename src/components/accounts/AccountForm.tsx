'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  updateAccount,
} from '@/actions/accounts';

const ACCOUNT_TYPES: ReadonlyArray<[string, string]> = [
  ['checking', 'Checking'],
  ['savings', 'Savings'],
  ['credit_card', 'Credit card'],
  ['cash', 'Cash'],
  ['brokerage', 'Brokerage'],
  ['retirement', 'Retirement'],
  ['other', 'Other'],
];

export interface AccountInitial {
  id?: string;
  name: string;
  type: string;
  institution?: string | null;
  last4?: string | null;
  openingBalance: number;
  color?: string | null;
  notes?: string | null;
}

export function AccountForm({ initial, onDone }: { initial?: AccountInitial; onDone?: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'checking');
  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [last4, setLast4] = useState(initial?.last4 ?? '');
  const [balance, setBalance] = useState(
    initial ? String(initial.openingBalance) : '',
  );
  const [color, setColor] = useState(initial?.color ?? '#0F3D3E');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function submit() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const payload = {
      name: name.trim(),
      type,
      institution: institution.trim() || null,
      last4: last4.trim() || null,
      openingBalance: balance === '' ? 0 : parseFloat(balance),
      color: color || null,
      notes: notes.trim() || null,
    };
    startTransition(async () => {
      const res = initial?.id
        ? await updateAccount(initial.id, payload)
        : await createAccount(payload);
      if (res.ok) {
        toast.success(initial?.id ? 'Account updated' : 'Account added');
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (!window.confirm('Delete this account permanently? (Archive instead if it has transactions.)'))
      return;
    startTransition(async () => {
      const res = await deleteAccount(initial.id!);
      if (res.ok) {
        toast.success('Account deleted');
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function archive() {
    if (!initial?.id) return;
    startTransition(async () => {
      const res = await archiveAccount(initial.id!);
      if (res.ok) {
        toast.success('Account archived');
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
      <div className="space-y-1">
        <Label htmlFor="acct-name">Name</Label>
        <Input
          id="acct-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Chase Checking"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-balance">Current balance</Label>
          <Input
            id="acct-balance"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use a negative balance for money owed (e.g. a credit-card balance). Any transactions on this
        account adjust it from here.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="acct-institution">Institution (optional)</Label>
          <Input
            id="acct-institution"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Chase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acct-last4">Last 4 (optional)</Label>
          <Input
            id="acct-last4"
            value={last4}
            onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="1234"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="acct-color">Color</Label>
        <Input
          id="acct-color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-14 cursor-pointer p-1"
        />
        <span className="text-xs text-muted-foreground">Shown as the card accent.</span>
      </div>

      <div className="space-y-1">
        <Label htmlFor="acct-notes">Notes (optional)</Label>
        <Textarea
          id="acct-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-2">
        {initial?.id ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={archive} disabled={pending}>
              Archive
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={remove}
              disabled={pending}
            >
              Delete
            </Button>
          </div>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {initial?.id ? 'Save' : 'Add account'}
        </Button>
      </div>
    </form>
  );
}
