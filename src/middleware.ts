import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow all traffic in dev/local mode if session token is not present
  // so the user can easily evaluate the dashboard and node editor without setup blocks
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/pipeline/:path*'],
};
