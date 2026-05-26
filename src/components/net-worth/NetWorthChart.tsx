'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUSD } from '@/lib/currency';

export function NetWorthChart({ data }: { data: Array<{ date: string; total: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No snapshots yet — add one to see your net worth trend.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F3D3E" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0F3D3E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
        <Area
          type="monotone"
          dataKey="total"
          stroke="#0F3D3E"
          strokeWidth={2}
          fill="url(#nw)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
