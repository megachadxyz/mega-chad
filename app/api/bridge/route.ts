import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bridge
 *
 * Returns bridge information for agents that need to move assets to MegaETH.
 */
export async function GET() {
  return NextResponse.json(
    {
      chain: {
        name: 'MegaETH',
        chainId: 4326,
        rpc: 'https://mainnet.megaeth.com/rpc',
        explorer: 'https://megaexplorer.xyz',
      },
      bridges: [
        {
          name: 'MegaETH Bridge',
          url: 'https://bridge.megaeth.com',
          from: ['Ethereum Mainnet'],
          assets: ['ETH'],
          type: 'canonical',
          description: 'Official MegaETH canonical bridge from Ethereum L1.',
        },
        {
          name: 'Rabbithole',
          url: 'https://rabbithole.gg',
          from: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche'],
          assets: ['ETH', 'USDC', 'USDT'],
          type: 'aggregator',
          description: 'Cross-chain bridge aggregator supporting multiple source chains to MegaETH.',
        },
      ],
      tokens: {
        megachad: {
          address: '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888',
          symbol: 'MEGACHAD',
          decimals: 18,
          note: 'Only available on MegaETH. Bridge ETH first, then swap via Kumbaya DEX.',
        },
        weth: {
          address: '0x4200000000000000000000000000000000000006',
          symbol: 'WETH',
          decimals: 18,
        },
        usdm: {
          address: '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7',
          symbol: 'USDm',
          decimals: 18,
          note: 'Required for x402 infra fee (1 USDm per looksmaxx).',
        },
      },
      flow: {
        step1: 'Bridge ETH to MegaETH via bridge.megaeth.com or Rabbithole',
        step2: 'Swap ETH → $MEGACHAD via GET /api/x402/quote?ethAmount=<amount>',
        step3: 'Check wallet readiness via GET /api/wallet?address=<your_address>',
        step4: 'Proceed with burn-to-create via /api/x402/looksmaxx',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
