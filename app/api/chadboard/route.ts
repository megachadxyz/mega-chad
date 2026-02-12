import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BurnRecord {
  txHash: string;
  burner: string;
  prompt: string;
  cid: string;
  ipfsUrl: string;
  timestamp: string;
  burnAmount?: number;
}

export interface ChadboardEntry {
  address: string;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: { ipfsUrl: string; timestamp: string; txHash: string }[];
}

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

    // Group by wallet address
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    for (const burn of burns) {
      const addr = burn.burner.toLowerCase();
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
          address: burn.burner,
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
