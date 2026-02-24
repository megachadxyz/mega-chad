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
      } catch (err) {
        console.error(`[Chadboard] Failed to fetch tokenURI for NFT #${tokenId}:`, err instanceof Error ? err.message : String(err));
        // Return with empty tokenURI instead of null - we still want to show the NFT
        return {
          tokenId,
          owner: data.owner,
          tokenURI: '',
          blockNumber: data.blockNumber,
        } as NFTWithOwner;
      }
    });

    const nftData = (await Promise.all(nftDataPromises));

    console.log('[Chadboard] Successfully processed', nftData.length, 'NFTs from', currentOwners.size, 'total transfers');

    // Fetch metadata from IPFS to get images
    const nftsWithImages = await Promise.all(
      nftData.map(async (nft) => {
        try {
          // tokenURI might be IPFS or custom metadata endpoint
          let metadataUrl = nft.tokenURI;

          // Handle empty tokenURI - NFT exists but metadata not set
          if (!metadataUrl || metadataUrl.trim() === '') {
            console.warn(`[Chadboard] NFT #${nft.tokenId} has empty tokenURI, including with placeholder`);
            return {
              ...nft,
              imageUrl: '',
              name: `MegaChad #${nft.tokenId}`,
              description: 'Metadata pending',
            };
          }

          // If it's an IPFS URL, convert to gateway URL
          if (metadataUrl.startsWith('ipfs://')) {
            metadataUrl = metadataUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          }

          console.log(`[Chadboard] Fetching metadata for NFT #${nft.tokenId} from:`, metadataUrl);

          const response = await fetch(metadataUrl, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!response.ok) {
            console.error(`[Chadboard] Failed to fetch metadata for NFT #${nft.tokenId}:`, response.status);
            throw new Error(`HTTP ${response.status}`);
          }

          const metadata = await response.json();
          const imageUrl = metadata.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '';

          console.log(`[Chadboard] NFT #${nft.tokenId} image:`, imageUrl);

          return {
            ...nft,
            imageUrl,
            name: metadata.name || `MegaChad #${nft.tokenId}`,
            description: metadata.description || '',
          };
        } catch (err) {
          console.error(`[Chadboard] Error fetching metadata for NFT #${nft.tokenId}:`, err instanceof Error ? err.message : String(err));
          return {
            ...nft,
            imageUrl: '',
            name: `MegaChad #${nft.tokenId}`,
            description: 'Metadata fetch failed',
          };
        }
      })
    );

    // Group by current owner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    let skippedDeadAddress = 0;
    let skippedEmptyImage = 0;

    for (const nft of nftsWithImages) {
      // Skip burned NFTs (sent to dead address)
      if (nft.owner === '0x000000000000000000000000000000000000dead') {
        skippedDeadAddress++;
        continue;
      }

      // Include NFTs even if imageUrl is empty (will show placeholder)
      // This ensures we don't lose NFTs due to temporary IPFS issues
      if (!nft.imageUrl) {
        console.warn(`[Chadboard] NFT #${nft.tokenId} has no image URL, but including anyway`);
      }

      const existing = walletMap.get(nft.owner);

      const imageEntry = {
        ipfsUrl: nft.imageUrl || '', // Include even if empty
        timestamp: new Date(Number(nft.blockNumber) * 12000).toISOString(), // Approximate timestamp
        txHash: `0x${nft.tokenId}`, // Use tokenId as placeholder
      };

      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerBurn;
        existing.images.push(imageEntry);
        if (imageEntry.timestamp > existing.latestTimestamp) {
          existing.latestImage = nft.imageUrl || existing.latestImage; // Keep old image if new one is empty
          existing.latestTimestamp = imageEntry.timestamp;
        }
      } else {
        walletMap.set(nft.owner, {
          address: nft.owner,
          totalBurns: 1,
          totalBurned: burnAmountPerBurn,
          latestImage: nft.imageUrl || '',
          latestTimestamp: imageEntry.timestamp,
          images: [imageEntry],
        });
      }
    }

    console.log('[Chadboard] Skipped', skippedDeadAddress, 'NFTs sent to dead address');
    console.log('[Chadboard] Processed', nftsWithImages.length, 'total NFTs');
    console.log('[Chadboard] Included in entries:', nftsWithImages.length - skippedDeadAddress, 'NFTs');

    // Sort by total burns descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    console.log('[Chadboard] Grouped into', entries.length, 'wallet entries');

    // Calculate total NFTs in entries for verification
    const totalNFTsInEntries = entries.reduce((sum, entry) => sum + entry.totalBurns, 0);
    console.log('[Chadboard] Total NFTs in final entries:', totalNFTsInEntries);
    console.log('[Chadboard] Expected NFTs (excluding dead):', nftsWithImages.length - skippedDeadAddress);

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
