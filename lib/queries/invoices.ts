import { createServiceClient } from '@/lib/supabase/server';

export type InvoiceRow = {
  id: string;
  pagarme_id: string;
  code: string | null;
  status: string | null;
  amount: number | null;
  payment_method: string | null;
  billing_at: string | null;
  pagarme_created_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  subscription_id: string | null;
  plan_name: string | null;
};

export async function listInvoices(limit = 1000): Promise<InvoiceRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('petloo_invoices')
    .select(
      `
      id, pagarme_id, code, status, amount, payment_method, billing_at,
      pagarme_created_at, customer_id, subscription_id,
      petloo_customers ( name, email ),
      petloo_subscriptions ( petloo_plans ( name ) )
    `,
    )
    .order('billing_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((data ?? []) as any[]).map((i) => ({
    id: i.id,
    pagarme_id: i.pagarme_id,
    code: i.code,
    status: i.status,
    amount: i.amount,
    payment_method: i.payment_method,
    billing_at: i.billing_at,
    pagarme_created_at: i.pagarme_created_at,
    customer_id: i.customer_id,
    customer_name: i.petloo_customers?.name ?? null,
    customer_email: i.petloo_customers?.email ?? null,
    subscription_id: i.subscription_id,
    plan_name: i.petloo_subscriptions?.petloo_plans?.name ?? null,
  }));
}
