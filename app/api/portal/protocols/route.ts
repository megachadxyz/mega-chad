import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portal/protocols
 *
 * MegaETH protocol directory — curated list of protocols
 * building on MegaETH with metadata, links, and categories.
 */
export async function GET() {
  return NextResponse.json({
    chain: {
      name: 'MegaETH',
      chainId: 4326,
      description: 'Real-time blockchain with sub-second block times and 100k+ TPS',
      rpc: 'https://mainnet.megaeth.com/rpc',
      ws: 'wss://mainnet.megaeth.com/ws',
      explorer: 'https://megaexplorer.xyz',
    },
    protocols: [
      {
        name: 'MegaChad',
        category: 'NFT / AI',
        description: 'Burn-to-create looksmaxxing engine. Burn $MEGACHAD tokens to generate AI-enhanced portraits and mint NFTs.',
        url: 'https://megachad.xyz',
        token: 'MEGACHAD',
        tokenAddress: '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888',
        features: ['Burn-to-Create', 'AI Generation', 'NFT Minting', 'Agent Referrals', 'MCP Server', 'x402 Payments'],
        hasMcpIntegration: true,
        hasX402: true,
        agentId: 12408,
      },
      {
        name: 'Kumbaya',
        category: 'DEX',
        description: 'Uniswap V3-style decentralized exchange on MegaETH. Primary liquidity venue.',
        url: 'https://kumbaya.xyz',
        contracts: {
          quoter: '0x1F1a8dC7E138C34b503Ca080962aC10B75384a27',
          swapRouter: '0xE5BbEF8De2DB447a7432A47EBa58924d94eE470e',
        },
        features: ['Concentrated Liquidity', 'Multi-Fee Tiers', 'Swap Routing'],
      },
      {
        name: 'MegaETH Bridge',
        category: 'Bridge',
        description: 'Canonical bridge from Ethereum L1 to MegaETH.',
        url: 'https://bridge.megaeth.com',
        features: ['Canonical Bridge', 'ETH Deposits'],
      },
      {
        name: 'Rabbithole',
        category: 'Bridge',
        description: 'Cross-chain bridge aggregator supporting 10+ source chains to MegaETH.',
        url: 'https://rabbithole.megaeth.com/bridge',
        features: ['Multi-Chain', 'Fast Bridge', 'ETH/USDC/USDT'],
        supportedChains: ['Ethereum', 'Arbitrum', 'Base', 'Optimism', 'Polygon', 'BNB Chain', 'Avalanche', 'Scroll', 'zkSync', 'Linea'],
      },
      {
        name: 'Meridian',
        category: 'Payments',
        description: 'x402 payment infrastructure for API monetization. HTTP 402 standard.',
        url: 'https://mrdn.finance',
        contracts: {
          facilitator: '0x8E7769D440b3460b92159Dd9C6D17302b036e2d6',
          usdmForwarder: '0x2c2d8EF0664432BA243deF0b8f60aF7aB43a60B4',
        },
        features: ['x402 Protocol', 'USDm Stablecoin', 'Meta-Transactions'],
      },
      {
        name: 'x402',
        category: 'Payments',
        description: 'Open protocol for machine-native payments over HTTP. Pay-per-call APIs using the 402 status code. Set up payment-gated endpoints in minutes.',
        url: 'https://x402.org',
        features: ['HTTP 402', 'Pay-Per-Call', 'Agent Payments', 'API Monetization'],
      },
      {
        name: 'Warren Protocol',
        category: 'Storage',
        description: 'Permanent on-chain data storage for images and files on MegaETH.',
        url: 'https://thewarren.app',
        contracts: {
          registry: '0xb7f14622ea97b26524BE743Ab6D9FA519Afbe756',
        },
        features: ['On-Chain Storage', 'Permanent URLs', 'Partner API'],
      },
      {
        name: 'ERC-8004 Registry',
        category: 'Identity',
        description: 'Trustless agent identity and reputation registry on MegaETH. Register AI agents, build on-chain reputation, and enable agent-to-agent discovery.',
        url: 'https://erc8004.org',
        contracts: {
          identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
          reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
        },
        features: ['Agent Identity', 'On-Chain Reputation', 'Service Discovery', 'Sybil-Resistant Ratings'],
      },
      {
        name: 'MegaNames',
        category: 'Identity',
        description: '.mega domain name service for human-readable addresses on MegaETH. Register your identity, link social profiles, and appear on the Chadboard.',
        url: 'https://meganames.xyz',
        contracts: {
          registry: '0x5B424C6CCba77b32b9625a6fd5A30D997',
        },
        features: ['Domain Names', 'Reverse Resolution', 'Profile Metadata', 'Social Links', 'Chadboard Identity'],
      },
    ],
    infrastructure: {
      tokens: [
        { symbol: 'ETH', name: 'Ether', type: 'native', decimals: 18 },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
        { symbol: 'USDm', name: 'USD Money', address: '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7', decimals: 18 },
        { symbol: 'MEGACHAD', name: 'MegaChad', address: '0x374A17bd16B5cD76aaeFC9EAF76aE07e9aF3d888', decimals: 18 },
      ],
    },
    _meta: {
      lastUpdated: '2026-03-19',
      protocolCount: 9,
      description: 'Community-curated MegaETH protocol directory. Submit additions via GitHub.',
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
