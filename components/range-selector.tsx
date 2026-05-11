'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '12m', label: '12 meses' },
  { value: 'all', label: 'Tudo' },
] as const;

export function RangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground">Período:</label>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set('range', e.target.value);
          startTransition(() => {
            router.push(`${pathname}?${next.toString()}`);
          });
        }}
        className="rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
