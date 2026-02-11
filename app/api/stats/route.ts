import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { getTotalTokensBurned } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const MEGACHAD_CONTRACT = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

const ERC20_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function GET() {
  try {
    const [totalSupplyRaw, tokensBurned, totalBurns] = await Promise.all([
      viemClient.readContract({
        address: MEGACHAD_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
      getTotalTokensBurned(),
      getBurnCount(),
    ]);

    const totalSupply = Number(totalSupplyRaw / 10n ** 18n);
    const circulatingSupply = totalSupply - tokensBurned;

    return NextResponse.json({
      totalSupply,
      circulatingSupply,
      tokensBurned,
      totalBurns,
    });
  } catch (err) {
    console.error('Stats fetch failed:', err);
    return NextResponse.json({
      totalSupply: null,
      tokensBurned: null,
      totalBurns: null,
    });
  }
}

async function getBurnCount(): Promise<number> {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return 0;
    const r = new Redis({ url, token });
    const count = await r.zcard('burn:gallery');
    return count;
  } catch {
    return 0;
  }
}
