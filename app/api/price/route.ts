import { NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits, formatEther } from 'viem';
import { megaeth } from '@/lib/wagmi';
import {
  KUMBAYA_QUOTER_V2,
  WETH,
  QUOTER_V2_ABI,
  DEFAULT_FEE,
} from '@/lib/kumbaya';
import { MEGACHAD_ADDRESS } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/price
 *
 * Returns the current $MEGACHAD price in ETH, derived from the Kumbaya DEX pool.
 * Quotes how much ETH 1 MEGACHAD is worth and how much MEGACHAD 1 ETH buys.
 */
export async function GET() {
  try {
    // Quote: 1 ETH → ? MEGACHAD
    const oneEth = 10n ** 18n;
    const ethToMegachad = await viemClient.simulateContract({
      address: KUMBAYA_QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: WETH,
          tokenOut: MEGACHAD_ADDRESS,
          amountIn: oneEth,
          fee: DEFAULT_FEE,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const megachadPerEth = ethToMegachad.result[0];

    // Quote: 1,000,000 MEGACHAD → ? ETH (use large amount for precision)
    const oneMillion = 1_000_000n * 10n ** 18n;
    let ethPerMegachad = 0n;
    try {
      const megachadToEth = await viemClient.simulateContract({
        address: KUMBAYA_QUOTER_V2,
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: MEGACHAD_ADDRESS,
            tokenOut: WETH,
            amountIn: oneMillion,
            fee: DEFAULT_FEE,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });
      ethPerMegachad = megachadToEth.result[0];
    } catch {
      // Pool may not have enough liquidity for reverse quote
    }

    const megachadPerEthNum = Number(formatUnits(megachadPerEth, 18));
    const priceInEth = megachadPerEthNum > 0 ? 1 / megachadPerEthNum : 0;

    // Cost to burn (225,000 MEGACHAD in ETH)
    const burnCostEth = priceInEth * 225000;

    return NextResponse.json(
      {
        token: {
          address: MEGACHAD_ADDRESS,
          symbol: 'MEGACHAD',
          decimals: 18,
        },
        price: {
          megachadPerEth: megachadPerEthNum,
          ethPerMegachad: priceInEth,
          ethPerMillionMegachad: ethPerMegachad > 0 ? formatEther(ethPerMegachad) : null,
        },
        burnCost: {
          tokensRequired: 225000,
          estimatedEth: burnCostEth,
          infraFeeUsdm: 1,
        },
        pool: {
          dex: 'Kumbaya',
          feeTier: DEFAULT_FEE,
          pair: 'MEGACHAD/WETH',
        },
        chain: {
          name: 'MegaETH',
          chainId: 4326,
          rpc: 'https://mainnet.megaeth.com/rpc',
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=15, s-maxage=15',
        },
      },
    );
  } catch (err) {
    console.error('[price] Quote failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch price from Kumbaya DEX' },
      { status: 502 },
    );
  }
}
