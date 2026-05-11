import { createServiceClient } from '@/lib/supabase/server';
import { listPlans } from '@/lib/pagarme/plans';
import type { PagarmePlan } from '@/lib/pagarme/types';
import { startSyncLog, finishSyncLog, type SyncTrigger } from './log';

function mapPlan(p: PagarmePlan) {
  return {
    pagarme_id: p.id,
    name: p.name ?? null,
    description: p.description ?? null,
    status: p.status ?? null,
    interval: p.interval ?? null,
    interval_count: p.interval_count ?? null,
    billing_type: p.billing_type ?? null,
    payment_methods: p.payment_methods ?? null,
    installments: p.installments ?? null,
    items: p.items ?? null,
    metadata: p.metadata ?? null,
    pagarme_created_at: p.created_at,
    pagarme_updated_at: p.updated_at,
    synced_at: new Date().toISOString(),
  };
}

export async function syncPlans(opts: { trigger: SyncTrigger } = { trigger: 'manual' }) {
  const supabase = createServiceClient();
  const log = await startSyncLog(supabase, 'plans', opts.trigger);
  let total = 0;
  const buffer: ReturnType<typeof mapPlan>[] = [];
  try {
    for await (const p of listPlans()) {
      total++;
      buffer.push(mapPlan(p));
    }
    if (buffer.length) {
      const { error } = await supabase
        .from('petloo_plans')
        .upsert(buffer, { onConflict: 'pagarme_id' });
      if (error) throw new Error(`Upsert plans failed: ${error.message}`);
    }
    await finishSyncLog(supabase, log.id, 'success', { total });
    return { total };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishSyncLog(supabase, log.id, 'error', { total, errorMessage: message });
    throw err;
  }
}
