import { createServiceClient } from '@/lib/supabase/server';
import type { DateRange } from './range';

/**
 * Supabase às vezes retorna relação aninhada como array em vez de objeto único
 * (depende do typegen e versão). Esse helper normaliza pra objeto.
 */
function unwrap<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

function planNameFromSub(sub: any): string {
  const planRel = unwrap<{ name?: string | null }>(sub?.petloo_plans);
  return planRel?.name ?? 'Sem plano';
}

function planNameFromInvoice(inv: any): string {
  const subRel = unwrap<{ petloo_plans?: unknown }>(inv?.petloo_subscriptions);
  const planRel = unwrap<{ name?: string | null }>(subRel?.petloo_plans);
  return planRel?.name ?? 'Sem plano';
}

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

/**
 * Faturas geradas no período (por pagarme_created_at) agrupadas por plano.
 * Inclui pagas, pendentes e falhadas — mostra "o que aconteceu" no período.
 * Cancelamentos no período somados separadamente.
 */
export async function getPlanBreakdown(range: DateRange): Promise<PlanBreakdownRow[]> {
  const supabase = createServiceClient();
  const sinceISO = range.from.toISOString();
  const untilISO = range.to.toISOString();

  const [invoicesRes, canceledRes] = await Promise.all([
    supabase
      .from('petloo_invoices')
      .select('amount, status, petloo_subscriptions(petloo_plans(name))')
      .gte('pagarme_created_at', sinceISO)
      .lte('pagarme_created_at', untilISO)
      .limit(20000),
    supabase
      .from('petloo_subscriptions')
      .select('petloo_plans(name)')
      .eq('status', 'canceled')
      .gte('canceled_at', sinceISO)
      .lte('canceled_at', untilISO)
      .limit(20000),
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
    const row = getRow(planNameFromInvoice(inv));
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
    const row = getRow(planNameFromSub(sub));
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

/**
 * Calcula preço do plano somando todos os items: Σ qty × pricing_scheme.price.
 * Retorna 0 se items vazio ou sem price (e.g., planos com price_brackets variáveis).
 */
function planPriceFromItems(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  let total = 0;
  for (const item of items as any[]) {
    const qty = typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
    const price =
      typeof item?.pricing_scheme?.price === 'number' && item.pricing_scheme.price > 0
        ? item.pricing_scheme.price
        : 0;
    total += qty * price;
  }
  return total;
}

/**
 * Previsibilidade de receita por plano no período.
 *
 * Estratégia (Pagar.me v5):
 *   - Subs com status='active' têm next_billing_at preenchido pelos ciclos seguintes.
 *     Filtramos por next_billing_at ∈ [from, to].
 *   - Subs com status='future' ou 'trialing' têm next_billing_at NULL e usam start_at
 *     pra indicar quando vai rolar a 1ª cobrança após trial.
 *     Filtramos por start_at ∈ [from, to].
 *
 * Dedupe por sub.id (defensivo — mesma sub não deveria aparecer nas duas queries,
 * mas se aparecer por race condition de sync, conta só 1x).
 *
 * Estimativa de valor por sub (em ordem):
 *   1. Última fatura PAGA daquela sub (status='paid', ORDER BY paid_at DESC LIMIT 1)
 *   2. Soma do preço dos items do plano (petloo_plans.items)
 *   3. Marca como "sem preço" (estimated_amount += 0, unknown_value_count++)
 *
 * Limitação conhecida: pra ranges longos (> 1 ciclo do plano), undercounta porque
 * uma mesma sub pode billing 2x+ no range. Pra próximos 30d / trimestre, é exato.
 */
export async function getForecast(range: DateRange): Promise<Forecast> {
  const supabase = createServiceClient();

  const sinceISO = range.from.toISOString();
  const untilISO = range.to.toISOString();

  const [activeRes, futureRes] = await Promise.all([
    supabase
      .from('petloo_subscriptions')
      .select('id, plan_id, status, petloo_plans(name)')
      .eq('status', 'active')
      .gte('next_billing_at', sinceISO)
      .lte('next_billing_at', untilISO)
      .limit(10000),
    supabase
      .from('petloo_subscriptions')
      .select('id, plan_id, status, petloo_plans(name)')
      .in('status', ['future', 'trialing'])
      .gte('start_at', sinceISO)
      .lte('start_at', untilISO)
      .limit(10000),
  ]);

  if (activeRes.error) console.error('[forecast] active subs:', activeRes.error);
  if (futureRes.error) console.error('[forecast] future subs:', futureRes.error);

  const subsById = new Map<string, any>();
  for (const s of (activeRes.data ?? []) as any[]) subsById.set(s.id, s);
  for (const s of (futureRes.data ?? []) as any[]) subsById.set(s.id, s);
  const subList = Array.from(subsById.values());

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
      .limit(20000),
    planIds.length > 0
      ? supabase.from('petloo_plans').select('id, items').in('id', planIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (lastInvsRes.error) console.error('[forecast] last invoices:', lastInvsRes.error);
  if (plansRes.error) console.error('[forecast] plans:', plansRes.error);

  // Última fatura paga por sub
  const lastAmount = new Map<string, number>();
  for (const inv of (lastInvsRes.data ?? []) as any[]) {
    if (!inv.subscription_id || inv.amount == null || inv.amount <= 0) continue;
    if (!lastAmount.has(inv.subscription_id)) {
      lastAmount.set(inv.subscription_id, inv.amount);
    }
  }

  // Preço por plano (fallback pra trials)
  const planPrice = new Map<string, number>();
  for (const p of (plansRes.data ?? []) as any[]) {
    const price = planPriceFromItems(p.items);
    if (price > 0) planPrice.set(p.id, price);
  }

  // Agrega por plano
  const planMap = new Map<string, ForecastRow>();
  let totalAmount = 0;
  let totalCount = 0;
  let unknownValueCount = 0;

  for (const sub of subList) {
    const plan = planNameFromSub(sub);
    let row = planMap.get(plan);
    if (!row) {
      row = { plan, subscription_count: 0, estimated_amount: 0, unknown_value_count: 0 };
      planMap.set(plan, row);
    }
    row.subscription_count++;
    totalCount++;

    let amount = lastAmount.get(sub.id);
    if ((amount == null || amount <= 0) && sub.plan_id) {
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
