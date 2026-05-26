'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUSD } from '@/lib/currency';

export function CashFlowChart({ data }: { data: Array<{ label: string; net: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickFormatter={(v) => formatUSD(v, { compact: true })}
        />
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          formatter={(v: number) => formatUSD(v)}
          contentStyle={{
            background: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
          }}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net Cash Flow"
          stroke="#0F3D3E"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
