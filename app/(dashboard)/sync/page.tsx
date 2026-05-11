import { createServiceClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { SyncControls } from './sync-controls';

export const dynamic = 'force-dynamic';

interface SyncLog {
  id: string;
  resource: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_records: number | null;
  inserted_count: number | null;
  updated_count: number | null;
  error_message: string | null;
}

async function getRecentLogs(): Promise<SyncLog[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('petloo_sync_logs')
    .select('id, resource, trigger, status, started_at, finished_at, total_records, inserted_count, updated_count, error_message')
    .order('started_at', { ascending: false })
    .limit(50);
  return (data ?? []) as SyncLog[];
}

function durationMs(started: string, finished: string | null) {
  if (!finished) return null;
  return new Date(finished).getTime() - new Date(started).getTime();
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success'
      ? 'bg-green-100 text-green-800'
      : status === 'error'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

export default async function SyncPage() {
  const logs = await getRecentLogs();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sincronização</h1>
        <p className="text-sm text-muted-foreground">
          Puxa dados da Pagar.me e popula as tabelas locais. Use sync por recurso para
          rodadas pontuais ou &quot;Sync completo&quot; para a primeira carga.
        </p>
      </div>

      <SyncControls />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Últimas execuções
        </h2>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Gatilho</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Iniciado</th>
                <th className="px-3 py-2">Duração</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const dur = durationMs(l.started_at, l.finished_at);
                return (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{l.resource}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.trigger}</td>
                    <td className="px-3 py-2"><StatusBadge status={l.status} /></td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDateTime(l.started_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{dur != null ? `${(dur / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.total_records ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-destructive">{l.error_message ?? ''}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nenhuma execução ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
