import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required');
    redis = new Redis({ url, token });
  }
  return redis;
}

export interface BurnRecord {
  txHash: string;
  burner: string;
  prompt: string;
  cid: string;
  ipfsUrl: string;
  timestamp: string;
}

const TX_PREFIX = 'burn:tx:';
const GALLERY_KEY = 'burn:gallery';

export async function isTxUsed(txHash: string): Promise<boolean> {
  const r = getRedis();
  const exists = await r.exists(`${TX_PREFIX}${txHash}`);
  return exists === 1;
}

export async function markTxUsed(record: BurnRecord): Promise<void> {
  const r = getRedis();
  const key = `${TX_PREFIX}${record.txHash}`;
  await r.set(key, JSON.stringify(record));
  // Add to sorted set for gallery (score = timestamp ms)
  await r.zadd(GALLERY_KEY, {
    score: Date.now(),
    member: JSON.stringify(record),
  });
}

export async function getRecentBurns(
  limit = 20,
  offset = 0
): Promise<BurnRecord[]> {
  const r = getRedis();
  const results = await r.zrange(GALLERY_KEY, '+inf', '-inf', {
    byScore: true,
    rev: true,
    offset,
    count: limit,
  });
  return results.map((item) =>
    typeof item === 'string' ? JSON.parse(item) : item
  ) as BurnRecord[];
}
