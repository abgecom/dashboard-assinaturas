import type { createServiceClient } from '@/lib/supabase/server';

type Supabase = ReturnType<typeof createServiceClient>;

export type SyncTrigger = 'manual' | 'cron' | 'webhook' | 'initial';
export type SyncStatus = 'running' | 'success' | 'error';

export interface SyncLogResult {
  total?: number;
  inserted?: number;
  updated?: number;
  errorMessage?: string;
  details?: Record<string, unknown>;
}

export async function startSyncLog(
  supabase: Supabase,
  resource: string,
  trigger: SyncTrigger,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('petloo_sync_logs')
    .insert({ resource, trigger, status: 'running' })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create sync log: ${error.message}`);
  return data as { id: string };
}

export async function finishSyncLog(
  supabase: Supabase,
  logId: string,
  status: 'success' | 'error',
  result: SyncLogResult,
) {
  await supabase
    .from('petloo_sync_logs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      total_records: result.total ?? null,
      inserted_count: result.inserted ?? null,
      updated_count: result.updated ?? null,
      error_message: result.errorMessage ?? null,
      details: result.details ?? null,
    })
    .eq('id', logId);
}
