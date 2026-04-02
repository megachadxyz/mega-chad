import { http, createConfig, injected } from 'wagmi';
import { defineChain } from 'viem';

export const megaethTestnet = defineChain({
  id: 6343,
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
});

// Explicitly register injected wallet connector (MetaMask, Brave, Phantom, etc.)
export const config = createConfig({
  chains: [megaeth],
  connectors: [injected()],
  transports: {
    [megaeth.id]: http(),
  },
  ssr: true,
});
