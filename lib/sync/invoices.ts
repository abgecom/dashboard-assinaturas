import { createServiceClient } from '@/lib/supabase/server';
import { listInvoices } from '@/lib/pagarme/invoices';
import type { PagarmeInvoice } from '@/lib/pagarme/types';
import { startSyncLog, finishSyncLog, type SyncTrigger } from './log';
import { loadIdMap } from './resolvers';

const BATCH = 100;

function mapInvoice(
  inv: PagarmeInvoice,
  customerMap: Map<string, string>,
  subscriptionMap: Map<string, string>,
) {
  const customerPagarmeId = inv.customer?.id ?? null;
  const subscriptionPagarmeId = inv.subscription?.id ?? null;
  return {
    pagarme_id: inv.id,
    subscription_pagarme_id: subscriptionPagarmeId,
    subscription_id: subscriptionPagarmeId ? subscriptionMap.get(subscriptionPagarmeId) ?? null : null,
    customer_pagarme_id: customerPagarmeId,
    customer_id: customerPagarmeId ? customerMap.get(customerPagarmeId) ?? null : null,
    charge_pagarme_id: inv.charge?.id ?? null,
    cycle: inv.cycle ?? null,
    code: inv.code ?? null,
    amount: inv.amount ?? null,
    installments: inv.installments ?? null,
    status: inv.status ?? null,
    payment_method: inv.payment_method ?? null,
    billing_at: inv.billing_at ?? null,
    seen_at: inv.seen_at ?? null,
    total_discount: inv.total_discount ?? null,
    total_increment: inv.total_increment ?? null,
    subtotal: inv.subtotal ?? null,
    metadata: inv.metadata ?? null,
    pagarme_created_at: inv.created_at,
    pagarme_updated_at: inv.updated_at,
    synced_at: new Date().toISOString(),
  };
}

export async function syncInvoices(opts: { trigger: SyncTrigger; since?: Date } = { trigger: 'manual' }) {
  const supabase = createServiceClient();
  const log = await startSyncLog(supabase, 'invoices', opts.trigger);
  let total = 0;
  let buffer: ReturnType<typeof mapInvoice>[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const { error } = await supabase
      .from('petloo_invoices')
      .upsert(buffer, { onConflict: 'pagarme_id' });
    if (error) throw new Error(`Upsert invoices failed: ${error.message}`);
    buffer = [];
  }

  try {
    const [customerMap, subscriptionMap] = await Promise.all([
      loadIdMap(supabase, 'petloo_customers'),
      loadIdMap(supabase, 'petloo_subscriptions'),
    ]);
    const query = opts.since ? { created_since: opts.since.toISOString() } : undefined;
    for await (const inv of listInvoices(query)) {
      total++;
      buffer.push(mapInvoice(inv, customerMap, subscriptionMap));
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
