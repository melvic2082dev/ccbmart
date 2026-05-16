import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  // Note: actual auth is handled via localStorage tokens on the client side.
  // This proxy is an SSR guard placeholder — real auth enforcement happens
  // in page-level useEffect hooks and API route authorization.
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/agency/:path*'] };
