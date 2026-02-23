import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';

export const dynamic = 'force-dynamic';

interface BurnRecord {
  txHash: string;
  burner: string;
  prompt: string;
  cid: string;
  ipfsUrl: string;
  timestamp: string;
  burnAmount?: number;
  tokenId?: string;
}

export interface ChadboardEntry {
  address: string;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: { ipfsUrl: string; timestamp: string; txHash: string }[];
}

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

export async function GET() {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return NextResponse.json({ entries: [] });

    const r = new Redis({ url, token });

    // Get all burns from the gallery sorted set
    const results = await r.zrange('burn:gallery', '+inf', '-inf', {
      byScore: true,
      rev: true,
      offset: 0,
      count: 500,
    });

    const burns: BurnRecord[] = results.map((item) =>
      typeof item === 'string' ? JSON.parse(item) : item
    ) as BurnRecord[];

    // Query all Transfer events from NFT contract to get current ownership
    const transferLogs = await viemClient.getLogs({
      address: NFT_CONTRACT,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      fromBlock: 0n,
      toBlock: 'latest',
    });

    // Build map of tokenId -> current owner
    const currentOwners = new Map<string, string>();
    // Build map of tokenId -> original minter (from address = 0x0 means mint)
    const originalMinters = new Map<string, string>();

    for (const log of transferLogs) {
      const { from, to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };
      const tokenIdStr = tokenId.toString();

      // Track mints (from = zero address)
      if (from === '0x0000000000000000000000000000000000000000') {
        originalMinters.set(tokenIdStr, to.toLowerCase());
      }

      // Track current owner
      currentOwners.set(tokenIdStr, to.toLowerCase());
    }

    // Map tokenId -> burn record (for metadata like image, timestamp)
    const tokenToBurnMap = new Map<string, BurnRecord & { tokenId: string }>();

    // First, map burns that have tokenIds
    for (const burn of burns) {
      if (burn.tokenId) {
        tokenToBurnMap.set(burn.tokenId, { ...burn, tokenId: burn.tokenId });
      }
    }

    // For old burns without tokenIds, try to match them with minted NFTs
    const burnsWithoutTokens = burns.filter((b) => !b.tokenId);
    for (const burn of burnsWithoutTokens) {
      const burnerLower = burn.burner.toLowerCase();

      // Find an NFT that was minted to this burner and hasn't been mapped yet
      for (const [tokenId, minter] of originalMinters.entries()) {
        if (minter === burnerLower && !tokenToBurnMap.has(tokenId)) {
          tokenToBurnMap.set(tokenId, { ...burn, tokenId });
          break; // Only assign one NFT per burn
        }
      }
    }

    // Build entries by current owner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    for (const [tokenId, owner] of currentOwners.entries()) {
      // Skip burned NFTs (sent to dead address)
      if (owner === '0x000000000000000000000000000000000000dead') continue;

      const burn = tokenToBurnMap.get(tokenId);
      if (!burn) continue; // NFT exists but no burn record (shouldn't happen)

      const existing = walletMap.get(owner);

      const imageEntry = {
        ipfsUrl: burn.ipfsUrl,
        timestamp: burn.timestamp,
        txHash: burn.txHash,
      };

      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerBurn;
        existing.images.push(imageEntry);
        if (burn.timestamp > existing.latestTimestamp) {
          existing.latestImage = burn.ipfsUrl;
          existing.latestTimestamp = burn.timestamp;
        }
      } else {
        walletMap.set(owner, {
          address: owner,
          totalBurns: 1,
          totalBurned: burnAmountPerBurn,
          latestImage: burn.ipfsUrl,
          latestTimestamp: burn.timestamp,
          images: [imageEntry],
        });
      }
    }

    // Sort by total burns descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('Chadboard fetch failed:', err);
    return NextResponse.json({ entries: [] });
  }
}
