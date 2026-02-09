import { NextRequest, NextResponse } from 'next/server';
import { getRecentBurns } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
  const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

  try {
    const burns = await getRecentBurns(limit, offset);
    return NextResponse.json({ burns, limit, offset });
  } catch {
    // Redis not configured — return empty gallery
    return NextResponse.json({ burns: [], limit, offset });
  }
}
