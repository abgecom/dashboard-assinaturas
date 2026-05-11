'use client';

import {
  flexRender,
  type Table as TanTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export function DataTableShell<T>({
  table,
  empty = 'Nenhum resultado.',
  columnCount,
}: {
  table: TanTable<T>;
  empty?: string;
  columnCount: number;
}) {
  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();
                    const canSort = h.column.getCanSort();
                    return (
                      <th
                        key={h.id}
                        className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        {canSort ? (
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
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {empty}
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
    </>
  );
}
