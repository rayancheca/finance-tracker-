'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUSD } from '@/lib/currency';

export function IncomeVsExpensesChart({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(v) => formatUSD(v, { compact: true })}
        />
        <Tooltip
          formatter={(v: number) => formatUSD(v)}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
          }}
        />
        <Bar dataKey="income" name="Income" fill="#1B8B4F" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expenses" fill="#C84B3A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
