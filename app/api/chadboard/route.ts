import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, keccak256, encodePacked, toBytes } from 'viem';
import { megaeth } from '@/lib/wagmi';
import {
  ERC8004_REPUTATION_REGISTRY,
  REPUTATION_REGISTRY_ABI,
} from '@/lib/erc8004';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface MegaNameProfile {
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  telegram?: string;
  url?: string;
}

export interface ChadboardEntry {
  address: string;
  megaName?: string;
  megaProfile?: MegaNameProfile;
  totalBurns: number;
  totalBurned: number;
  latestImage: string;
  latestTimestamp: string;
  images: { ipfsUrl: string; timestamp: string; txHash: string }[];
  reputation?: { score: number | null; count: number };
}

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

const MEGANAMES_CONTRACT = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997' as `0x${string}`;

// MegaChad agent ID for reputation queries (set when registered on-chain)
const MEGACHAD_AGENT_ID = process.env.MEGACHAD_AGENT_ID
  ? BigInt(process.env.MEGACHAD_AGENT_ID)
  : null;

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
  {
    type: 'function',
    name: 'getText',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

// MegaNames tokenId computation (ENS-style namehash)
const MEGA_NODE = keccak256(encodePacked(['bytes32', 'bytes32'], [
  '0x0000000000000000000000000000000000000000000000000000000000000000',
  keccak256(toBytes('mega')),
]));

function getTokenId(label: string): bigint {
  return BigInt(keccak256(encodePacked(['bytes32', 'bytes32'], [
    MEGA_NODE, keccak256(toBytes(label.toLowerCase())),
  ])));
}

const TEXT_RECORD_KEYS = ['avatar', 'description', 'com.twitter', 'com.github', 'org.telegram', 'url'] as const;

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

    console.log('[Chadboard] Processed', walletMap.size, 'burner wallets from', nftsWithImages.length, 'total NFTs');

    // Resolve .mega names and text records for burner addresses
    async function resolveMegaProfile(entry: ChadboardEntry) {
      try {
        const megaName = await viemClient.readContract({
          address: MEGANAMES_CONTRACT,
          abi: MEGANAMES_ABI,
          functionName: 'getName',
          args: [entry.address as `0x${string}`],
        });
        if (megaName && megaName.length > 0) {
          entry.megaName = megaName;

          const tokenId = getTokenId(megaName);
          const records = await Promise.allSettled(
            TEXT_RECORD_KEYS.map((key) =>
              viemClient.readContract({
                address: MEGANAMES_CONTRACT,
                abi: MEGANAMES_ABI,
                functionName: 'getText',
                args: [tokenId, key],
              })
            )
          );

          const profile: MegaNameProfile = {};
          TEXT_RECORD_KEYS.forEach((key, i) => {
            const result = records[i];
            if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
              if (key === 'com.twitter') profile.twitter = result.value;
              else if (key === 'com.github') profile.github = result.value;
              else if (key === 'org.telegram') profile.telegram = result.value;
              else if (key === 'avatar') profile.avatar = result.value;
              else if (key === 'description') profile.description = result.value;
              else if (key === 'url') profile.url = result.value;
            }
          });

          if (Object.keys(profile).length > 0) {
            entry.megaProfile = profile;
          }
        }
      } catch {
        // No .mega name registered for this address
      }
    }

    await Promise.all(Array.from(walletMap.values()).map(resolveMegaProfile));

    // ── Discover .mega domain holders not yet on the board ──────────
    // Query MegaNames Transfer events to find all domain holders
    try {
      const megaNameTransfers = await viemClient.getLogs({
        address: MEGANAMES_CONTRACT,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock: 0n,
        toBlock: 'latest',
      });

      // Build current owner map for .mega domains (track by tokenId for correctness)
      const tokenOwners = new Map<string, string>(); // tokenId -> current owner
      for (const log of megaNameTransfers) {
        const { to, tokenId } = log.args as { from: string; to: string; tokenId: bigint };
        tokenOwners.set(tokenId.toString(), to.toLowerCase());
      }
      // Invert to owner -> has domain (skip zero address = burned domains)
      const megaOwners = new Set<string>();
      for (const [, owner] of tokenOwners) {
        if (owner !== '0x0000000000000000000000000000000000000000') {
          megaOwners.add(owner);
        }
      }

      // Add .mega holders who haven't burned yet
      const newEntries: ChadboardEntry[] = [];
      for (const owner of megaOwners) {
        if (!walletMap.has(owner)) {
          const entry: ChadboardEntry = {
            address: owner,
            totalBurns: 0,
            totalBurned: 0,
            latestImage: '',
            latestTimestamp: new Date().toISOString(),
            images: [],
          };
          walletMap.set(owner, entry);
          newEntries.push(entry);
        }
      }

      // Resolve .mega profiles for newly added holders
      if (newEntries.length > 0) {
        await Promise.all(newEntries.map(resolveMegaProfile));
        // Remove any that didn't actually have a .mega name (edge case: transferred away)
        for (const entry of newEntries) {
          if (!entry.megaName) {
            walletMap.delete(entry.address);
          }
        }
      }

      console.log('[Chadboard] Added', newEntries.filter(e => e.megaName).length, '.mega domain holders with 0 burns');
    } catch (err) {
      console.error('[Chadboard] Failed to fetch .mega domain holders:', err instanceof Error ? err.message : String(err));
    }

    // For entries with no looksmaxx image, use Twitter/X profile picture if available
    for (const entry of walletMap.values()) {
      if (!entry.latestImage && entry.megaProfile?.twitter) {
        const handle = entry.megaProfile.twitter.replace('@', '');
        entry.latestImage = `https://unavatar.io/x/${handle}`;
      }
      // Also use avatar from .mega profile if set and no image
      if (!entry.latestImage && entry.megaProfile?.avatar) {
        entry.latestImage = entry.megaProfile.avatar;
      }
    }

    // Sort by total burns descending (0-burn .mega holders appear at the end)
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned
    );

    console.log('[Chadboard] Returning', entries.length, 'entries');

    // Resolve ERC-8004 reputation for burners (if agent is registered)
    if (MEGACHAD_AGENT_ID !== null) {
      // Get all burner addresses as trusted clients for Sybil-resistant queries
      const burnerAddresses = entries.map((e) => e.address as `0x${string}`);

      await Promise.all(
        entries.map(async (entry) => {
          try {
            // Query aggregated reputation from other burners (Sybil-resistant)
            const summary = await viemClient.readContract({
              address: ERC8004_REPUTATION_REGISTRY,
              abi: REPUTATION_REGISTRY_ABI,
              functionName: 'getSummary',
              args: [
                MEGACHAD_AGENT_ID,
                burnerAddresses,
                'starred',
                '',
              ],
            });

            entry.reputation = {
              score: Number(summary[0]) > 0 ? Number(summary[1]) : null,
              count: Number(summary[0]),
            };
          } catch {
            entry.reputation = { score: null, count: 0 };
          }
        })
      );
    }

    console.log('[Chadboard] Returning', entries.length, 'entries');
    return NextResponse.json({ entries, agentId: MEGACHAD_AGENT_ID?.toString() ?? null });
  } catch (err) {
    console.error('[Chadboard] FATAL ERROR:', err);
    console.error('[Chadboard] Error details:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ entries: [], error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
