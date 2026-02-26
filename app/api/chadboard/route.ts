import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { megaeth } from '@/lib/wagmi';

// Cache the built leaderboard for 60 s at the Vercel edge.
// Stale-while-revalidate: requests within the window are instant;
// Next.js rebuilds in the background after expiry.
export const revalidate = 60;

export interface ChadboardEntry {
  address: string;
  megaName?: string;
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

// Fetch IPFS JSON metadata, racing two gateways so the faster one wins.
async function fetchIPFSMetadata(cid: string): Promise<Record<string, unknown>> {
  const gateways = [
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.pinata.cloud/ipfs/${cid}`,
  ];

  const controller = new AbortController();
  const { signal } = controller;

  const tryGateway = (url: string) =>
    fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'force-cache', // IPFS content is immutable — CDN-cache aggressively
    }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Record<string, unknown>>;
    });

  try {
    // Promise.any resolves on the first success, ignores failures
    const result = await Promise.any(gateways.map(tryGateway));
    controller.abort(); // cancel the slower request
    return result;
  } catch {
    controller.abort();
    throw new Error(`All IPFS gateways failed for ${cid}`);
  }
}

export async function GET() {
  try {
    console.log('[Chadboard] Starting fetch, NFT contract:', NFT_CONTRACT);

    // ── 1. Fetch all Transfer events ─────────────────────────────────
    const transferLogs = await viemClient.getLogs({
      address: NFT_CONTRACT,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      fromBlock: 0n,
      toBlock: 'latest',
    });

    console.log('[Chadboard] Found', transferLogs.length, 'transfer events');

    // Build tokenId → current owner map
    const currentOwners = new Map<string, { owner: string; blockNumber: bigint }>();
    for (const log of transferLogs) {
      const { to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };
      currentOwners.set(tokenId.toString(), {
        owner: to.toLowerCase(),
        blockNumber: log.blockNumber,
      });
    }

    const tokenIds = Array.from(currentOwners.keys());

    // ── 2. Batch all tokenURI reads into one multicall ────────────────
    const tokenURIResults = await viemClient.multicall({
      contracts: tokenIds.map((tokenId) => ({
        address: NFT_CONTRACT,
        abi: NFT_ABI,
        functionName: 'tokenURI' as const,
        args: [BigInt(tokenId)] as const,
      })),
      allowFailure: true,
    });

    const nftData = tokenIds.map((tokenId, i) => {
      const result = tokenURIResults[i];
      const ownerData = currentOwners.get(tokenId)!;
      return {
        tokenId,
        owner: ownerData.owner,
        tokenURI: result.status === 'success' ? (result.result as string) : '',
        blockNumber: ownerData.blockNumber,
      };
    });

    console.log('[Chadboard] Fetched', nftData.length, 'tokenURIs via multicall');

    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // ── 3. Fetch metadata for all NFTs concurrently ──────────────────
    const nftsWithImages = await Promise.all(
      nftData.map(async (nft) => {
        try {
          const metadataUrl = nft.tokenURI;

          if (!metadataUrl || metadataUrl.trim() === '') {
            return {
              ...nft,
              imageUrl: '',
              name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
              timestamp: new Date().toISOString(),
            };
          }

          // Warren NFT: pull directly from Upstash (fast, no HTTP round-trip)
          if (metadataUrl.includes('/api/metadata/') && upstashUrl && upstashToken) {
            try {
              const redisResp = await fetch(upstashUrl, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${upstashToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(['GET', `nft:metadata:${nft.tokenId}`]),
                cache: 'no-store',
              });
              if (redisResp.ok) {
                const { result } = await redisResp.json();
                if (result) {
                  const stored = typeof result === 'string' ? JSON.parse(result) : result;
                  return {
                    ...nft,
                    imageUrl: stored.ipfsUrl?.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') || '',
                    name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
                    timestamp: stored.timestamp || new Date().toISOString(),
                  };
                }
              }
            } catch (err) {
              console.error(`[Chadboard] Upstash failed for #${nft.tokenId}:`, err instanceof Error ? err.message : String(err));
            }
            return {
              ...nft,
              imageUrl: '',
              name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
              timestamp: new Date().toISOString(),
            };
          }

          // IPFS metadata: extract CID and race two gateways
          let cid = metadataUrl;
          if (cid.startsWith('ipfs://')) cid = cid.slice(7);
          if (cid.startsWith('https://')) {
            // Already a gateway URL — extract CID
            const match = cid.match(/\/ipfs\/(.+)/);
            cid = match ? match[1] : cid;
          }

          const metadata = await fetchIPFSMetadata(cid);
          const imageRaw = (metadata.image as string) || '';
          const imageCid = imageRaw.startsWith('ipfs://') ? imageRaw.slice(7) : imageRaw;
          const imageUrl = imageCid
            ? `https://ipfs.io/ipfs/${imageCid}`
            : '';
          const attrs = (metadata.attributes as { trait_type: string; value: string }[]) || [];
          const timestampAttr = attrs.find((a) => a.trait_type === 'Timestamp');

          return {
            ...nft,
            imageUrl,
            name: (metadata.name as string) || `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
            timestamp: timestampAttr?.value || new Date().toISOString(),
          };
        } catch (err) {
          console.error(`[Chadboard] Metadata fetch failed for #${nft.tokenId}:`, err instanceof Error ? err.message : String(err));
          return {
            ...nft,
            imageUrl: '',
            name: `$MEGACHAD ${nft.tokenId.padStart(4, '0')}`,
            timestamp: new Date().toISOString(),
          };
        }
      })
    );

    // ── 4. Group by current owner ─────────────────────────────────────
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerBurn = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '1000') / 2;
    const DEAD = '0x000000000000000000000000000000000000dead';

    for (const nft of nftsWithImages) {
      if (nft.owner === DEAD) continue;

      const imageEntry = {
        ipfsUrl: nft.imageUrl || '',
        timestamp: nft.timestamp || new Date().toISOString(),
        txHash: `0x${nft.tokenId}`,
      };

      const existing = walletMap.get(nft.owner);
      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerBurn;
        existing.images.push(imageEntry);
        if (imageEntry.timestamp > existing.latestTimestamp) {
          existing.latestImage = nft.imageUrl || existing.latestImage;
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

    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    // ── 5. Batch all .mega name lookups into one multicall ────────────
    if (entries.length > 0) {
      const nameResults = await viemClient.multicall({
        contracts: entries.map((entry) => ({
          address: MEGANAMES_CONTRACT,
          abi: MEGANAMES_ABI,
          functionName: 'getName' as const,
          args: [entry.address as `0x${string}`] as const,
        })),
        allowFailure: true,
      });

      nameResults.forEach((result, i) => {
        if (result.status === 'success' && result.result && (result.result as string).length > 0) {
          entries[i].megaName = result.result as string;
        }
      });
    }

    console.log('[Chadboard] Returning', entries.length, 'entries');
    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[Chadboard] FATAL ERROR:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ entries: [], error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
