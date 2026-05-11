import { createServiceClient } from '@/lib/supabase/server';
import type { DateRange } from './range';

export type PlanBreakdownRow = {
  plan: string;
  invoice_count: number;
  paid_count: number;
  paid_amount: number;
  pending_count: number;
  pending_amount: number;
  failed_count: number;
  failed_amount: number;
  canceled_subscriptions: number;
};

export async function getPlanBreakdown(range: DateRange): Promise<PlanBreakdownRow[]> {
  const supabase = createServiceClient();
  const sinceISO = range.from.toISOString();
  const untilISO = range.to.toISOString();

  const [invoicesRes, canceledRes] = await Promise.all([
    supabase
      .from('petloo_invoices')
      .select('amount, status, petloo_subscriptions(petloo_plans(name))')
      .gte('pagarme_created_at', sinceISO)
      .lte('pagarme_created_at', untilISO),
    supabase
      .from('petloo_subscriptions')
      .select('petloo_plans(name)')
      .eq('status', 'canceled')
      .gte('canceled_at', sinceISO)
      .lte('canceled_at', untilISO),
  ]);

  if (invoicesRes.error) console.error('[breakdown] invoices:', invoicesRes.error);
  if (canceledRes.error) console.error('[breakdown] canceled:', canceledRes.error);

  const map = new Map<string, PlanBreakdownRow>();
  function getRow(plan: string): PlanBreakdownRow {
    let row = map.get(plan);
    if (!row) {
      row = {
        plan,
        invoice_count: 0,
        paid_count: 0,
        paid_amount: 0,
        pending_count: 0,
        pending_amount: 0,
        failed_count: 0,
        failed_amount: 0,
        canceled_subscriptions: 0,
      };
      map.set(plan, row);
    }
    return row;
  }

  for (const inv of (invoicesRes.data ?? []) as any[]) {
    const plan: string = inv.petloo_subscriptions?.petloo_plans?.name ?? 'Sem plano';
    const row = getRow(plan);
    row.invoice_count++;
    const amount = inv.amount ?? 0;
    if (inv.status === 'paid') {
      row.paid_count++;
      row.paid_amount += amount;
    } else if (inv.status === 'pending') {
      row.pending_count++;
      row.pending_amount += amount;
    } else if (inv.status === 'failed') {
      row.failed_count++;
      row.failed_amount += amount;
    }
  }

  for (const sub of (canceledRes.data ?? []) as any[]) {
    const plan: string = sub.petloo_plans?.name ?? 'Sem plano';
    const row = getRow(plan);
    row.canceled_subscriptions++;
  }

  return Array.from(map.values()).sort((a, b) => b.paid_amount - a.paid_amount);
}

export type ForecastRow = {
  plan: string;
  subscription_count: number;
  estimated_amount: number;
  unknown_value_count: number;
};

export type Forecast = {
  rows: ForecastRow[];
  totalAmount: number;
  totalCount: number;
  unknownValueCount: number;
};

function planPriceFromItems(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  let total = 0;
  for (const item of items as any[]) {
    const qty = typeof item?.quantity === 'number' ? item.quantity : 1;
    const price =
      typeof item?.pricing_scheme?.price === 'number' ? item.pricing_scheme.price : 0;
    total += qty * price;
  }
  return total;
}

/**
 * Previsibilidade: subs ativas com next_billing_at no período × valor estimado.
 * Estimativa por sub (em ordem de preferência):
 *   1. Última fatura paga daquela sub
 *   2. Preço do plano (de petloo_plans.items.pricing_scheme.price) — usado pra subs em trial
 */
export async function getForecast(range: DateRange): Promise<Forecast> {
  const supabase = createServiceClient();

  const { data: subs, error: subsErr } = await supabase
    .from('petloo_subscriptions')
    .select('id, plan_id, status, petloo_plans(name)')
    .neq('status', 'canceled')
    .gte('next_billing_at', range.from.toISOString())
    .lte('next_billing_at', range.to.toISOString())
    .limit(5000);

  if (subsErr) console.error('[forecast] subs:', subsErr);

  const subList = (subs ?? []) as any[];
  if (subList.length === 0) {
    return { rows: [], totalAmount: 0, totalCount: 0, unknownValueCount: 0 };
  }

  const subIds = subList.map((s) => s.id as string);
  const planIds = Array.from(new Set(subList.map((s) => s.plan_id).filter(Boolean))) as string[];

  const [lastInvsRes, plansRes] = await Promise.all([
    supabase
      .from('petloo_invoices')
      .select('subscription_id, amount, paid_at')
      .eq('status', 'paid')
      .in('subscription_id', subIds)
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(10000),
    planIds.length > 0
      ? supabase.from('petloo_plans').select('id, items').in('id', planIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (lastInvsRes.error) console.error('[forecast] last invoices:', lastInvsRes.error);
  if (plansRes.error) console.error('[forecast] plans:', plansRes.error);

  const lastAmount = new Map<string, number>();
  for (const inv of (lastInvsRes.data ?? []) as any[]) {
    if (!inv.subscription_id || inv.amount == null) continue;
    if (!lastAmount.has(inv.subscription_id)) {
      lastAmount.set(inv.subscription_id, inv.amount);
    }
  }

  const planPrice = new Map<string, number>();
  for (const p of (plansRes.data ?? []) as any[]) {
    const price = planPriceFromItems(p.items);
    if (price > 0) planPrice.set(p.id, price);
  }

  const planMap = new Map<string, ForecastRow>();
  let totalAmount = 0;
  let totalCount = 0;
  let unknownValueCount = 0;

  for (const sub of subList) {
    const plan: string = sub.petloo_plans?.name ?? 'Sem plano';
    let row = planMap.get(plan);
    if (!row) {
      row = { plan, subscription_count: 0, estimated_amount: 0, unknown_value_count: 0 };
      planMap.set(plan, row);
    }
    row.subscription_count++;
    totalCount++;

    let amount = lastAmount.get(sub.id);
    if (amount == null && sub.plan_id) {
      amount = planPrice.get(sub.plan_id);
    }
    if (amount != null && amount > 0) {
      row.estimated_amount += amount;
      totalAmount += amount;
    } else {
      row.unknown_value_count++;
      unknownValueCount++;
    }
  }

  return {
    rows: Array.from(planMap.values()).sort((a, b) => b.estimated_amount - a.estimated_amount),
    totalAmount,
    totalCount,
    unknownValueCount,
  };
}
