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
  warrenTokenId?: number; // Warren on-chain storage token ID
}

export interface NFTMetadata {
  tokenId: string;
  warrenTokenId?: number;
  ipfsUrl: string;
  metadataIpfsUrl?: string;
  burner: string;
  burnTxHash: string;
  devTxHash?: string;
  timestamp: string;
}

const TX_PREFIX = 'burn:tx:';
const GALLERY_KEY = 'burn:gallery';
const TOTAL_BURNED_KEY = 'burn:total_tokens';

export async function isTxUsed(txHash: string): Promise<boolean> {
  const r = getRedis();
  const exists = await r.exists(`${TX_PREFIX}${txHash}`);
  return exists === 1;
}

/**
 * Atomically claim a tx hash for processing.
 * Returns true if successfully claimed, false if already claimed by another request.
 * Uses SETNX with a 10-minute TTL to prevent race conditions.
 */
export async function claimTx(txHash: string): Promise<boolean> {
  const r = getRedis();
  const lockKey = `burn:lock:${txHash}`;
  const result = await r.set(lockKey, '1', { nx: true, ex: 600 });
  return result === 'OK';
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
  // Track burner address for efficient chat auth lookups
  if (record.burner) {
    await r.sadd('burn:burners', record.burner.toLowerCase());
  }
}

export async function getTotalTokensBurned(): Promise<number> {
  const r = getRedis();
  const val = await r.get(TOTAL_BURNED_KEY);
  if (val) return Number(val);

  // Migration: seed from existing burn count if counter not yet initialized
  const burnCount = await r.zcard(GALLERY_KEY);
  if (burnCount > 0) {
    const burnAmount = Number(BigInt(process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000'));
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

/**
 * Store NFT metadata for custom metadata endpoint
 * Used by /api/metadata/[tokenId] to serve ERC-721 metadata
 */
export async function storeNFTMetadata(metadata: NFTMetadata): Promise<void> {
  const r = getRedis();
  const key = `nft:metadata:${metadata.tokenId}`;
  await r.set(key, JSON.stringify(metadata));
}
