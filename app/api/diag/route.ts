import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const hasUrl = !!url;
  const hasToken = !!token;
  let redisResult: any = null;
  let redisError: any = null;
  if (url && token) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['GET', 'nft:metadata:10']),
        cache: 'no-store',
      });
      const data = await r.json();
      redisResult = data;
    } catch (e: any) {
      redisError = e.message;
    }
  }
  return NextResponse.json({ hasUrl, hasToken, redisResult, redisError });
}
