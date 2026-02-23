import { useEffect, useState } from 'react';
import { createPublicClient, webSocket, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

interface MintEvent {
  tokenId: string;
  to: string;
  blockNumber: bigint;
  transactionHash: string;
}

/**
 * Hook that subscribes to real-time NFT Transfer events (mints) via WebSocket
 * Returns the latest mint event when a new NFT is minted
 */
export function useRealtimeNFTMints() {
  const [latestMint, setLatestMint] = useState<MintEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Skip if no contract address configured
    if (NFT_CONTRACT === '0x0000000000000000000000000000000000000000') {
      return;
    }

    // Create WebSocket client
    const wsUrl = megaeth.rpcUrls.default.webSocket?.[0];
    if (!wsUrl) {
      console.warn('No WebSocket URL configured for MegaETH');
      return;
    }

    const client = createPublicClient({
      chain: megaeth,
      transport: webSocket(wsUrl, {
        reconnect: true,
        retryCount: 5,
        retryDelay: 1000,
      }),
    });

    setIsConnected(true);

    // Subscribe to Transfer events where 'from' is zero address (mints)
    const unwatch = client.watchEvent({
      address: NFT_CONTRACT,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      args: {
        from: '0x0000000000000000000000000000000000000000', // Filter for mints only
      },
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };

          setLatestMint({
            tokenId: tokenId.toString(),
            to: to.toLowerCase(),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });

          console.log('🔥 New NFT minted:', {
            tokenId: tokenId.toString(),
            to,
            txHash: log.transactionHash,
          });
        });
      },
      onError: (error) => {
        console.error('WebSocket subscription error:', error);
        setIsConnected(false);
      },
    });

    // Cleanup on unmount
    return () => {
      unwatch();
      setIsConnected(false);
    };
  }, []);

  return { latestMint, isConnected };
}
