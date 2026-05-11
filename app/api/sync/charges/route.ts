import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { syncCharges } from '@/lib/sync/charges';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const bodySchema = z.object({ since: z.string().datetime().optional() }).optional();

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => undefined);
  const parsed = bodySchema.parse(json);
  const since = parsed?.since ? new Date(parsed.since) : undefined;
  try {
    const result = await syncCharges({ trigger: 'manual', since });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
