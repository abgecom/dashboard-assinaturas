import { NextResponse, type NextRequest } from 'next/server';
import { getServerEnv } from '@/lib/env';
import { runFullSync } from '@/lib/sync/full-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const LOOKBACK_HOURS = 24;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(req: NextRequest): boolean {
  const { CRON_SECRET } = getServerEnv();
  const fromVercelHeader = req.headers.get('x-vercel-cron');
  if (fromVercelHeader) return true; // chamado pelo Vercel Cron

  const bearer = req.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    return timingSafeEqual(bearer.slice(7).trim(), CRON_SECRET);
  }
  const query = req.nextUrl.searchParams.get('secret');
  if (query) return timingSafeEqual(query, CRON_SECRET);
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const results = await runFullSync({ trigger: 'cron', since });
  return NextResponse.json({ ok: true, since: since.toISOString(), results });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
