import { NextResponse } from 'next/server';
import { syncPlans } from '@/lib/sync/plans';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await syncPlans({ trigger: 'manual' });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
