import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MEGACHAD_CONTRACT = '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888';
const DEAD_ADDRESS_PADDED = '0x000000000000000000000000000000000000000000000000000000000000dEaD';
const RPC_URL = 'https://mainnet.megaeth.com/rpc';

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function getOnChainStats(): Promise<{ totalSupply: number; tokensBurned: number }> {
  // totalSupply() selector = 0x18160ddd
  const totalSupplyHex = await rpcCall('eth_call', [
    { to: MEGACHAD_CONTRACT, data: '0x18160ddd' },
    'latest',
  ]);

  // balanceOf(0x...dEaD) selector = 0x70a08231 + padded address
  const burnedHex = await rpcCall('eth_call', [
    { to: MEGACHAD_CONTRACT, data: '0x70a08231' + DEAD_ADDRESS_PADDED.slice(2) },
    'latest',
  ]);

  const totalSupply = Number(BigInt(totalSupplyHex) / 10n ** 18n);
  const tokensBurned = Number(BigInt(burnedHex) / 10n ** 18n);

  return { totalSupply, tokensBurned };
}

export async function GET() {
  try {
    const [onChain, totalBurns] = await Promise.all([
      getOnChainStats(),
      getBurnCount(),
    ]);

    const circulatingSupply = onChain.totalSupply - onChain.tokensBurned;

    return NextResponse.json({
      totalSupply: onChain.totalSupply,
      circulatingSupply,
      tokensBurned: onChain.tokensBurned,
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
