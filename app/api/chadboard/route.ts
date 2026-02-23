import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';

export const dynamic = 'force-dynamic';

export interface ChadboardEntry {
  address: string;
  megaName?: string; // .mega domain if registered
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: { ipfsUrl: string; timestamp: string; txHash: string }[];
}

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const MEGANAMES_CONTRACT = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997' as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

const NFT_ABI = [
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

const MEGANAMES_ABI = [
  {
    type: 'function',
    name: 'getName',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

interface NFTWithOwner {
  tokenId: string;
  owner: string;
  tokenURI: string;
  blockNumber: bigint;
}

export async function GET() {
  try {
    console.log('[Chadboard] Starting fetch, NFT contract:', NFT_CONTRACT);

    // Query all Transfer events from NFT contract
    const transferLogs = await viemClient.getLogs({
      address: NFT_CONTRACT,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      fromBlock: 0n,
      toBlock: 'latest',
    });

    console.log('[Chadboard] Found', transferLogs.length, 'transfer events');

    // Build map of tokenId -> current owner and track transfer history
    const currentOwners = new Map<string, { owner: string; blockNumber: bigint }>();

    for (const log of transferLogs) {
      const { to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };
      const tokenIdStr = tokenId.toString();

      currentOwners.set(tokenIdStr, {
        owner: to.toLowerCase(),
        blockNumber: log.blockNumber,
      });
    }

    // Query tokenURI for each NFT to get metadata
    const nftDataPromises = Array.from(currentOwners.entries()).map(async ([tokenId, data]) => {
      try {
        const tokenURI = await viemClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
        });

        return {
          tokenId,
          owner: data.owner,
          tokenURI,
          blockNumber: data.blockNumber,
        } as NFTWithOwner;
      } catch {
        return null;
      }
    });

    const nftData = (await Promise.all(nftDataPromises)).filter((d) => d !== null) as NFTWithOwner[];

    console.log('[Chadboard] Successfully fetched', nftData.length, 'NFT metadata');

    // Fetch metadata from IPFS to get images
    const nftsWithImages = await Promise.all(
      nftData.map(async (nft) => {
        try {
          // tokenURI is an IPFS URL like ipfs://...
          const ipfsUrl = nft.tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const response = await fetch(ipfsUrl);
          const metadata = await response.json();

          const imageUrl = metadata.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '';

          return {
            ...nft,
            imageUrl,
            name: metadata.name || '',
            description: metadata.description || '',
          };
        } catch {
          return {
            ...nft,
            imageUrl: '',
            name: '',
            description: '',
          };
        }
      })
    );

    // Group by current owner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    for (const nft of nftsWithImages) {
      // Skip burned NFTs (sent to dead address)
      if (nft.owner === '0x000000000000000000000000000000000000dead') continue;

      const existing = walletMap.get(nft.owner);

      const imageEntry = {
        ipfsUrl: nft.imageUrl,
        timestamp: new Date(Number(nft.blockNumber) * 12000).toISOString(), // Approximate timestamp
        txHash: `0x${nft.tokenId}`, // Use tokenId as placeholder
      };

      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerBurn;
        existing.images.push(imageEntry);
        if (imageEntry.timestamp > existing.latestTimestamp) {
          existing.latestImage = nft.imageUrl;
          existing.latestTimestamp = imageEntry.timestamp;
        }
      } else {
        walletMap.set(nft.owner, {
          address: nft.owner,
          totalBurns: 1,
          totalBurned: burnAmountPerBurn,
          latestImage: nft.imageUrl,
          latestTimestamp: imageEntry.timestamp,
          images: [imageEntry],
        });
      }
    }

    // Sort by total burns descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    console.log('[Chadboard] Grouped into', entries.length, 'wallet entries');

    // Resolve .mega names for all addresses
    await Promise.all(
      entries.map(async (entry) => {
        try {
          const megaName = await viemClient.readContract({
            address: MEGANAMES_CONTRACT,
            abi: MEGANAMES_ABI,
            functionName: 'getName',
            args: [entry.address as `0x${string}`],
          });
          if (megaName && megaName.length > 0) {
            entry.megaName = megaName;
          }
        } catch {
          // No .mega name registered for this address
        }
      })
    );

    console.log('[Chadboard] Returning', entries.length, 'entries');
    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[Chadboard] FATAL ERROR:', err);
    console.error('[Chadboard] Error details:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ entries: [], error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
