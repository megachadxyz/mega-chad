import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Analytics tracking via Upstash REST (Edge-compatible, no SDK needed) ──
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ANALYTICS_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fire-and-forget analytics tracking via Upstash REST pipeline.
 * Runs in Edge runtime without @upstash/redis SDK.
 */
function trackAnalytics(endpoint: string, ip: string): void {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;

  const date = getToday();
  const endpointKey = `analytics:${endpoint}:${date}`;
  const totalKey = `analytics:total:${date}`;
  const callersKey = `analytics:callers:${date}`;
  const endpointsSetKey = `analytics:endpoints:${date}`;

  // Build pipeline commands for Upstash REST API
  const commands: [string, ...string[]][] = [
    ['INCR', endpointKey],
    ['EXPIRE', endpointKey, String(ANALYTICS_TTL)],
    ['INCR', totalKey],
    ['EXPIRE', totalKey, String(ANALYTICS_TTL)],
    ['SADD', endpointsSetKey, endpoint],
    ['EXPIRE', endpointsSetKey, String(ANALYTICS_TTL)],
  ];

  if (ip && ip !== 'unknown') {
    commands.push(
      ['SADD', callersKey, ip],
      ['EXPIRE', callersKey, String(ANALYTICS_TTL)],
    );
  }

  fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  }).catch(() => {
    // Swallow errors — analytics must never break requests
  });
}

const ALLOWED_PAGES = new Set([
  '/',
  '/about',
  '/terms',
  '/privacy',
  '/docs',
  '/chadboard',
  '/gallery',
  '/main',
  '/early',
  '/agent',
]);

// Rate limit: sliding window per IP (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Cleanup stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through Next.js internals and static assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/audio/') ||
    pathname === '/favicon.jpg' ||
    pathname === '/chadfavicon.jpg'
  ) {
    return NextResponse.next();
  }

  // Discovery files — pass through with CORS
  if (
    pathname.startsWith('/.well-known/') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/llms-full.txt'
  ) {
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  }

  // API routes — CORS + rate limiting
  if (pathname.startsWith('/api/')) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-402-Version',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Rate limiting (skip for diag which is admin-ish)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 120 requests per minute.' },
        {
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '60',
          },
        },
      );
    }

    // Fire-and-forget analytics tracking (non-blocking)
    trackAnalytics(pathname, ip);

    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
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
