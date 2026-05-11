import type { createServiceClient } from '@/lib/supabase/server';

type Supabase = ReturnType<typeof createServiceClient>;

/**
 * Carrega mapa pagarme_id -> uuid de uma tabela petloo_*.
 * Volume esperado: <= ~50k linhas, então uma query basta.
 */
export async function loadIdMap(
  supabase: Supabase,
  table: 'petloo_customers' | 'petloo_plans' | 'petloo_subscriptions' | 'petloo_invoices',
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('id, pagarme_id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to load ${table} id map: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data as Array<{ id: string; pagarme_id: string }>) {
      map.set(row.pagarme_id, row.id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return map;
}
