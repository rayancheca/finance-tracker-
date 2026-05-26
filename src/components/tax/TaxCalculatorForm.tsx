'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSettingsBatch } from '@/actions/settings';
import { toast } from 'sonner';
import type { SETTINGS_DEFAULTS } from '@/lib/validators';

export function TaxCalculatorForm({
  initial,
}: {
  initial: typeof SETTINGS_DEFAULTS;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gross, setGross] = useState(String(initial['salary.annualGross']));
  const [status, setStatus] = useState(initial['tax.filingStatus']);
  const [k401, setK401] = useState(String(initial['tax.401kContribPct']));
  const [health, setHealth] = useState(String(initial['tax.healthPremiumMonthly']));
  const [hsa, setHsa] = useState(String(initial['tax.hsaContribAnnual']));
  const [state, setState] = useState(initial['salary.state']);
  const [stdDed, setStdDed] = useState(String(initial['tax.standardDeduction']));

  function save() {
    startTransition(async () => {
      const res = await updateSettingsBatch([
        { key: 'salary.annualGross', value: parseFloat(gross) },
        { key: 'tax.filingStatus', value: status },
        { key: 'tax.401kContribPct', value: parseFloat(k401) },
        { key: 'tax.healthPremiumMonthly', value: parseFloat(health) },
        { key: 'tax.hsaContribAnnual', value: parseFloat(hsa) },
        { key: 'salary.state', value: state.toUpperCase() },
        { key: 'tax.standardDeduction', value: parseFloat(stdDed) },
      ]);
      if (res.ok) {
        toast.success('Saved');
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Annual gross</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
          />
        </div>
        <div>
          <Label>State</Label>
          <Input
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>
        <div>
          <Label>Filing status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="mfj">Married filing jointly</SelectItem>
              <SelectItem value="mfs">Married filing separately</SelectItem>
              <SelectItem value="hoh">Head of household</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Standard deduction</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={stdDed}
            onChange={(e) => setStdDed(e.target.value)}
          />
        </div>
        <div>
          <Label>401(k) %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={k401}
            onChange={(e) => setK401(e.target.value)}
          />
        </div>
        <div>
          <Label>Health premium ($/mo)</Label>
          <Input
            type="number"
            min="0"
            step="10"
            value={health}
            onChange={(e) => setHealth(e.target.value)}
          />
        </div>
        <div>
          <Label>HSA ($/year)</Label>
          <Input
            type="number"
            min="0"
            step="100"
            value={hsa}
            onChange={(e) => setHsa(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        Save settings
      </Button>
    </form>
  );
}
