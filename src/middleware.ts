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
    nextUrl.pathname.startsWith('/pipeline') ||
    nextUrl.pathname.startsWith('/profile') ||
    nextUrl.pathname.startsWith('/onboarding');

  if (isOnProtected && !hasSessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Signed-in-only pages. These render as empty shells without a session (the
  // APIs behind them return 401 either way), but they should send the visitor
  // to the login screen rather than a blank page.
  matcher: [
    '/dashboard/:path*',
    '/pipeline/:path*',
    '/profile/:path*',
    '/onboarding/:path*',
  ],
};
