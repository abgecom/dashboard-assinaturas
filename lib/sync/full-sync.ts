import { syncPlans } from './plans';
import { syncCustomers } from './customers';
import { syncSubscriptions } from './subscriptions';
import { syncInvoices } from './invoices';
import { syncCharges } from './charges';
import type { SyncTrigger } from './log';

/**
 * Roda sync de todos os recursos na ordem correta de dependências.
 * Ordem: plans → customers → subscriptions → invoices → charges.
 */
export async function runFullSync(opts: { trigger: SyncTrigger; since?: Date } = { trigger: 'manual' }) {
  const results: Record<string, { total: number } | { error: string }> = {};

  for (const [name, fn] of [
    ['plans', () => syncPlans({ trigger: opts.trigger })],
    ['customers', () => syncCustomers({ trigger: opts.trigger, since: opts.since })],
    ['subscriptions', () => syncSubscriptions({ trigger: opts.trigger, since: opts.since })],
    ['invoices', () => syncInvoices({ trigger: opts.trigger, since: opts.since })],
    ['charges', () => syncCharges({ trigger: opts.trigger, since: opts.since })],
  ] as const) {
    try {
      results[name] = await fn();
    } catch (err) {
      results[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return results;
}
