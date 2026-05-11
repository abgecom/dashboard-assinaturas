import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname.startsWith('/login');
  const isAuthApi = pathname.startsWith('/api/auth');

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session && !isLoginPage && !isAuthApi) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
