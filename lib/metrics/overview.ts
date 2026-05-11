import { createServiceClient } from '@/lib/supabase/server';

const DAY_MS = 24 * 60 * 60 * 1000;

export type OverviewMetrics = {
  activeSubscriptions: number;
  canceledSubscriptions: number;
  totalCustomers: number;
  newCustomers30: number;
  revenue30: number;
  revenuePrev30: number;
  revenueDelta: number | null;
  paidCharges30: number;
  failedCharges30: number;
  paymentSuccessRate: number | null;
  churnRate30: number | null;
  avgTicket30: number;
  arpu: number;
};

export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  const supabase = createServiceClient();
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * DAY_MS);
  const prev30Start = new Date(now.getTime() - 60 * DAY_MS);

  const [
    activeSubs,
    canceledSubs,
    revenue30Rows,
    revenuePrev30Rows,
    customersTotal,
    newCustomers30,
    paidCharges30,
    failedCharges30,
    canceledLast30,
    activeAtStart,
  ] = await Promise.all([
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled'),
    supabase.from('petloo_charges').select('paid_amount').eq('status', 'paid').gte('paid_at', last30.toISOString()),
    supabase.from('petloo_charges').select('paid_amount').eq('status', 'paid').gte('paid_at', prev30Start.toISOString()).lt('paid_at', last30.toISOString()),
    supabase.from('petloo_customers').select('id', { count: 'exact', head: true }),
    supabase.from('petloo_customers').select('id', { count: 'exact', head: true }).gte('pagarme_created_at', last30.toISOString()),
    supabase.from('petloo_charges').select('id', { count: 'exact', head: true }).eq('status', 'paid').gte('paid_at', last30.toISOString()),
    supabase.from('petloo_charges').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', last30.toISOString()),
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled').gte('canceled_at', last30.toISOString()),
    supabase
      .from('petloo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .lte('pagarme_created_at', last30.toISOString())
      .or(`canceled_at.is.null,canceled_at.gt.${last30.toISOString()}`),
  ]);

  const sumPaid = (rows: { paid_amount: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (r.paid_amount ?? 0), 0);

  const revenue30 = sumPaid(revenue30Rows.data);
  const revenuePrev30 = sumPaid(revenuePrev30Rows.data);
  const activeCount = activeSubs.count ?? 0;
  const paidCount = paidCharges30.count ?? 0;
  const failedCount = failedCharges30.count ?? 0;
  const canceled30 = canceledLast30.count ?? 0;
  const activeStartCount = activeAtStart.count ?? 0;

  return {
    activeSubscriptions: activeCount,
    canceledSubscriptions: canceledSubs.count ?? 0,
    totalCustomers: customersTotal.count ?? 0,
    newCustomers30: newCustomers30.count ?? 0,
    revenue30,
    revenuePrev30,
    revenueDelta: revenuePrev30 > 0 ? (revenue30 - revenuePrev30) / revenuePrev30 : null,
    paidCharges30: paidCount,
    failedCharges30: failedCount,
    paymentSuccessRate: paidCount + failedCount > 0 ? paidCount / (paidCount + failedCount) : null,
    churnRate30: activeStartCount > 0 ? canceled30 / activeStartCount : null,
    avgTicket30: paidCount > 0 ? revenue30 / paidCount : 0,
    arpu: activeCount > 0 ? revenue30 / activeCount : 0,
  };
}

export type MonthlyRevenuePoint = { month: string; label: string; amount: number };

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenuePoint[]> {
  const supabase = createServiceClient();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const { data } = await supabase
    .from('petloo_charges')
    .select('paid_amount, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', start.toISOString());

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
  const { data } = await supabase
    .from('petloo_customer_health')
    .select('id, name, email, lifetime_value, active_subscriptions, last_payment_at')
    .order('lifetime_value', { ascending: false })
    .limit(limit);
  return (data ?? []) as TopCustomer[];
}
