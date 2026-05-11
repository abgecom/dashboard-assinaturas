import { createServiceClient } from '@/lib/supabase/server';

const DAY_MS = 24 * 60 * 60 * 1000;

export type OverviewRange = '7d' | '30d' | '90d' | '12m' | 'all';

const RANGE_DAYS: Record<Exclude<OverviewRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '12m': 365,
};

export const RANGE_LABELS: Record<OverviewRange, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '12m': 'Últimos 12 meses',
  all: 'Todo o período',
};

function rangeBounds(range: OverviewRange): {
  since: Date | null;
  prevSince: Date | null;
  prevUntil: Date | null;
} {
  if (range === 'all') return { since: null, prevSince: null, prevUntil: null };
  const days = RANGE_DAYS[range];
  const now = Date.now();
  return {
    since: new Date(now - days * DAY_MS),
    prevSince: new Date(now - 2 * days * DAY_MS),
    prevUntil: new Date(now - days * DAY_MS),
  };
}

export type OverviewMetrics = {
  range: OverviewRange;
  rangeLabel: string;
  activeSubscriptions: number;
  canceledSubscriptions: number;
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
};

function sumPaid(rows: Array<{ paid_amount: number | null }> | null): number {
  return (rows ?? []).reduce((s, r) => s + (r.paid_amount ?? 0), 0);
}

function logError(label: string, error: unknown) {
  if (error) console.error(`[overview] ${label}:`, error);
}

export async function getOverviewMetrics(range: OverviewRange = '30d'): Promise<OverviewMetrics> {
  const supabase = createServiceClient();
  const { since, prevSince, prevUntil } = rangeBounds(range);
  const sinceISO = since?.toISOString() ?? null;
  const prevSinceISO = prevSince?.toISOString() ?? null;
  const prevUntilISO = prevUntil?.toISOString() ?? null;

  // Subscription-only charges: subscription_pagarme_id IS NOT NULL
  function paidChargesQuery() {
    let q = supabase
      .from('petloo_charges')
      .select('paid_amount')
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null);
    if (sinceISO) q = q.gte('paid_at', sinceISO);
    return q;
  }

  function prevPaidChargesQuery() {
    if (!prevSinceISO || !prevUntilISO) {
      return supabase.from('petloo_charges').select('paid_amount').eq('id', '__none__');
    }
    return supabase
      .from('petloo_charges')
      .select('paid_amount')
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null)
      .gte('paid_at', prevSinceISO)
      .lt('paid_at', prevUntilISO);
  }

  function paidCountQuery() {
    let q = supabase
      .from('petloo_charges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .not('subscription_pagarme_id', 'is', null);
    if (sinceISO) q = q.gte('paid_at', sinceISO);
    return q;
  }

  function failedCountQuery() {
    let q = supabase
      .from('petloo_charges')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .not('subscription_pagarme_id', 'is', null);
    if (sinceISO) q = q.gte('created_at', sinceISO);
    return q;
  }

  function newCustomersQuery() {
    let q = supabase.from('petloo_customers').select('id', { count: 'exact', head: true });
    if (sinceISO) q = q.gte('pagarme_created_at', sinceISO);
    return q;
  }

  function canceledInRangeQuery() {
    let q = supabase
      .from('petloo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled');
    if (sinceISO) q = q.gte('canceled_at', sinceISO);
    return q;
  }

  function activeAtStartQuery() {
    if (!sinceISO) {
      return supabase
        .from('petloo_subscriptions')
        .select('id', { count: 'exact', head: true })
        .or('canceled_at.is.null,canceled_at.gt.' + new Date().toISOString());
    }
    return supabase
      .from('petloo_subscriptions')
      .select('id', { count: 'exact', head: true })
      .lte('pagarme_created_at', sinceISO)
      .or(`canceled_at.is.null,canceled_at.gt.${sinceISO}`);
  }

  const [
    activeSubs,
    canceledSubs,
    customersTotal,
    newCustomers,
    revenueRows,
    revenuePrevRows,
    paidCount,
    failedCount,
    canceledInRange,
    activeAtStart,
  ] = await Promise.all([
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('petloo_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'canceled'),
    supabase.from('petloo_customers').select('id', { count: 'exact', head: true }),
    newCustomersQuery(),
    paidChargesQuery(),
    prevPaidChargesQuery(),
    paidCountQuery(),
    failedCountQuery(),
    canceledInRangeQuery(),
    activeAtStartQuery(),
  ]);

  logError('activeSubs', activeSubs.error);
  logError('canceledSubs', canceledSubs.error);
  logError('customersTotal', customersTotal.error);
  logError('newCustomers', newCustomers.error);
  logError('revenueRows', revenueRows.error);
  logError('revenuePrevRows', revenuePrevRows.error);
  logError('paidCount', paidCount.error);
  logError('failedCount', failedCount.error);
  logError('canceledInRange', canceledInRange.error);
  logError('activeAtStart', activeAtStart.error);

  const revenue = sumPaid(revenueRows.data as Array<{ paid_amount: number | null }> | null);
  const revenuePrev = sumPaid(revenuePrevRows.data as Array<{ paid_amount: number | null }> | null);
  const activeCount = activeSubs.count ?? 0;
  const paid = paidCount.count ?? 0;
  const failed = failedCount.count ?? 0;
  const canceled30 = canceledInRange.count ?? 0;
  const activeStartCount = activeAtStart.count ?? 0;

  return {
    range,
    rangeLabel: RANGE_LABELS[range],
    activeSubscriptions: activeCount,
    canceledSubscriptions: canceledSubs.count ?? 0,
    totalCustomers: customersTotal.count ?? 0,
    newCustomersInRange: newCustomers.count ?? 0,
    revenueInRange: revenue,
    revenuePrevRange: revenuePrev,
    revenueDelta: range === 'all' || revenuePrev <= 0 ? null : (revenue - revenuePrev) / revenuePrev,
    paidChargesInRange: paid,
    failedChargesInRange: failed,
    paymentSuccessRate: paid + failed > 0 ? paid / (paid + failed) : null,
    churnRateInRange: activeStartCount > 0 ? canceled30 / activeStartCount : null,
    avgTicketInRange: paid > 0 ? revenue / paid : 0,
    arpu: activeCount > 0 ? revenue / activeCount : 0,
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

export function parseRange(input: string | undefined): OverviewRange {
  const valid: OverviewRange[] = ['7d', '30d', '90d', '12m', 'all'];
  return (valid as string[]).includes(input ?? '') ? (input as OverviewRange) : '30d';
}
