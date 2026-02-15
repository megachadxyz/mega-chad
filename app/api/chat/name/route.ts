import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const NAME_PREFIX = 'chat:name:';
const NAME_TAKEN_PREFIX = 'chat:name:taken:';

function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');
  return new Redis({ url, token });
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const r = getRedis();
    const name = await r.get(`${NAME_PREFIX}${address.toLowerCase()}`);

    return NextResponse.json({
      name: name || null,
      default: truncAddr(address),
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, name, isAnon } = await req.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const r = getRedis();
    const addr = address.toLowerCase();
    const nameKey = `${NAME_PREFIX}${addr}`;

    // Remove old name reservation if exists
    const oldName = (await r.get(nameKey)) as string | null;
    if (oldName && oldName !== 'Anon' && oldName !== truncAddr(address)) {
      await r.del(`${NAME_TAKEN_PREFIX}${oldName.toLowerCase()}`);
    }

    if (isAnon) {
      await r.set(nameKey, 'Anon');
      return NextResponse.json({ name: 'Anon' });
    }

    if (!name || typeof name !== 'string') {
      // Use default (wallet address) — remove custom name
      await r.del(nameKey);
      return NextResponse.json({ name: null, default: truncAddr(address) });
    }

    const trimmed = name.trim();

    // Validate: 2-20 chars, alphanumeric + spaces
    if (trimmed.length < 2 || trimmed.length > 20) {
      return NextResponse.json({ error: 'Name must be 2-20 characters' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Letters, numbers, and spaces only' }, { status: 400 });
    }

    // Check uniqueness
    const takenKey = `${NAME_TAKEN_PREFIX}${trimmed.toLowerCase()}`;
    const takenBy = await r.get(takenKey);
    if (takenBy && takenBy !== addr) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 409 });
    }

    // Reserve name
    await r.set(takenKey, addr);
    await r.set(nameKey, trimmed);

    return NextResponse.json({ name: trimmed });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
