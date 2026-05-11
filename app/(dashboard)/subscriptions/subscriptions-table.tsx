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
import { formatDate } from '@/lib/utils';
import type { SubscriptionRow } from '@/lib/queries/subscriptions';

const columnHelper = createColumnHelper<SubscriptionRow>();

const columns = [
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
  columnHelper.accessor('payment_method', {
    header: 'Pagamento',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('start_at', {
    header: 'Início',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('next_billing_at', {
    header: 'Próx. cobrança',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('canceled_at', {
    header: 'Cancelada em',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('code', {
    header: 'Código',
    cell: (info) => <span className="font-mono text-xs">{info.getValue() ?? '—'}</span>,
  }),
];

export function SubscriptionsTable({ data }: { data: SubscriptionRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'start_at', desc: true },
  ]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return data;
    return data.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

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
        (r.plan_name ?? '').toLowerCase().includes(v) ||
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
          placeholder="Buscar por cliente, plano, código…"
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
          <option value="active">Ativas</option>
          <option value="canceled">Canceladas</option>
          <option value="future">Futuras</option>
        </select>
      </div>
      <DataTableShell table={table} columnCount={columns.length} />
    </div>
  );
}
