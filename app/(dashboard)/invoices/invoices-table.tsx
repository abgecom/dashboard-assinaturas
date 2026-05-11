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
  columnHelper.accessor('pagarme_created_at', {
    header: 'Criada em',
    cell: (info) => formatDate(info.getValue()),
  }),
];

type DateRange = 'all' | '7d' | '30d' | '90d';

const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [range, setRange] = useState<DateRange>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'billing_at', desc: true },
  ]);

  const filtered = useMemo(() => {
    let result = data;
    if (statusFilter !== 'all') result = result.filter((i) => i.status === statusFilter);
    if (range !== 'all') {
      const cutoff = Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
      result = result.filter((i) => {
        const d = i.billing_at ?? i.pagarme_created_at;
        if (!d) return false;
        return new Date(d).getTime() >= cutoff;
      });
    }
    return result;
  }, [data, statusFilter, range]);

  const total = useMemo(
    () => filtered.reduce((s, i) => s + (i.status === 'paid' ? (i.amount ?? 0) : 0), 0),
    [filtered],
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
          <option value="failed">Falharam</option>
          <option value="canceled">Canceladas</option>
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
        <div className="ml-auto rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Total pago no filtro: </span>
          <span className="font-semibold">{formatBRL(total)}</span>
        </div>
      </div>
      <DataTableShell table={table} columnCount={columns.length} />
    </div>
  );
}
