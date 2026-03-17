import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Require admin key to access diagnostics
  const authHeader = req.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized', hint: 'Set ADMIN_API_KEY env var and pass as Bearer token' },
      { status: 401 },
    );
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  let redisStatus = 'not_configured';
  let redisError: string | null = null;

  if (url && token) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['PING']),
        cache: 'no-store',
      });
      const data = await r.json();
      redisStatus = data.result === 'PONG' ? 'connected' : 'error';
    } catch (e: unknown) {
      redisStatus = 'error';
      redisError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    status: 'ok',
    redis: redisStatus,
    redisError,
    services: {
      replicate: !!process.env.REPLICATE_API_TOKEN,
      pinata: !!process.env.PINATA_JWT,
      meridian: !!process.env.MERIDIAN_API_KEY,
      agentId: process.env.MEGACHAD_AGENT_ID || null,
    },
  });
}
