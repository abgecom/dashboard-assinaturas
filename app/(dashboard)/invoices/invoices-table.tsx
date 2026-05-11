'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { StatusBadge } from '@/components/ui/badge';
import { DataTableShell } from '@/components/data-table';
import { formatBRL, formatDate } from '@/lib/utils';
import type { InvoiceRow } from '@/lib/queries/invoices';

const columnHelper = createColumnHelper<InvoiceRow>();

const columns = [
  columnHelper.accessor('code', {
    header: 'Código',
    cell: (info) => <span className="font-mono text-xs">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('customer_name', {
    header: 'Cliente',
    cell: (info) => {
      const row = info.row.original;
      return row.customer_id ? (
        <Link href={`/customers/${row.customer_id}`} className="block min-w-0">
          <div className="truncate font-medium">{row.customer_name ?? '—'}</div>
          <div className="truncate text-xs text-muted-foreground">{row.customer_email ?? '—'}</div>
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  }),
  columnHelper.accessor('plan_name', {
    header: 'Plano',
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('amount', {
    header: 'Valor',
    cell: (info) => <span className="font-medium">{formatBRL(info.getValue())}</span>,
  }),
  columnHelper.accessor('payment_method', {
    header: 'Pagamento',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('billing_at', {
    header: 'Cobrada em',
    cell: (info) => formatDate(info.getValue()),
  }),
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toEndOfDay(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function toStartOfDay(dateStr: string): number {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'billing_at', desc: true },
  ]);

  const plans = useMemo(() => {
    const set = new Set<string>();
    for (const i of data) if (i.plan_name) set.add(i.plan_name);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    if (planFilter !== 'all') {
      result = result.filter((i) =>
        planFilter === '__none__' ? !i.plan_name : i.plan_name === planFilter,
      );
    }
    if (dateFrom) {
      const fromTs = toStartOfDay(dateFrom);
      result = result.filter((i) => {
        const d = i.billing_at ?? i.pagarme_created_at;
        if (!d) return false;
        return new Date(d).getTime() >= fromTs;
      });
    }
    if (dateTo) {
      const toTs = toEndOfDay(dateTo);
      result = result.filter((i) => {
        const d = i.billing_at ?? i.pagarme_created_at;
        if (!d) return false;
        return new Date(d).getTime() <= toTs;
      });
    }
    return result;
  }, [data, statusFilter, planFilter, dateFrom, dateTo]);

  const breakdown = useMemo(() => {
    const map = new Map<string, { paid: number; pending: number; failed: number; count: number }>();
    for (const i of filtered) {
      const key = i.plan_name ?? 'Sem plano';
      const bucket = map.get(key) ?? { paid: 0, pending: 0, failed: 0, count: 0 };
      bucket.count++;
      const amount = i.amount ?? 0;
      if (i.status === 'paid') bucket.paid += amount;
      else if (i.status === 'pending') bucket.pending += amount;
      else if (i.status === 'failed') bucket.failed += amount;
      map.set(key, bucket);
    }
    return Array.from(map.entries())
      .map(([plan, v]) => ({ plan, ...v, total: v.paid + v.pending + v.failed }))
      .sort((a, b) => b.paid - a.paid);
  }, [filtered]);

  const grandTotal = useMemo(
    () => breakdown.reduce((s, b) => s + b.paid, 0),
    [breakdown],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _id, value: string) => {
      const v = value.toLowerCase();
      const r = row.original;
      return (
        (r.customer_name ?? '').toLowerCase().includes(v) ||
        (r.customer_email ?? '').toLowerCase().includes(v) ||
        (r.code ?? '').toLowerCase().includes(v) ||
        (r.pagarme_id ?? '').toLowerCase().includes(v)
      );
    },
    initialState: { pagination: { pageSize: 25 } },
  });

  function setToday() {
    const t = todayISO();
    setDateFrom(t);
    setDateTo(t);
  }

  function clearDates() {
    setDateFrom('');
    setDateTo('');
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-muted-foreground">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={setToday}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={clearDates}
            className="rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            Limpar datas
          </button>
          <div>
            <label className="block text-xs text-muted-foreground">Plano</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">Todos os planos</option>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="__none__">Sem plano</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">Todos</option>
              <option value="paid">Pagas</option>
              <option value="pending">Pendentes</option>
              <option value="failed">Falharam</option>
              <option value="canceled">Canceladas</option>
            </select>
          </div>
          <input
            type="search"
            placeholder="Buscar cliente ou código…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="ml-auto w-64 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Faturado por plano no filtro
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">Total pago: </span>
              <span className="font-semibold text-emerald-700">{formatBRL(grandTotal)}</span>
            </span>
          </div>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma fatura no filtro.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Plano</th>
                    <th className="py-1 pr-3 text-right">Faturas</th>
                    <th className="py-1 pr-3 text-right">Pago</th>
                    <th className="py-1 pr-3 text-right">Pendente</th>
                    <th className="py-1 pr-3 text-right">Falhas</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr key={b.plan} className="border-t">
                      <td className="py-1.5 pr-3 font-medium">{b.plan}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{b.count}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-700">
                        {formatBRL(b.paid)}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                        {formatBRL(b.pending)}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-red-700">
                        {formatBRL(b.failed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DataTableShell table={table} columnCount={columns.length} />
    </div>
  );
}
