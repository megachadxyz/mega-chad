import { NextResponse } from 'next/server';
import { createPublicClient, http, defineChain } from 'viem';

export const dynamic = 'force-dynamic';

const MEGACHAD_CONTRACT = (process.env.NEXT_PUBLIC_MEGACHAD_CONTRACT ||
  '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888') as `0x${string}`;

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function GET() {
  try {
    // Create client fresh per request to avoid stale connections on serverless
    const megaeth = defineChain({
      id: 4326,
      name: 'MegaETH',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: ['https://mainnet.megaeth.com/rpc'] },
      },
    });

    const client = createPublicClient({
      chain: megaeth,
      transport: http('https://mainnet.megaeth.com/rpc'),
    });

    const [totalSupplyRaw, burnedRaw, totalBurns] = await Promise.all([
      client.readContract({
        address: MEGACHAD_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
      client.readContract({
        address: MEGACHAD_CONTRACT,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [BURN_ADDRESS],
      }),
      getBurnCount(),
    ]);

    const totalSupply = Number(totalSupplyRaw / 10n ** 18n);
    const tokensBurned = Number(burnedRaw / 10n ** 18n);
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
