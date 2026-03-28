import { http, createConfig, injected } from 'wagmi';
import { megaethTestnet } from './wagmi';

export const testnetConfig = createConfig({
  chains: [megaethTestnet],
  connectors: [injected()],
  transports: {
    [megaethTestnet.id]: http(),
  },
  ssr: true,
});
