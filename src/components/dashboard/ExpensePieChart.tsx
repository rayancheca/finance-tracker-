'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatUSD } from '@/lib/currency';

const COLORS = [
  '#0F3D3E',
  '#1B8B4F',
  '#C9A227',
  '#C84B3A',
  '#5C8D89',
  '#A8A89E',
  '#3A3A38',
  '#7A6A2E',
  '#5E4A3A',
  '#4F6D7A',
];

export function ExpensePieChart({
  data,
}: {
  data: Array<{ name: string; value: number; color?: string }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No expenses this month
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => formatUSD(v)}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
