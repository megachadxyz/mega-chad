import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const nftData = (await Promise.all(nftDataPromises)).filter(nft => nft !== null);

    console.log('[Chadboard] Successfully processed', nftData.length, 'NFTs from', currentOwners.size, 'total');

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Fetch metadata for each NFT
    const nftsWithImages = await Promise.all(
      nftData.map(async (nft) => {
        try {
          const metadataUrl = nft.tokenURI;

          // Handle empty tokenURI
          if (!metadataUrl || metadataUrl.trim() === '') {
            return {
              ...nft,
              imageUrl: '',
              name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
              description: 'Metadata pending',
              timestamp: new Date().toISOString(),
            };
          }

          // ── Warren / custom metadata: query Upstash REST API directly ───
          // Avoids unreliable same-domain HTTP calls and SDK runtime issues
          // Use nft.tokenId (from Transfer events) — URL may contain PLACEHOLDER
          const isCustomMetadata = metadataUrl.includes('/api/metadata/');
          if (isCustomMetadata && upstashUrl && upstashToken) {
            const tokenId = nft.tokenId;
            try {
              const key = `nft:metadata:${tokenId}`;
              const redisResp = await fetch(upstashUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${upstashToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(['GET', key]),
                cache: 'no-store',
              });
              if (redisResp.ok) {
                const { result } = await redisResp.json();
                if (result) {
                  const stored = typeof result === 'string' ? JSON.parse(result) : result;
                  const rawUrl: string = stored.ipfsUrl || '';
                  const imageUrl = rawUrl
                    .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                    .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/')
                    .replace('https://cloudflare-ipfs.com/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
                  return {
                    ...nft,
                    imageUrl,
                    name: `$MEGACHAD ${tokenId.padStart(4, '0')}`,
                    description: `Looksmaxxed by ${stored.burner}`,
                    timestamp: stored.timestamp || new Date().toISOString(),
                  };
                }
              }
            } catch (redisErr) {
              console.error(`[Chadboard] Upstash lookup failed for NFT #${nft.tokenId}:`, redisErr instanceof Error ? redisErr.message : String(redisErr));
            }
            // If Upstash lookup failed, skip HTTP self-call — return placeholder
            return {
              ...nft,
              imageUrl: '',
              name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
              description: 'Metadata unavailable',
              timestamp: new Date().toISOString(),
            };
          }

          // ── IPFS metadata: fetch via HTTP ────────────────────────────────
          let fetchUrl = metadataUrl;
          if (fetchUrl.startsWith('ipfs://')) {
            fetchUrl = fetchUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          }

          const response = await fetch(fetchUrl, {
            signal: AbortSignal.timeout(15000),
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const metadata = await response.json();
          const imageUrl = metadata.image?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '';
          const timestampAttr = metadata.attributes?.find((attr: any) => attr.trait_type === 'Timestamp');

          return {
            ...nft,
            imageUrl,
            name: metadata.name || `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
            description: metadata.description || '',
            timestamp: timestampAttr?.value || new Date().toISOString(),
          };
        } catch (err) {
          console.error(`[Chadboard] Error fetching metadata for NFT #${nft.tokenId}:`, err instanceof Error ? err.message : String(err));
          return {
            ...nft,
            imageUrl: '',
            name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
            description: 'Metadata fetch failed',
            timestamp: new Date().toISOString(),
          };
        }
      })
    );

    // Group by current owner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;

    let skippedDeadAddress = 0;

    for (const nft of nftsWithImages) {
      // Skip burned NFTs (sent to dead address) - owner is already lowercase from line 76
      if (nft.owner === '0x000000000000000000000000000000000000dead') {
        skippedDeadAddress++;
        continue;
      }

      // Include NFTs even if imageUrl is empty

      const existing = walletMap.get(nft.owner);

      const imageEntry = {
        ipfsUrl: nft.imageUrl || '', // Include even if empty
        timestamp: (nft as any).timestamp || new Date().toISOString(), // Use actual mint timestamp
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

    // Sort by total burns descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    console.log('[Chadboard] Returning', entries.length, 'entries from', nftsWithImages.length, 'total NFTs');

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
