import { createServiceClient } from '@/lib/supabase/server';
import { getCustomer } from '@/lib/pagarme/customers';
import { getPlan } from '@/lib/pagarme/plans';
import { getSubscription } from '@/lib/pagarme/subscriptions';
import { getInvoice } from '@/lib/pagarme/invoices';
import { getCharge } from '@/lib/pagarme/charges';
import type {
  PagarmeCustomer,
  PagarmePlan,
  PagarmeSubscription,
  PagarmeInvoice,
  PagarmeCharge,
} from '@/lib/pagarme/types';

type Supabase = ReturnType<typeof createServiceClient>;

async function resolveLocalId(
  supabase: Supabase,
  table: 'petloo_customers' | 'petloo_plans' | 'petloo_subscriptions' | 'petloo_invoices',
  pagarmeId: string | null | undefined,
): Promise<string | null> {
  if (!pagarmeId) return null;
  const { data } = await supabase.from(table).select('id').eq('pagarme_id', pagarmeId).maybeSingle();
  return ((data as { id: string } | null)?.id) ?? null;
}

export async function upsertCustomerFromPayload(c: PagarmeCustomer) {
  const supabase = createServiceClient();
  const row = {
    pagarme_id: c.id,
    name: c.name ?? null,
    email: c.email ?? null,
    document: c.document ?? null,
    document_type: c.document_type ?? null,
    type: c.type ?? null,
    phone: c.phones ? JSON.stringify(c.phones) : null,
    address: c.address ?? null,
    metadata: c.metadata ?? null,
    pagarme_created_at: c.created_at,
    pagarme_updated_at: c.updated_at,
    synced_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('petloo_customers').upsert(row, { onConflict: 'pagarme_id' });
  if (error) throw new Error(`Upsert customer failed: ${error.message}`);
}

export async function upsertPlanFromPayload(p: PagarmePlan) {
  const supabase = createServiceClient();
  const row = {
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
  const { error } = await supabase.from('petloo_plans').upsert(row, { onConflict: 'pagarme_id' });
  if (error) throw new Error(`Upsert plan failed: ${error.message}`);
}

export async function upsertSubscriptionFromPayload(s: PagarmeSubscription) {
  const supabase = createServiceClient();
  const customerPagarmeId = s.customer?.id ?? null;
  const planPagarmeId = s.plan?.id ?? null;
  const [customer_id, plan_id] = await Promise.all([
    resolveLocalId(supabase, 'petloo_customers', customerPagarmeId),
    resolveLocalId(supabase, 'petloo_plans', planPagarmeId),
  ]);
  const row = {
    pagarme_id: s.id,
    customer_pagarme_id: customerPagarmeId,
    customer_id,
    plan_pagarme_id: planPagarmeId,
    plan_id,
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
  const { error } = await supabase.from('petloo_subscriptions').upsert(row, { onConflict: 'pagarme_id' });
  if (error) throw new Error(`Upsert subscription failed: ${error.message}`);
}

export async function upsertInvoiceFromPayload(inv: PagarmeInvoice) {
  const supabase = createServiceClient();
  const customerPagarmeId = inv.customer?.id ?? null;
  const subscriptionPagarmeId = inv.subscription?.id ?? null;
  const [customer_id, subscription_id] = await Promise.all([
    resolveLocalId(supabase, 'petloo_customers', customerPagarmeId),
    resolveLocalId(supabase, 'petloo_subscriptions', subscriptionPagarmeId),
  ]);
  const row = {
    pagarme_id: inv.id,
    subscription_pagarme_id: subscriptionPagarmeId,
    subscription_id,
    customer_pagarme_id: customerPagarmeId,
    customer_id,
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
  const { error } = await supabase.from('petloo_invoices').upsert(row, { onConflict: 'pagarme_id' });
  if (error) throw new Error(`Upsert invoice failed: ${error.message}`);
}

export async function upsertChargeFromPayload(ch: PagarmeCharge) {
  const supabase = createServiceClient();
  const customerPagarmeId = ch.customer?.id ?? null;
  const invoicePagarmeId = ch.invoice?.id ?? null;
  const subscriptionPagarmeId = ch.subscription?.id ?? null;
  const [customer_id, invoice_id, subscription_id] = await Promise.all([
    resolveLocalId(supabase, 'petloo_customers', customerPagarmeId),
    resolveLocalId(supabase, 'petloo_invoices', invoicePagarmeId),
    resolveLocalId(supabase, 'petloo_subscriptions', subscriptionPagarmeId),
  ]);
  const row = {
    pagarme_id: ch.id,
    customer_pagarme_id: customerPagarmeId,
    customer_id,
    invoice_pagarme_id: invoicePagarmeId,
    invoice_id,
    subscription_pagarme_id: subscriptionPagarmeId,
    subscription_id,
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
  const { error } = await supabase.from('petloo_charges').upsert(row, { onConflict: 'pagarme_id' });
  if (error) throw new Error(`Upsert charge failed: ${error.message}`);
}

export async function refetchAndUpsertCustomer(id: string) {
  const c = await getCustomer(id);
  await upsertCustomerFromPayload(c);
}

export async function refetchAndUpsertPlan(id: string) {
  const p = await getPlan(id);
  await upsertPlanFromPayload(p);
}

export async function refetchAndUpsertSubscription(id: string) {
  const s = await getSubscription(id);
  await upsertSubscriptionFromPayload(s);
}

export async function refetchAndUpsertInvoice(id: string) {
  const inv = await getInvoice(id);
  await upsertInvoiceFromPayload(inv);
}

export async function refetchAndUpsertCharge(id: string) {
  const ch = await getCharge(id);
  await upsertChargeFromPayload(ch);
}
