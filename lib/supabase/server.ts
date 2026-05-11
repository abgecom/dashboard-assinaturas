import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv, getServerEnv } from '@/lib/env';

/**
 * Service-role client. Bypassa RLS. Usar SOMENTE em código de servidor
 * (API routes, server actions, cron, webhooks).
 */
export function createServiceClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
