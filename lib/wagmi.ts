import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';

export const megaethTestnet = defineChain({
  id: 6342,
  name: 'MegaETH Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://carrot.megaeth.com/rpc'] },
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
    default: { http: ['https://rpc.megaeth.com'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaexplorer.xyz' },
  },
});

// Use testnet by default — switch to mainnet via env
// wagmi auto-detects injected wallets (MetaMask, Brave, Phantom, etc.)
export const config = createConfig({
  chains: [megaethTestnet],
  transports: {
    [megaethTestnet.id]: http(),
  },
  ssr: true,
});
