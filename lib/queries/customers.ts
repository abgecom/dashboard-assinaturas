import { createServiceClient } from '@/lib/supabase/server';

export type CustomerRow = {
  id: string;
  pagarme_id: string;
  name: string | null;
  email: string | null;
  document: string | null;
  customer_since: string | null;
  total_subscriptions: number;
  active_subscriptions: number;
  canceled_subscriptions: number;
  lifetime_value: number;
  paid_charges_count: number;
  failed_charges_count: number;
  last_payment_at: string | null;
  next_billing_at: string | null;
  current_plan: string | null;
};

export async function listCustomersWithHealth(limit = 500): Promise<CustomerRow[]> {
  const supabase = createServiceClient();
  const [healthRes, activeSubsRes, plansRes] = await Promise.all([
    supabase
      .from('petloo_customer_health')
      .select('*')
      .order('customer_since', { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from('petloo_subscriptions')
      .select('customer_id, plan_id, pagarme_created_at')
      .eq('status', 'active'),
    supabase.from('petloo_plans').select('id, name'),
  ]);

  const plansMap = new Map<string, string>(
    ((plansRes.data ?? []) as { id: string; name: string | null }[]).map((p) => [p.id, p.name ?? '—']),
  );

  const activePlanByCustomer = new Map<string, string>();
  for (const s of (activeSubsRes.data ?? []) as {
    customer_id: string | null;
    plan_id: string | null;
  }[]) {
    if (!s.customer_id || !s.plan_id) continue;
    const planName = plansMap.get(s.plan_id);
    if (planName && !activePlanByCustomer.has(s.customer_id)) {
      activePlanByCustomer.set(s.customer_id, planName);
    }
  }

  return ((healthRes.data ?? []) as CustomerRow[]).map((c) => ({
    ...c,
    current_plan: activePlanByCustomer.get(c.id) ?? null,
  }));
}

export type CustomerDetail = {
  customer: Record<string, unknown> | null;
  health: CustomerRow | null;
  subscriptions: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  charges: Record<string, unknown>[];
};

export async function getCustomerDetail(id: string): Promise<CustomerDetail> {
  const supabase = createServiceClient();
  const [customerRes, healthRes, subsRes, invoicesRes, chargesRes] = await Promise.all([
    supabase.from('petloo_customers').select('*').eq('id', id).maybeSingle(),
    supabase.from('petloo_customer_health').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('petloo_subscriptions')
      .select('*, petloo_plans(name)')
      .eq('customer_id', id)
      .order('pagarme_created_at', { ascending: false }),
    supabase
      .from('petloo_invoices')
      .select('*')
      .eq('customer_id', id)
      .order('billing_at', { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from('petloo_charges')
      .select('*')
      .eq('customer_id', id)
      .order('pagarme_created_at', { ascending: false, nullsFirst: false })
      .limit(50),
  ]);

  return {
    customer: (customerRes.data as Record<string, unknown> | null) ?? null,
    health: (healthRes.data as CustomerRow | null) ?? null,
    subscriptions: (subsRes.data as Record<string, unknown>[] | null) ?? [],
    invoices: (invoicesRes.data as Record<string, unknown>[] | null) ?? [],
    charges: (chargesRes.data as Record<string, unknown>[] | null) ?? [],
  };
}
