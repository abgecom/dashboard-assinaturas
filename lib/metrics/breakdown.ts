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
      .gte('billing_at', sinceISO)
      .lte('billing_at', untilISO),
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
  invoice_count: number;
  total_amount: number;
};

export type Forecast = {
  rows: ForecastRow[];
  totalAmount: number;
  totalCount: number;
};

export async function getForecast(range: DateRange): Promise<Forecast> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('petloo_invoices')
    .select('amount, status, petloo_subscriptions(petloo_plans(name))')
    .eq('status', 'pending')
    .gte('billing_at', range.from.toISOString())
    .lte('billing_at', range.to.toISOString());

  if (error) console.error('[forecast]:', error);

  const map = new Map<string, ForecastRow>();
  let totalAmount = 0;
  let totalCount = 0;

  for (const inv of (data ?? []) as any[]) {
    const plan: string = inv.petloo_subscriptions?.petloo_plans?.name ?? 'Sem plano';
    let row = map.get(plan);
    if (!row) {
      row = { plan, invoice_count: 0, total_amount: 0 };
      map.set(plan, row);
    }
    row.invoice_count++;
    const amount = inv.amount ?? 0;
    row.total_amount += amount;
    totalAmount += amount;
    totalCount++;
  }

  return {
    rows: Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount),
    totalAmount,
    totalCount,
  };
}
