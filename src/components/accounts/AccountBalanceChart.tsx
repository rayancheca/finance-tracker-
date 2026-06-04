'use client';

import { format } from 'date-fns';
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

export function AccountBalanceChart({ data }: { data: Array<{ date: string; balance: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No transactions yet — activity on this account will plot its balance here.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="acctBal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F3D3E" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#0F3D3E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          minTickGap={24}
          tickFormatter={(v: string) => format(new Date(v), 'MMM d')}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(v) => formatUSD(v, { compact: true })}
        />
        <Tooltip
          formatter={(v: number) => formatUSD(v)}
          labelFormatter={(v: string) => format(new Date(v), 'MMM d, yyyy')}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
          }}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#0F3D3E"
          strokeWidth={2}
          fill="url(#acctBal)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
