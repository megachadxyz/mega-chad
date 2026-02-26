import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';

export const megaethTestnet = defineChain({
  id: 6342,
  name: 'MegaETH Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://carrot.megaeth.com/rpc'],
      webSocket: ['wss://carrot.megaeth.com/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaexplorer.xyz' },
  },
});

export const megaeth = defineChain({
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://mainnet.megaeth.com/rpc'],
      webSocket: ['wss://mainnet.megaeth.com/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaexplorer.xyz' },
  },
  contracts: {
    // Multicall3 is deployed at the standard address on MegaETH
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
});

// wagmi auto-detects injected wallets (MetaMask, Brave, Phantom, etc.)
export const config = createConfig({
  chains: [megaeth],
  transports: {
    [megaeth.id]: http(),
  },
  ssr: true,
});
