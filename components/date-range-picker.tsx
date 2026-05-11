'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(days: number) {
  return toISO(new Date(Date.now() - days * DAY_MS));
}

function daysAhead(days: number) {
  return toISO(new Date(Date.now() + days * DAY_MS));
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(newFrom: string, newTo: string) {
    const next = new URLSearchParams(params.toString());
    if (newFrom) next.set('from', newFrom);
    else next.delete('from');
    if (newTo) next.set('to', newTo);
    else next.delete('to');
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  const today = toISO(new Date());

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-xs text-muted-foreground">De</label>
        <input
          type="date"
          value={from}
          onChange={(e) => update(e.target.value, to)}
          disabled={pending}
          className="rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">Até</label>
        <input
          type="date"
          value={to}
          onChange={(e) => update(from, e.target.value)}
          disabled={pending}
          className="rounded-md border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
        />
      </div>
      <div className="flex gap-1">
        <Preset onClick={() => update(today, today)} pending={pending} label="Hoje" />
        <Preset onClick={() => update(daysAgo(7), today)} pending={pending} label="7d" />
        <Preset onClick={() => update(daysAgo(30), today)} pending={pending} label="30d" />
        <Preset onClick={() => update(daysAgo(90), today)} pending={pending} label="90d" />
        <Preset onClick={() => update(today, daysAhead(30))} pending={pending} label="Próx. 30d" />
      </div>
    </div>
  );
}

function Preset({
  onClick,
  pending,
  label,
}: {
  onClick: () => void;
  pending: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
    >
      {label}
    </button>
  );
}
