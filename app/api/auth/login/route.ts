import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim().toLowerCase();
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'petloobrasil@gmail.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD não configurada no servidor.' },
      { status: 500 },
    );
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  }

  const token = await createSessionToken(adminEmail);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return res;
}
