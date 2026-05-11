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
import { formatBRL } from '@/lib/utils';

type Point = { month: string; label: string; amount: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis
          tick={{ fontSize: 12 }}
          stroke="hsl(var(--muted-foreground))"
          tickFormatter={(v: number) => (v >= 100_000 ? `R$ ${(v / 100_000).toFixed(0)}k` : `R$ ${(v / 100).toFixed(0)}`)}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: number) => [formatBRL(v), 'Receita']}
          labelFormatter={(l) => `Mês: ${l}`}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
