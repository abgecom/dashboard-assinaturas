import { createServiceClient } from '@/lib/supabase/server';

export type SubscriptionRow = {
  id: string;
  pagarme_id: string;
  code: string | null;
  status: string | null;
  payment_method: string | null;
  start_at: string | null;
  next_billing_at: string | null;
  canceled_at: string | null;
  pagarme_created_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  plan_name: string | null;
};

export async function listSubscriptions(limit = 1000): Promise<SubscriptionRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('petloo_subscriptions')
    .select(
      `
      id, pagarme_id, code, status, payment_method, start_at, next_billing_at,
      canceled_at, pagarme_created_at, customer_id,
      petloo_customers ( name, email ),
      petloo_plans ( name )
    `,
    )
    .order('pagarme_created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((data ?? []) as any[]).map((s) => ({
    id: s.id,
    pagarme_id: s.pagarme_id,
    code: s.code,
    status: s.status,
    payment_method: s.payment_method,
    start_at: s.start_at,
    next_billing_at: s.next_billing_at,
    canceled_at: s.canceled_at,
    pagarme_created_at: s.pagarme_created_at,
    customer_id: s.customer_id,
    customer_name: s.petloo_customers?.name ?? null,
    customer_email: s.petloo_customers?.email ?? null,
    plan_name: s.petloo_plans?.name ?? null,
  }));
}
