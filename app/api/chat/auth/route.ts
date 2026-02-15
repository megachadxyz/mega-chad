import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';
import { Redis } from '@upstash/redis';

const GALLERY_KEY = 'burn:gallery';

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chat not configured' }, { status: 500 });
    }

    // Check burn status
    const r = getRedis();
    const members = await r.zrange(GALLERY_KEY, 0, -1);
    const hasBurned = members.some((m) => {
      const parsed = typeof m === 'string' ? JSON.parse(m) : m;
      return parsed.burner?.toLowerCase() === address.toLowerCase();
    });

    if (!hasBurned) {
      return NextResponse.json({ error: 'Must burn to chat' }, { status: 403 });
    }

    const ably = new Ably.Rest({ key: apiKey });
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: address.toLowerCase(),
      capability: { chadchat: ['subscribe', 'presence'] },
    });

    return NextResponse.json(tokenRequest);
  } catch {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
