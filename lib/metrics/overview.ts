import { createServiceClient } from '@/lib/supabase/server';
import type { DateRange } from './range';
import { previousRange } from './range';

export type OverviewMetrics = {
  activeSubscriptions: number;
  canceledSubscriptionsTotal: number;
  totalCustomers: number;
  newCustomersInRange: number;
  revenueInRange: number;
  revenuePrevRange: number;
  revenueDelta: number | null;
  paidChargesInRange: number;
  failedChargesInRange: number;
  paymentSuccessRate: number | null;
  churnRateInRange: number | null;
  avgTicketInRange: number;
  arpu: number;
  canceledInRange: number;
};

function sumPaid(rows: Array<{ paid_amount: number | null }> | null): number {
  return (rows ?? []).reduce((s, r) => s + (r.paid_amount ?? 0), 0);
}

function logError(label: string, error: unknown) {
  if (error) console.error(`[overview] ${label}:`, error);
}

export async function getOverviewMetrics(range: DateRange): Promise<OverviewMetrics> {
  const supabase = createServiceClient();
  const sinceISO = range.from.toISOString();
  const untilISO = range.to.toISOString();
  const prev = previousRange(range);
  const prevSinceISO = prev.from.toISOString();
  const prevUntilISO = prev.to.toISOString();

  const [
    activeSubs,
    canceledSubsTotal,
    customersTotal,
    newCustomers,
    revenueRows,
    revenuePrevRows,
    paidCount,
    failedCount,
    canceledInRangeRes,
    activeAtStart,
  ] = await Promise.all([
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled'),
    supabase.from('petloo_customers').select('id', { count: 'exact', head: true }),
    supabase
      .from('petloo_customers')
      .select('id', { count: 'exact', head: true })
      .gte('pagarme_created_at', sinceISO)
      .lte('pagarme_created_at', untilISO),
    supabase
      .from('petloo_charges')
      .select('paid_amount')
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null)
      .gte('paid_at', sinceISO)
      .lte('paid_at', untilISO),
    supabase
      .from('petloo_charges')
      .select('paid_amount')
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null)
      .gte('paid_at', prevSinceISO)
      .lte('paid_at', prevUntilISO),
    supabase
      .from('petloo_charges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null)
      .gte('paid_at', sinceISO)
      .lte('paid_at', untilISO),
    supabase
      .from('petloo_charges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .not('subscription_pagarme_id', 'is', null)
      .gte('created_at', sinceISO)
      .lte('created_at', untilISO),
    supabase
      .from('petloo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', sinceISO)
      .lte('canceled_at', untilISO),
    supabase
      .from('petloo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .lte('pagarme_created_at', sinceISO)
      .or(`canceled_at.is.null,canceled_at.gt.${sinceISO}`),
  ]);

  logError('activeSubs', activeSubs.error);
  logError('canceledSubsTotal', canceledSubsTotal.error);
  logError('customersTotal', customersTotal.error);
  logError('newCustomers', newCustomers.error);
  logError('revenueRows', revenueRows.error);
  logError('revenuePrevRows', revenuePrevRows.error);
  logError('paidCount', paidCount.error);
  logError('failedCount', failedCount.error);
  logError('canceledInRange', canceledInRangeRes.error);
  logError('activeAtStart', activeAtStart.error);

  const revenue = sumPaid(revenueRows.data as Array<{ paid_amount: number | null }> | null);
  const revenuePrev = sumPaid(revenuePrevRows.data as Array<{ paid_amount: number | null }> | null);
  const activeCount = activeSubs.count ?? 0;
  const paid = paidCount.count ?? 0;
  const failed = failedCount.count ?? 0;
  const canceledRng = canceledInRangeRes.count ?? 0;
  const activeStartCount = activeAtStart.count ?? 0;

  return {
    activeSubscriptions: activeCount,
    canceledSubscriptionsTotal: canceledSubsTotal.count ?? 0,
    totalCustomers: customersTotal.count ?? 0,
    newCustomersInRange: newCustomers.count ?? 0,
    revenueInRange: revenue,
    revenuePrevRange: revenuePrev,
    revenueDelta: revenuePrev > 0 ? (revenue - revenuePrev) / revenuePrev : null,
    paidChargesInRange: paid,
    failedChargesInRange: failed,
    paymentSuccessRate: paid + failed > 0 ? paid / (paid + failed) : null,
    churnRateInRange: activeStartCount > 0 ? canceledRng / activeStartCount : null,
    avgTicketInRange: paid > 0 ? revenue / paid : 0,
    arpu: activeCount > 0 ? revenue / activeCount : 0,
    canceledInRange: canceledRng,
  };
}

export type MonthlyRevenuePoint = { month: string; label: string; amount: number };

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenuePoint[]> {
  const supabase = createServiceClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const { data, error } = await supabase
    .from('petloo_charges')
    .select('paid_amount, paid_at')
    .eq('status', 'paid')
    .not('subscription_pagarme_id', 'is', null)
    .gte('paid_at', start.toISOString());

  logError('monthlyRevenue', error);

  const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const buckets = new Map<string, { label: string; amount: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`, amount: 0 });
  }

  for (const c of (data ?? []) as { paid_amount: number | null; paid_at: string | null }[]) {
    if (!c.paid_at || c.paid_amount == null) continue;
    const d = new Date(c.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.amount += c.paid_amount;
  }

  return Array.from(buckets.entries()).map(([month, b]) => ({ month, label: b.label, amount: b.amount }));
}

export type TopCustomer = {
  id: string;
  name: string | null;
  email: string | null;
  lifetime_value: number;
  active_subscriptions: number;
  last_payment_at: string | null;
};

export async function getTopCustomersByLTV(limit = 10): Promise<TopCustomer[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('petloo_customer_health')
    .select('id, name, email, lifetime_value, active_subscriptions, last_payment_at')
    .order('lifetime_value', { ascending: false })
    .limit(limit);
  logError('topCustomers', error);
  return (data ?? []) as TopCustomer[];
}
