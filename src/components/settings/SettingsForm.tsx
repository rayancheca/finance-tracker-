'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function SettingsForm({ initial }: { initial: typeof SETTINGS_DEFAULTS }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [employer, setEmployer] = useState(initial['salary.employer']);
  const [title, setTitle] = useState(initial['salary.jobTitle']);
  const [start, setStart] = useState(initial['salary.startDate']);
  const [annual, setAnnual] = useState(String(initial['salary.annualGross']));
  const [freq, setFreq] = useState(initial['salary.payFrequency']);
  const [side, setSide] = useState(String(initial['salary.sideIncomeMonthly']));
  const [scenario, setScenario] = useState(initial['housing.scenario']);
  const [miamiRent, setMiamiRent] = useState(String(initial['housing.miamiRentMonthly']));
  const [theme, setTheme] = useState(initial['app.theme']);
  const [dateFormat, setDateFormat] = useState(initial['app.dateFormat']);

  function saveSalary() {
    startTransition(async () => {
      const res = await updateSettingsBatch([
        { key: 'salary.employer', value: employer },
        { key: 'salary.jobTitle', value: title },
        { key: 'salary.startDate', value: start },
        { key: 'salary.annualGross', value: parseFloat(annual) },
        { key: 'salary.payFrequency', value: freq },
        {
          key: 'salary.paychecksPerYear',
          value:
            freq === 'weekly' ? 52 : freq === 'biweekly' ? 26 : freq === 'semimonthly' ? 24 : 12,
        },
        { key: 'salary.sideIncomeMonthly', value: parseFloat(side) },
      ]);
      if (res.ok) {
        toast.success('Salary saved');
        router.refresh();
      } else toast.error(res.error);
    });
  }
  function saveHousing() {
    startTransition(async () => {
      const res = await updateSettingsBatch([
        { key: 'housing.scenario', value: scenario },
        { key: 'housing.miamiRentMonthly', value: parseFloat(miamiRent) },
      ]);
      if (res.ok) {
        toast.success('Housing saved');
        router.refresh();
      } else toast.error(res.error);
    });
  }
  function saveApp() {
    startTransition(async () => {
      const res = await updateSettingsBatch([
        { key: 'app.theme', value: theme },
        { key: 'app.dateFormat', value: dateFormat },
      ]);
      if (res.ok) {
        toast.success('App preferences saved');
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Salary & Job</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Employer</Label>
            <Input value={employer} onChange={(e) => setEmployer(e.target.value)} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>Annual gross</Label>
            <Input
              type="number"
              min="0"
              step="100"
              value={annual}
              onChange={(e) => setAnnual(e.target.value)}
            />
          </div>
          <div>
            <Label>Pay frequency</Label>
            <Select value={freq} onValueChange={(v) => setFreq(v as typeof freq)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Side income ($/mo)</Label>
            <Input
              type="number"
              min="0"
              step="50"
              value={side}
              onChange={(e) => setSide(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveSalary} disabled={pending}>
              Save salary
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Housing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Scenario</Label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as typeof scenario)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employer_provided">Employer-provided</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Miami rent ($/mo)</Label>
            <Input
              type="number"
              min="0"
              step="50"
              value={miamiRent}
              onChange={(e) => setMiamiRent(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveHousing} disabled={pending}>
              Save housing
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date format</Label>
            <Select
              value={dateFormat}
              onValueChange={(v) => setDateFormat(v as typeof dateFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={saveApp} disabled={pending}>
              Save app
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
