'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] error', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-3 rounded-lg border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold">Algo deu errado</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || 'Falha inesperada ao carregar esta página.'}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <RefreshCcw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    </div>
  );
}
