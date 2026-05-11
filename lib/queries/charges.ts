import { createServiceClient } from '@/lib/supabase/server';

export type ChargeRow = {
  id: string;
  pagarme_id: string;
  code: string | null;
  status: string | null;
  amount: number | null;
  paid_amount: number | null;
  payment_method: string | null;
  due_at: string | null;
  paid_at: string | null;
  pagarme_created_at: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
};

export async function listCharges(limit = 1000): Promise<ChargeRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('petloo_charges')
    .select(
      `
      id, pagarme_id, code, status, amount, paid_amount, payment_method,
      due_at, paid_at, pagarme_created_at, customer_id, subscription_id, invoice_id,
      petloo_customers ( name, email )
    `,
    )
    .order('pagarme_created_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  return ((data ?? []) as any[]).map((c) => ({
    id: c.id,
    pagarme_id: c.pagarme_id,
    code: c.code,
    status: c.status,
    amount: c.amount,
    paid_amount: c.paid_amount,
    payment_method: c.payment_method,
    due_at: c.due_at,
    paid_at: c.paid_at,
    pagarme_created_at: c.pagarme_created_at,
    customer_id: c.customer_id,
    customer_name: c.petloo_customers?.name ?? null,
    customer_email: c.petloo_customers?.email ?? null,
    subscription_id: c.subscription_id,
    invoice_id: c.invoice_id,
  }));
}
