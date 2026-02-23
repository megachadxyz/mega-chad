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
  burnAmount?: number; // total tokens burned (human-readable, e.g. 11250)
  tokenId?: string; // NFT token ID if minted
}

const TX_PREFIX = 'burn:tx:';
const GALLERY_KEY = 'burn:gallery';
const TOTAL_BURNED_KEY = 'burn:total_tokens';

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
  // Increment total tokens burned counter
  if (record.burnAmount && record.burnAmount > 0) {
    await r.incrbyfloat(TOTAL_BURNED_KEY, record.burnAmount);
  }
}

export async function getTotalTokensBurned(): Promise<number> {
  const r = getRedis();
  const val = await r.get(TOTAL_BURNED_KEY);
  if (val) return Number(val);

  // Migration: seed from existing burn count if counter not yet initialized
  const burnCount = await r.zcard(GALLERY_KEY);
  if (burnCount > 0) {
    const burnAmount = Number(BigInt(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000'));
    const total = burnCount * burnAmount;
    await r.set(TOTAL_BURNED_KEY, total);
    return total;
  }
  return 0;
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
