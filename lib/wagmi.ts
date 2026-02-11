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
    default: { http: ['https://mainnet.megaeth.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://megaexplorer.xyz' },
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
