import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';

export const dynamic = 'force-dynamic';

export interface MegaNameProfile {
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  telegram?: string;
  url?: string;
}

export interface ChadboardEntry {
  address: string;
  megaName?: string;
  megaProfile?: MegaNameProfile;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: { ipfsUrl: string; timestamp: string; txHash: string }[];
  reputation?: { score: number | null; count: number };
}

const MEGANAMES_CONTRACT = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997' as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

const MEGANAMES_ABI = [
  {
    type: 'function',
    name: 'getName',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

// ── Redis-first chadboard ──
// Reads burn gallery from Upstash (already populated by /api/generate on each burn).
// Resolves .mega names for burners only. No genesis log scans, no IPFS fetches,
// no per-NFT tokenURI calls, no reputation queries.

export async function GET() {
  try {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      return NextResponse.json({ entries: [], error: 'Redis not configured' });
    }

    // Fetch all gallery entries from Redis sorted set (newest first)
    const galleryResp = await fetch(upstashUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['ZREVRANGE', 'burn:gallery', '0', '-1']),
      cache: 'no-store',
    });

    if (!galleryResp.ok) {
      throw new Error(`Redis gallery fetch failed: ${galleryResp.status}`);
    }

    const { result: galleryItems } = await galleryResp.json();

    if (!Array.isArray(galleryItems) || galleryItems.length === 0) {
      return NextResponse.json(
        { entries: [], agentId: null },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
      );
    }

    // Parse gallery entries and group by burner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000') / 2;

    for (const raw of galleryItems) {
      try {
        const item = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const burner = (item.burner || '').toLowerCase();
        if (!burner) continue;

        const ipfsUrl = (item.ipfsUrl || item.image || '')
          .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
          .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/')
          .replace('https://cloudflare-ipfs.com/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
        const timestamp = item.timestamp || new Date().toISOString();
        const txHash = item.txHash || item.burnTx || '';

        const imageEntry = { ipfsUrl, timestamp, txHash };

        const existing = walletMap.get(burner);
        if (existing) {
          existing.totalBurns += 1;
          existing.totalBurned += burnAmountPerBurn;
          existing.images.push(imageEntry);
          if (timestamp > existing.latestTimestamp) {
            existing.latestImage = ipfsUrl || existing.latestImage;
            existing.latestTimestamp = timestamp;
          }
        } else {
          walletMap.set(burner, {
            address: burner,
            totalBurns: 1,
            totalBurned: burnAmountPerBurn,
            latestImage: ipfsUrl,
            latestTimestamp: timestamp,
            images: [imageEntry],
          });
        }
      } catch {
        // Skip malformed entries
      }
    }

    // Resolve .mega names for burners (batched, just getName — skip text records)
    await Promise.allSettled(
      Array.from(walletMap.values()).map(async (entry) => {
        try {
          const megaName = await viemClient.readContract({
            address: MEGANAMES_CONTRACT,
            abi: MEGANAMES_ABI,
            functionName: 'getName',
            args: [entry.address as `0x${string}`],
          });
          if (megaName && megaName.length > 0) {
            entry.megaName = megaName;
          }
        } catch {
          // No .mega name
        }
      }),
    );

    // Sort by total burns descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned,
    );

    return NextResponse.json(
      { entries, agentId: null },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch (err) {
    console.error('[Chadboard] Error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ entries: [], error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
