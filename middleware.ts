import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_PAGES = new Set([
  '/',
  '/about',
  '/terms',
  '/privacy',
  '/docs',
  '/chadboard',
  '/gallery',
  '/main',
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through Next.js internals, API routes, and static assets.
  // The matcher config below already excludes /_next/*, but being explicit
  // here makes intent clear.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/audio/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/favicon.jpg' ||
    pathname === '/chadfavicon.jpg'
  ) {
    return NextResponse.next();
  }

  // Known good pages
  if (ALLOWED_PAGES.has(pathname)) {
    return NextResponse.next();
  }

  // Everything else is gone — return 410
  return new NextResponse(null, { status: 410 });
}

export const config = {
  // Run on all paths except Next.js static chunks and image optimiser
  matcher: ['/((?!_next/static|_next/image).*)'],
};
