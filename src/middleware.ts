import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { cookies, nextUrl } = request;

  // NextAuth session token names (handles auth.js & next-auth, secure and non-secure cookies)
  const hasSessionToken =
    cookies.has('authjs.session-token') ||
    cookies.has('__Secure-authjs.session-token') ||
    cookies.has('next-auth.session-token') ||
    cookies.has('__Secure-next-auth.session-token');

  const isOnProtected =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/pipeline');

  if (isOnProtected && !hasSessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/pipeline/:path*'],
};
