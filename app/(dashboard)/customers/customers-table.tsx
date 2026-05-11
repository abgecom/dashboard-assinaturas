'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBRL, formatDate } from '@/lib/utils';
import type { CustomerRow } from '@/lib/queries/customers';

const columnHelper = createColumnHelper<CustomerRow>();

const columns = [
  columnHelper.accessor('name', {
    header: 'Cliente',
    cell: (info) => {
      const row = info.row.original;
      return (
        <Link href={`/customers/${row.id}`} className="block min-w-0">
          <div className="truncate font-medium">{row.name ?? '—'}</div>
          <div className="truncate text-xs text-muted-foreground">{row.email ?? '—'}</div>
        </Link>
      );
    },
    filterFn: 'includesString',
  }),
  columnHelper.accessor('current_plan', {
    header: 'Plano atual',
    cell: (info) => info.getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('active_subscriptions', {
    header: 'Status',
    cell: (info) => {
      const active = info.getValue() ?? 0;
      const canceled = info.row.original.canceled_subscriptions ?? 0;
      if (active > 0) return <Badge variant="success">Ativo</Badge>;
      if (canceled > 0) return <Badge variant="destructive">Cancelado</Badge>;
      return <Badge variant="muted">Sem assinatura</Badge>;
    },
  }),
  columnHelper.accessor('lifetime_value', {
    header: 'LTV',
    cell: (info) => <span className="font-medium">{formatBRL(info.getValue())}</span>,
  }),
  columnHelper.accessor('paid_charges_count', {
    header: 'Pagas',
    cell: (info) => info.getValue() ?? 0,
  }),
  columnHelper.accessor('failed_charges_count', {
    header: 'Falhas',
    cell: (info) => {
      const v = info.getValue() ?? 0;
      return v > 0 ? <span className="text-red-600">{v}</span> : v;
    },
  }),
  columnHelper.accessor('last_payment_at', {
    header: 'Último pgto',
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('customer_since', {
    header: 'Cliente desde',
    cell: (info) => formatDate(info.getValue()),
  }),
];

export function CustomersTable({ data }: { data: CustomerRow[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled' | 'none'>('all');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'customer_since', desc: true },
  ]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return data;
    return data.filter((c) => {
      const active = c.active_subscriptions ?? 0;
      const canceled = c.canceled_subscriptions ?? 0;
      if (statusFilter === 'active') return active > 0;
      if (statusFilter === 'canceled') return active === 0 && canceled > 0;
      return active === 0 && canceled === 0;
    });
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
    globalFilterFn: (row, _columnId, value: string) => {
      const v = value.toLowerCase();
      const c = row.original;
      return (
        (c.name ?? '').toLowerCase().includes(v) ||
        (c.email ?? '').toLowerCase().includes(v) ||
        (c.document ?? '').toLowerCase().includes(v)
      );
    },
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nome, email ou CPF…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-64 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="canceled">Cancelados</option>
          <option value="none">Sem assinatura</option>
        </select>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : sorted === 'desc' ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-accent/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1} —{' '}
          {table.getFilteredRowModel().rows.length} resultados
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border px-3 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border px-3 py-1 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
