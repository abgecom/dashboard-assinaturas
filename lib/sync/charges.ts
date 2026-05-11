import { createServiceClient } from '@/lib/supabase/server';
import { listCharges } from '@/lib/pagarme/charges';
import type { PagarmeCharge } from '@/lib/pagarme/types';
import { startSyncLog, finishSyncLog, type SyncTrigger } from './log';
import { loadIdMap } from './resolvers';

const BATCH = 100;

function mapCharge(
  ch: PagarmeCharge,
  customerMap: Map<string, string>,
  invoiceMap: Map<string, string>,
  subscriptionMap: Map<string, string>,
) {
  const customerPagarmeId = ch.customer?.id ?? null;
  const invoicePagarmeId = ch.invoice?.id ?? null;
  const subscriptionPagarmeId = ch.subscription?.id ?? null;
  return {
    pagarme_id: ch.id,
    customer_pagarme_id: customerPagarmeId,
    customer_id: customerPagarmeId ? customerMap.get(customerPagarmeId) ?? null : null,
    invoice_pagarme_id: invoicePagarmeId,
    invoice_id: invoicePagarmeId ? invoiceMap.get(invoicePagarmeId) ?? null : null,
    subscription_pagarme_id: subscriptionPagarmeId,
    subscription_id: subscriptionPagarmeId ? subscriptionMap.get(subscriptionPagarmeId) ?? null : null,
    code: ch.code ?? null,
    amount: ch.amount ?? null,
    paid_amount: ch.paid_amount ?? null,
    status: ch.status ?? null,
    currency: ch.currency ?? null,
    payment_method: ch.payment_method ?? null,
    due_at: ch.due_at ?? null,
    paid_at: ch.paid_at ?? null,
    canceled_at: ch.canceled_at ?? null,
    last_transaction: ch.last_transaction ?? null,
    metadata: ch.metadata ?? null,
    pagarme_created_at: ch.created_at,
    pagarme_updated_at: ch.updated_at,
    synced_at: new Date().toISOString(),
  };
}

export async function syncCharges(opts: { trigger: SyncTrigger; since?: Date } = { trigger: 'manual' }) {
  const supabase = createServiceClient();
  const log = await startSyncLog(supabase, 'charges', opts.trigger);
  let total = 0;
  let buffer: ReturnType<typeof mapCharge>[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const { error } = await supabase
      .from('petloo_charges')
      .upsert(buffer, { onConflict: 'pagarme_id' });
    if (error) throw new Error(`Upsert charges failed: ${error.message}`);
    buffer = [];
  }

  try {
    const [customerMap, invoiceMap, subscriptionMap] = await Promise.all([
      loadIdMap(supabase, 'petloo_customers'),
      loadIdMap(supabase, 'petloo_invoices'),
      loadIdMap(supabase, 'petloo_subscriptions'),
    ]);
    const query = opts.since ? { created_since: opts.since.toISOString() } : undefined;
    for await (const ch of listCharges(query)) {
      total++;
      buffer.push(mapCharge(ch, customerMap, invoiceMap, subscriptionMap));
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
