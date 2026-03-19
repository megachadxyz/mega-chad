// Cross-Chain Intent Resolution
// Supports bridging from any EVM chain to MegaETH for looksmaxxing

export const MEGAETH_CHAIN_ID = 4326;

export interface ChainConfig {
  id: number;
  name: string;
  displayName: string;
  rpc: string;
  nativeCurrency: string;
  bridgeSupport: ('rabbithole' | 'canonical')[];
  bridgeUrl: string;
  estimatedBridgeTime: string;
  assets: string[];
}

export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    nativeCurrency: 'ETH',
    bridgeSupport: ['canonical', 'rabbithole'],
    bridgeUrl: 'https://bridge.megaeth.com',
    estimatedBridgeTime: '~10-15 minutes (canonical), ~2-5 minutes (Rabbithole)',
    assets: ['ETH', 'USDC', 'USDT'],
  },
  base: {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    rpc: 'https://mainnet.base.org',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~2-5 minutes',
    assets: ['ETH', 'USDC', 'USDT'],
  },
  arbitrum: {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~2-5 minutes',
    assets: ['ETH', 'USDC', 'USDT'],
  },
  optimism: {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~2-5 minutes',
    assets: ['ETH', 'USDC', 'USDT'],
  },
  polygon: {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    nativeCurrency: 'MATIC',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['USDC', 'USDT'],
  },
  bnb: {
    id: 56,
    name: 'bnb',
    displayName: 'BNB Chain',
    rpc: 'https://bsc-dataseed.binance.org',
    nativeCurrency: 'BNB',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['USDC', 'USDT'],
  },
  avalanche: {
    id: 43114,
    name: 'avalanche',
    displayName: 'Avalanche',
    rpc: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: 'AVAX',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['USDC', 'USDT'],
  },
  scroll: {
    id: 534352,
    name: 'scroll',
    displayName: 'Scroll',
    rpc: 'https://rpc.scroll.io',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['ETH'],
  },
  zksync: {
    id: 324,
    name: 'zksync',
    displayName: 'zkSync Era',
    rpc: 'https://mainnet.era.zksync.io',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['ETH'],
  },
  linea: {
    id: 59144,
    name: 'linea',
    displayName: 'Linea',
    rpc: 'https://rpc.linea.build',
    nativeCurrency: 'ETH',
    bridgeSupport: ['rabbithole'],
    bridgeUrl: 'https://rabbithole.megaeth.com/bridge',
    estimatedBridgeTime: '~5-10 minutes',
    assets: ['ETH'],
  },
};

export function getChainByName(name: string): ChainConfig | null {
  const normalized = name.toLowerCase().replace(/[\s-_]/g, '');
  // Direct lookup
  if (SUPPORTED_CHAINS[normalized]) return SUPPORTED_CHAINS[normalized];
  // Aliases
  const aliases: Record<string, string> = {
    eth: 'ethereum',
    mainnet: 'ethereum',
    arb: 'arbitrum',
    op: 'optimism',
    poly: 'polygon',
    matic: 'polygon',
    bsc: 'bnb',
    binance: 'bnb',
    avax: 'avalanche',
    zksyncera: 'zksync',
  };
  if (aliases[normalized]) return SUPPORTED_CHAINS[aliases[normalized]];
  // Partial match
  for (const [key, config] of Object.entries(SUPPORTED_CHAINS)) {
    if (key.includes(normalized) || config.displayName.toLowerCase().includes(normalized)) {
      return config;
    }
  }
  return null;
}

export function getChainById(chainId: number): ChainConfig | null {
  for (const config of Object.values(SUPPORTED_CHAINS)) {
    if (config.id === chainId) return config;
  }
  return null;
}

export interface CrossChainIntent {
  id: string;
  sourceChain: ChainConfig;
  wallet?: string;
  amount?: string;
  status: 'pending' | 'bridging' | 'swapping' | 'burning' | 'generating' | 'minting' | 'complete' | 'failed';
  steps: CrossChainStep[];
  createdAt: number;
  referrer?: string;
}

export interface CrossChainStep {
  step: number;
  type: 'bridge' | 'swap' | 'approve' | 'burn' | 'generate' | 'mint';
  label: string;
  description: string;
  status: 'pending' | 'in_progress' | 'complete' | 'failed' | 'skipped';
  chainId: number;
  tx?: {
    to: string;
    data?: string;
    value?: string;
  };
  externalUrl?: string;
  txHash?: string;
  error?: string;
}

export function buildCrossChainPlan(
  sourceChain: ChainConfig,
  wallet?: string,
  amount?: string,
  referrer?: string,
): CrossChainIntent {
  const id = `cc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const steps: CrossChainStep[] = [];

  // Step 1: Bridge
  const bridgeMethod = sourceChain.bridgeSupport.includes('rabbithole') ? 'Rabbithole' : 'MegaETH Bridge';
  steps.push({
    step: 1,
    type: 'bridge',
    label: `Bridge ETH from ${sourceChain.displayName}`,
    description: `Use ${bridgeMethod} to bridge ${amount || 'ETH'} from ${sourceChain.displayName} to MegaETH. Estimated time: ${sourceChain.estimatedBridgeTime}`,
    status: 'pending',
    chainId: sourceChain.id,
    externalUrl: sourceChain.bridgeUrl,
  });

  // Step 2: Swap ETH → $MEGACHAD
  steps.push({
    step: 2,
    type: 'swap',
    label: 'Swap ETH for $MEGACHAD',
    description: 'Swap bridged ETH for $MEGACHAD on Kumbaya DEX (1% fee tier)',
    status: 'pending',
    chainId: MEGAETH_CHAIN_ID,
  });

  // Step 3: Approve (if using referral contract)
  if (referrer) {
    steps.push({
      step: 3,
      type: 'approve',
      label: 'Approve referral contract',
      description: 'Approve the referral contract to spend $MEGACHAD for the burn',
      status: 'pending',
      chainId: MEGAETH_CHAIN_ID,
    });
  }

  // Step 4: Burn
  steps.push({
    step: referrer ? 4 : 3,
    type: 'burn',
    label: 'Burn 225,000 $MEGACHAD',
    description: referrer
      ? 'Burn via referral contract — 50% burned, 45% tren fund, 5% referrer'
      : 'Transfer 112,500 to dead address + 112,500 to tren fund',
    status: 'pending',
    chainId: MEGAETH_CHAIN_ID,
  });

  // Step 5: Generate
  steps.push({
    step: referrer ? 5 : 4,
    type: 'generate',
    label: 'AI Looksmaxx Generation',
    description: 'Replicate AI generates your looksmaxxed portrait',
    status: 'pending',
    chainId: MEGAETH_CHAIN_ID,
  });

  // Step 6: Mint
  steps.push({
    step: referrer ? 6 : 5,
    type: 'mint',
    label: 'Mint NFT',
    description: 'Pin to IPFS and mint your looksmaxxed NFT on MegaETH',
    status: 'pending',
    chainId: MEGAETH_CHAIN_ID,
  });

  return {
    id,
    sourceChain,
    wallet,
    amount,
    status: 'pending',
    steps,
    createdAt: Date.now(),
    referrer,
  };
}
