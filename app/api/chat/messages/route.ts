import { NextRequest, NextResponse } from 'next/server';
import Ably from 'ably';
import { Redis } from '@upstash/redis';

const GALLERY_KEY = 'burn:gallery';
const MESSAGES_KEY = 'chat:messages';
const RATE_PREFIX = 'chat:ratelimit:';
const NAME_PREFIX = 'chat:name:';

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  return new Redis({ url, token });
}

function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, 280);
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const before = searchParams.get('before');

    const r = getRedis();
    const total = await r.llen(MESSAGES_KEY);

    if (total === 0) {
      return NextResponse.json({ messages: [] });
    }

    let end = total - 1;
    let start = Math.max(0, end - limit + 1);

    if (before) {
      // Load older messages: scan from end to find the index before timestamp
      // For simplicity, just load the last `limit` before the given offset
      const beforeTs = Number(before);
      const all = await r.lrange(MESSAGES_KEY, 0, -1);
      const filtered = (all as string[])
        .map((m) => (typeof m === 'string' ? JSON.parse(m) : m))
        .filter((m: { timestamp: number }) => m.timestamp < beforeTs);
      const sliced = filtered.slice(-limit);
      return NextResponse.json({ messages: sliced });
    }

    const raw = await r.lrange(MESSAGES_KEY, start, end);
    const messages = (raw as string[]).map((m) =>
      typeof m === 'string' ? JSON.parse(m) : m
    );

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, text } = await req.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chat not configured' }, { status: 500 });
    }

    const r = getRedis();
    const addr = address.toLowerCase();

    // Check burn status
    const members = await r.zrange(GALLERY_KEY, 0, -1);
    const hasBurned = members.some((m) => {
      const parsed = typeof m === 'string' ? JSON.parse(m) : m;
      return parsed.burner?.toLowerCase() === addr;
    });

    if (!hasBurned) {
      return NextResponse.json({ error: 'Must burn to chat' }, { status: 403 });
    }

    // Rate limit: 2 second cooldown
    const rateKey = `${RATE_PREFIX}${addr}`;
    const existing = await r.get(rateKey);
    if (existing) {
      return NextResponse.json({ error: 'Slow down' }, { status: 429 });
    }
    await r.set(rateKey, '1', { ex: 2 });

    // Get display name
    const nameKey = `${NAME_PREFIX}${addr}`;
    const displayName = (await r.get(nameKey)) as string | null;

    const sanitized = sanitizeText(text);
    if (sanitized.length === 0) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      address: addr,
      displayName: displayName || truncAddr(addr),
      text: sanitized,
      timestamp: Date.now(),
    };

    // Store in Redis
    await r.rpush(MESSAGES_KEY, JSON.stringify(message));

    // Publish to Ably
    const ably = new Ably.Rest({ key: apiKey });
    const channel = ably.channels.get('chadchat');
    await channel.publish('message', message);

    return NextResponse.json({ ok: true, message });
  } catch {
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
