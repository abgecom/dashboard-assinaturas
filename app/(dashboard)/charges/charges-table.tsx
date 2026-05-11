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
import { formatBRL, formatDate, formatDateTime } from '@/lib/utils';
import type { ChargeRow } from '@/lib/queries/charges';

const columnHelper = createColumnHelper<ChargeRow>();

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
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('amount', {
    header: 'Valor',
    cell: (info) => formatBRL(info.getValue()),
  }),
  columnHelper.accessor('paid_amount', {
    header: 'Pago',
    cell: (info) => {
      const v = info.getValue();
      return v ? <span className="font-medium text-emerald-700">{formatBRL(v)}</span> : '—';
    },
  }),
  columnHelper.accessor('payment_method', {
    header: 'Método',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('due_at', {
    header: 'Vencimento',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('paid_at', {
    header: 'Pago em',
    cell: (info) => formatDateTime(info.getValue()),
  }),
];

type DateRange = 'all' | '7d' | '30d' | '90d';

const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function ChargesTable({ data }: { data: ChargeRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'pagarme_created_at', desc: true },
  ]);

  const methods = useMemo(() => {
    const set = new Set<string>();
    for (const c of data) if (c.payment_method) set.add(c.payment_method);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== 'all') result = result.filter((c) => c.status === statusFilter);
    if (methodFilter !== 'all') result = result.filter((c) => c.payment_method === methodFilter);
    if (range !== 'all') {
      const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
      result = result.filter((c) => {
        const d = c.pagarme_created_at;
        if (!d) return false;
        return new Date(d).getTime() >= cutoff;
      });
    }
    return result;
  }, [data, statusFilter, methodFilter, range]);

  const totals = useMemo(() => {
    let paid = 0;
    let failed = 0;
    for (const c of filtered) {
      if (c.status === 'paid') paid += c.paid_amount ?? 0;
      else if (c.status === 'failed') failed += c.amount ?? 0;
    }
    return { paid, failed };
  }, [filtered]);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por cliente ou código…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-72 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="paid">Pagas</option>
          <option value="pending">Pendentes</option>
          <option value="processing">Processando</option>
          <option value="failed">Falharam</option>
          <option value="refunded">Reembolsadas</option>
          <option value="chargedback">Chargeback</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os métodos</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as DateRange)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
        <div className="ml-auto flex gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span>
            <span className="text-muted-foreground">Pago: </span>
            <span className="font-semibold text-emerald-700">{formatBRL(totals.paid)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Falhou: </span>
            <span className="font-semibold text-red-700">{formatBRL(totals.failed)}</span>
          </span>
        </div>
      </div>
      <DataTableShell table={table} columnCount={columns.length} />
    </div>
  );
}
