import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import {
  refetchAndUpsertCustomer,
  refetchAndUpsertPlan,
  refetchAndUpsertSubscription,
  refetchAndUpsertInvoice,
  refetchAndUpsertCharge,
} from '@/lib/sync/by-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function verifyBasicAuth(req: NextRequest, expectedPassword: string): boolean {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return false;
  }
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  const password = decoded.slice(sep + 1);
  if (password.length !== expectedPassword.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) {
    diff |= password.charCodeAt(i) ^ expectedPassword.charCodeAt(i);
  }
  return diff === 0;
}

type WebhookEvent = {
  id: string;
  type: string;
  created_at?: string;
  data?: Record<string, unknown> & { id?: string; customer?: { id?: string }; subscription?: { id?: string } };
};

function extractResource(event: WebhookEvent): { resource_type: string | null; resource_id: string | null } {
  const [resource_type = null] = event.type.split('.');
  const data = event.data ?? {};
  const resource_id = (data.id as string | undefined) ?? null;
  return { resource_type, resource_id };
}

async function dispatch(event: WebhookEvent): Promise<void> {
  const type = event.type;
  const data = event.data ?? {};
  const dataId = (data.id as string | undefined) ?? '';
  const customerId = ((data.customer as { id?: string } | undefined)?.id) ?? '';
  const subscriptionId = ((data.subscription as { id?: string } | undefined)?.id) ?? '';

  if (type.startsWith('customer.')) {
    if (dataId) await refetchAndUpsertCustomer(dataId);
    return;
  }
  if (type.startsWith('card.')) {
    if (customerId) await refetchAndUpsertCustomer(customerId);
    return;
  }
  if (type.startsWith('plan.')) {
    if (dataId) await refetchAndUpsertPlan(dataId);
    return;
  }
  if (type.startsWith('subscription.item.')) {
    if (subscriptionId) await refetchAndUpsertSubscription(subscriptionId);
    return;
  }
  if (type.startsWith('subscription.')) {
    if (dataId) await refetchAndUpsertSubscription(dataId);
    return;
  }
  if (type.startsWith('invoice.')) {
    if (dataId) await refetchAndUpsertInvoice(dataId);
    return;
  }
  if (type.startsWith('charge.')) {
    if (dataId) await refetchAndUpsertCharge(dataId);
    return;
  }
  // outros eventos: só persistimos, sem ação
}

export async function POST(req: NextRequest) {
  const { PAGARME_WEBHOOK_SECRET } = getServerEnv();

  if (!PAGARME_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'webhook secret not configured' }, { status: 503 });
  }

  if (!verifyBasicAuth(req, PAGARME_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = (await req.json()) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!event?.id || !event?.type) {
    return NextResponse.json({ error: 'missing event fields' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { resource_type, resource_id } = extractResource(event);

  const { data: insertResult, error: insertError } = await supabase
    .from('petloo_webhook_events')
    .insert({
      pagarme_event_id: event.id,
      event_type: event.type,
      resource_type,
      resource_id,
      payload: event,
    })
    .select('id')
    .maybeSingle();

  // Conflito de unique = já recebemos; respondemos 200 pra não receber retry.
  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[webhook] insert error', insertError);
    return NextResponse.json({ error: 'persist failed' }, { status: 500 });
  }

  try {
    await dispatch(event);
    if (insertResult?.id) {
      await supabase
        .from('petloo_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', insertResult.id);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[webhook] dispatch error', message);
    if (insertResult?.id) {
      await supabase
        .from('petloo_webhook_events')
        .update({ processing_error: message })
        .eq('id', insertResult.id);
    }
    // Retornamos 500 pra Pagar.me re-tentar.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
