import { createServiceClient } from '@/lib/supabase/server';
import { listCustomers } from '@/lib/pagarme/customers';
import type { PagarmeCustomer } from '@/lib/pagarme/types';
import { startSyncLog, finishSyncLog, type SyncTrigger } from './log';

const BATCH = 100;

function mapCustomer(c: PagarmeCustomer) {
  const phone = c.phones
    ? JSON.stringify(c.phones)
    : null;
  return {
    pagarme_id: c.id,
    name: c.name ?? null,
    email: c.email ?? null,
    document: c.document ?? null,
    document_type: c.document_type ?? null,
    type: c.type ?? null,
    phone,
    address: c.address ?? null,
    metadata: c.metadata ?? null,
    pagarme_created_at: c.created_at,
    pagarme_updated_at: c.updated_at,
    synced_at: new Date().toISOString(),
  };
}

export async function syncCustomers(opts: { trigger: SyncTrigger; since?: Date } = { trigger: 'manual' }) {
  const supabase = createServiceClient();
  const log = await startSyncLog(supabase, 'customers', opts.trigger);

  let total = 0;
  let buffer: ReturnType<typeof mapCustomer>[] = [];

  async function flush() {
    if (buffer.length === 0) return;
    const { error } = await supabase
      .from('petloo_customers')
      .upsert(buffer, { onConflict: 'pagarme_id', ignoreDuplicates: false });
    if (error) throw new Error(`Upsert customers failed: ${error.message}`);
    buffer = [];
  }

  try {
    const query = opts.since ? { created_since: opts.since.toISOString() } : undefined;
    for await (const c of listCustomers(query)) {
      total++;
      buffer.push(mapCustomer(c));
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
