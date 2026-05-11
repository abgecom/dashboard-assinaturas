import { createServiceClient } from '@/lib/supabase/server';
import { listSubscriptions } from '@/lib/pagarme/subscriptions';
import type { PagarmeSubscription } from '@/lib/pagarme/types';
import { startSyncLog, finishSyncLog, type SyncTrigger } from './log';
import { loadIdMap } from './resolvers';

const BATCH = 100;

function mapSubscription(
  s: PagarmeSubscription,
  customerMap: Map<string, string>,
  planMap: Map<string, string>,
) {
  const customerPagarmeId = s.customer?.id ?? null;
  const planPagarmeId = s.plan?.id ?? null;
  return {
    pagarme_id: s.id,
    customer_pagarme_id: customerPagarmeId,
    customer_id: customerPagarmeId ? customerMap.get(customerPagarmeId) ?? null : null,
    plan_pagarme_id: planPagarmeId,
    plan_id: planPagarmeId ? planMap.get(planPagarmeId) ?? null : null,
    code: s.code ?? null,
    status: s.status ?? null,
    payment_method: s.payment_method ?? null,
    currency: s.currency ?? null,
    interval: s.interval ?? null,
    interval_count: s.interval_count ?? null,
    billing_type: s.billing_type ?? null,
    installments: s.installments ?? null,
    start_at: s.start_at ?? null,
    next_billing_at: s.next_billing_at ?? null,
    current_cycle: s.current_cycle ?? null,
    card: s.card ?? null,
    items: s.items ?? null,
    metadata: s.metadata ?? null,
    pagarme_created_at: s.created_at,
    pagarme_updated_at: s.updated_at,
    canceled_at: s.canceled_at ?? null,
    synced_at: new Date().toISOString(),
  };
}

export async function syncSubscriptions(opts: { trigger: SyncTrigger; since?: Date } = { trigger: 'manual' }) {
  const supabase = createServiceClient();
  const log = await startSyncLog(supabase, 'subscriptions', opts.trigger);
  let total = 0;
  let buffer: ReturnType<typeof mapSubscription>[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const { error } = await supabase
      .from('petloo_subscriptions')
      .upsert(buffer, { onConflict: 'pagarme_id' });
    if (error) throw new Error(`Upsert subscriptions failed: ${error.message}`);
    buffer = [];
  }

  try {
    const [customerMap, planMap] = await Promise.all([
      loadIdMap(supabase, 'petloo_customers'),
      loadIdMap(supabase, 'petloo_plans'),
    ]);
    const query = opts.since ? { created_since: opts.since.toISOString() } : undefined;
    for await (const s of listSubscriptions(query)) {
      total++;
      buffer.push(mapSubscription(s, customerMap, planMap));
      if (buffer.length >= BATCH) await flush();
    }
    await flush();
    await finishSyncLog(supabase, log.id, 'success', { total });
    return { total };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishSyncLog(supabase, log.id, 'error', { total, errorMessage: message });
    throw err;
  }
}
