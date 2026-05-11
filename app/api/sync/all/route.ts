import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { runFullSync } from '@/lib/sync/full-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bodySchema = z.object({ since: z.string().datetime().optional() }).optional();

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => undefined);
  const parsed = bodySchema.parse(json);
  const since = parsed?.since ? new Date(parsed.since) : undefined;
  const results = await runFullSync({ trigger: 'manual', since });
  return NextResponse.json({ ok: true, results });
}
