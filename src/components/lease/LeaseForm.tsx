'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateSettingsBatch } from '@/actions/settings';
import { toast } from 'sonner';

export function LeaseForm({
  initial,
}: {
  initial: {
    status: 'active' | 'subletting' | 'released';
    monthlyShare: number;
    endDate: string;
    subletOffsetMonthly: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(initial.status);
  const [monthlyShare, setMonthlyShare] = useState(String(initial.monthlyShare));
  const [endDate, setEndDate] = useState(initial.endDate);
  const [subletOffset, setSubletOffset] = useState(String(initial.subletOffsetMonthly));

  function save() {
    startTransition(async () => {
      const res = await updateSettingsBatch([
        { key: 'lease.status', value: status },
        { key: 'lease.monthlyShare', value: parseFloat(monthlyShare) },
        { key: 'lease.endDate', value: endDate },
        { key: 'lease.subletOffsetMonthly', value: parseFloat(subletOffset) },
      ]);
      if (res.ok) {
        toast.success('Saved');
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="subletting">Subletting</SelectItem>
            <SelectItem value="released">Released</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>End date</Label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div>
        <Label>Monthly share ($)</Label>
        <Input
          type="number"
          step="1"
          min="0"
          value={monthlyShare}
          onChange={(e) => setMonthlyShare(e.target.value)}
        />
      </div>
      <div>
        <Label>Sublet offset ($/mo)</Label>
        <Input
          type="number"
          step="1"
          min="0"
          value={subletOffset}
          onChange={(e) => setSubletOffset(e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}
