'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type Resource = 'all' | 'plans' | 'customers' | 'subscriptions' | 'invoices' | 'charges';

interface RunResult {
  resource: Resource;
  ok: boolean;
  detail: string;
}

const RESOURCES: { key: Resource; label: string }[] = [
  { key: 'all', label: 'Sync completo' },
  { key: 'plans', label: 'Planos' },
  { key: 'customers', label: 'Clientes' },
  { key: 'subscriptions', label: 'Assinaturas' },
  { key: 'invoices', label: 'Faturas' },
  { key: 'charges', label: 'Cobranças' },
];

export function SyncControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState<Resource | null>(null);
  const [last, setLast] = useState<RunResult | null>(null);

  async function run(resource: Resource) {
    setRunning(resource);
    setLast(null);
    try {
      const res = await fetch(`/api/sync/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        setLast({ resource, ok: false, detail: json.error ?? `HTTP ${res.status}` });
      } else if (resource === 'all') {
        const lines = Object.entries(json.results ?? {}).map(([k, v]) => {
          const r = v as { total?: number; error?: string };
          return r.error ? `${k}: erro — ${r.error}` : `${k}: ${r.total ?? 0}`;
        });
        setLast({ resource, ok: true, detail: lines.join(' • ') });
      } else {
        setLast({ resource, ok: true, detail: `Total: ${json.total ?? 0}` });
      }
    } catch (err) {
      setLast({
        resource,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(null);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RESOURCES.map(({ key, label }) => {
          const isThis = running === key;
          const disabled = running !== null;
          const isPrimary = key === 'all';
          return (
            <button
              key={key}
              onClick={() => run(key)}
              disabled={disabled}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                isPrimary
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'border bg-card hover:bg-accent'
              }`}
            >
              {isThis && <Loader2 className="h-4 w-4 animate-spin" />}
              {label}
            </button>
          );
        })}
      </div>
      {last && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            last.ok ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <strong>{last.resource}</strong>: {last.detail}
        </div>
      )}
      {isPending && <p className="text-xs text-muted-foreground">Atualizando logs…</p>}
    </div>
  );
}
