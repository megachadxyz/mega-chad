import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';

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
    const [totalSupplyRaw, burnStats] = await Promise.all([
      viemClient.readContract({
        address: MEGACHAD_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
      getBurnStats(),
    ]);

    const totalSupply = Number(totalSupplyRaw / 10n ** 18n);
    const circulatingSupply = totalSupply - burnStats.tokensBurned;

    return NextResponse.json({
      totalSupply,
      circulatingSupply,
      tokensBurned: burnStats.tokensBurned,
      totalBurns: burnStats.totalBurns,
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

async function getBurnStats(): Promise<{ totalBurns: number; tokensBurned: number }> {
  try {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return { totalBurns: 0, tokensBurned: 0 };
    const r = new Redis({ url, token });

    const totalBurns = await r.zcard('burn:gallery');
    // Only half of BURN_AMOUNT goes to the dead address (actual burn)
    const burnAmount = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000');
    const tokensBurned = totalBurns * (burnAmount / 2);

    return { totalBurns, tokensBurned };
  } catch (err) {
    console.error('getBurnStats error:', err);
    return { totalBurns: 0, tokensBurned: 0 };
  }
}
