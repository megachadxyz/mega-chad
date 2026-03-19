import { NextRequest, NextResponse } from 'next/server';
import { formatUnits, encodeFunctionData } from 'viem';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const MEGAETH_RPC = 'https://mainnet.megaeth.com/rpc';

// Known tokens on MegaETH with metadata
const MEGAETH_TOKENS = [
  {
    address: '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888',
    symbol: 'MEGACHAD',
    name: 'MegaChad',
    decimals: 18,
    logo: 'https://megachad.xyz/images/megachad-logo.png',
    coingeckoId: null,
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: null,
    coingeckoId: 'weth',
  },
  {
    address: '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7',
    symbol: 'USDm',
    name: 'USD Money',
    decimals: 18,
    logo: null,
    coingeckoId: null,
  },
] as const;

const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(MEGAETH_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

/**
 * GET /api/portal/tokens?address=0x...
 *
 * Returns all known MegaETH token balances for a wallet.
 * Includes ETH native balance + ERC-20 tokens.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      {
        error: 'Valid address required',
        usage: 'GET /api/portal/tokens?address=0x...',
        availableTokens: MEGAETH_TOKENS.map(t => ({ symbol: t.symbol, address: t.address })),
      },
      { status: 400 },
    );
  }

  try {
    // Fetch ETH balance + all token balances in parallel
    const ethBalancePromise = rpcCall('eth_getBalance', [address, 'latest']);

    const tokenPromises = MEGAETH_TOKENS.map(async (token) => {
      const data = encodeFunctionData({
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      try {
        const result = await rpcCall('eth_call', [{ to: token.address, data }, 'latest']);
        const balance = BigInt(result as string || '0');
        return {
          ...token,
          balance: formatUnits(balance, token.decimals),
          balanceRaw: balance.toString(),
          hasBalance: balance > 0n,
        };
      } catch {
        return {
          ...token,
          balance: '0',
          balanceRaw: '0',
          hasBalance: false,
        };
      }
    });

    const [ethBalRaw, ...tokenResults] = await Promise.all([
      ethBalancePromise,
      ...tokenPromises,
    ]);

    const ethBalance = formatUnits(BigInt(ethBalRaw as string || '0'), 18);

    return NextResponse.json({
      address,
      chain: {
        name: 'MegaETH',
        chainId: 4326,
        explorer: 'https://megaexplorer.xyz',
      },
      nativeBalance: {
        symbol: 'ETH',
        balance: ethBalance,
        balanceRaw: BigInt(ethBalRaw as string || '0').toString(),
      },
      tokens: tokenResults,
      _meta: {
        tokenCount: MEGAETH_TOKENS.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[portal/tokens] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 },
    );
  }
}
