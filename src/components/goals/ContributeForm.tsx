'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contributeToGoal } from '@/actions/goals';
import { toast } from 'sonner';

export function ContributeForm({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pending, startTransition] = useTransition();

  function submit() {
    const val = parseFloat(amount);
    if (!Number.isFinite(val) || val <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    startTransition(async () => {
      const res = await contributeToGoal({ goalId, date, amount: val });
      if (res.ok) {
        toast.success(`Added ${amount}`);
        if (res.data.achieved) {
          confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
          toast.success('Goal achieved!');
        }
        setAmount('');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        Contribute
      </Button>
    </form>
  );
}
