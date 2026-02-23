import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
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

const NFT_ABI = [
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
] as const;

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

    // Separate burns with and without tokenIds
    const burnsWithTokens = burns.filter((b) => b.tokenId);
    const burnsWithoutTokens = burns.filter((b) => !b.tokenId);

    console.log(`Total burns: ${burns.length}, With tokenIds: ${burnsWithTokens.length}, Without: ${burnsWithoutTokens.length}`);

    // Query current NFT ownership from blockchain for burns with tokenIds
    const ownershipPromises = burnsWithTokens.map(async (burn) => {
      try {
        const owner = await viemClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'ownerOf',
          args: [BigInt(burn.tokenId!)],
        });
        return {
          ...burn,
          currentOwner: owner.toLowerCase(),
        };
      } catch {
        // NFT doesn't exist or error querying - fall back to original burner
        return {
          ...burn,
          currentOwner: burn.burner.toLowerCase(),
        };
      }
    });

    const ownershipResults = await Promise.all(ownershipPromises);

    // For burns without tokenIds (old burns), use original burner address
    const burnsWithoutTokensWithOwner = burnsWithoutTokens.map((burn) => ({
      ...burn,
      currentOwner: burn.burner.toLowerCase(),
    }));

    // Combine both sets
    const validBurns = [...ownershipResults, ...burnsWithoutTokensWithOwner];

    // Group by current owner (not original burner)
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    for (const burn of validBurns) {
      const addr = burn.currentOwner;
      const existing = walletMap.get(addr);

      const imageEntry = {
        ipfsUrl: burn.ipfsUrl,
        timestamp: burn.timestamp,
        txHash: burn.txHash,
      };

      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerBurn;
        existing.images.push(imageEntry);
        // Update latest if this burn is newer
        if (burn.timestamp > existing.latestTimestamp) {
          existing.latestImage = burn.ipfsUrl;
          existing.latestTimestamp = burn.timestamp;
        }
      } else {
        walletMap.set(addr, {
          address: burn.currentOwner,
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
