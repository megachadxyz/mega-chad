import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';

export const dynamic = 'force-dynamic';

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
  '0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296') as `0x${string}`;

const MEGANAMES_CONTRACT = '0x5B424C6CCba77b32b9625a6fd5A30D409d20d997' as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

const MEGANAMES_ABI = [
  {
    type: 'function',
    name: 'getName',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

const NFT_ABI = [
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

// ── Ownership-based chadboard ──
// Iterates NFT token IDs, calls ownerOf() to find current holders,
// fetches tokenURI metadata for images. Groups by current owner.
// No genesis log scans — just sequential ownerOf calls until one reverts.

export async function GET() {
  try {
    // 1. Discover all tokens by calling ownerOf sequentially until revert
    const tokens: { tokenId: number; owner: string }[] = [];
    for (let id = 1; id <= 500; id++) {
      try {
        const owner = await viemClient.readContract({
          address: NFT_CONTRACT,
          abi: NFT_ABI,
          functionName: 'ownerOf',
          args: [BigInt(id)],
        });
        tokens.push({ tokenId: id, owner: owner.toLowerCase() });
      } catch {
        // Token doesn't exist — we've found all tokens
        break;
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json(
        { entries: [], agentId: null },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
      );
    }

    // 2. Fetch tokenURI + metadata for each token (parallel, with timeout)
    const tokenData = await Promise.allSettled(
      tokens.map(async ({ tokenId, owner }) => {
        try {
          const uri = await viemClient.readContract({
            address: NFT_CONTRACT,
            abi: NFT_ABI,
            functionName: 'tokenURI',
            args: [BigInt(tokenId)],
          });

          // Resolve IPFS URIs
          const metadataUrl = uri
            .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
            .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/')
            .replace('https://cloudflare-ipfs.com/ipfs/', 'https://gateway.pinata.cloud/ipfs/');

          // Fetch metadata (with timeout)
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          let image = '';
          let timestamp = '';
          let txHash = '';

          try {
            const res = await fetch(metadataUrl, { signal: controller.signal, cache: 'no-store' });
            if (res.ok) {
              const meta = await res.json();
              image = (meta.image || '')
                .replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
                .replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/')
                .replace('https://cloudflare-ipfs.com/ipfs/', 'https://gateway.pinata.cloud/ipfs/');

              // Extract burn tx from attributes if available
              const attrs = meta.attributes || [];
              const burnTxAttr = attrs.find((a: { trait_type: string; value: string }) => a.trait_type === 'Burn Tx');
              if (burnTxAttr) txHash = burnTxAttr.value;
              const dateAttr = attrs.find((a: { trait_type: string; value: string }) => a.trait_type === 'Date');
              if (dateAttr) timestamp = dateAttr.value;
            }
          } catch {
            // Metadata fetch failed — use tokenURI as fallback image
          } finally {
            clearTimeout(timeout);
          }

          return { tokenId, owner, image, timestamp, txHash };
        } catch {
          return { tokenId, owner, image: '', timestamp: '', txHash: '' };
        }
      }),
    );

    // 3. Group by current owner
    const walletMap = new Map<string, ChadboardEntry>();
    const burnAmountPerNft = Number(process.env.NEXT_PUBLIC_BURN_AMOUNT || '225000') / 2;

    for (const result of tokenData) {
      if (result.status !== 'fulfilled') continue;
      const { owner, image, timestamp, txHash } = result.value;

      const imageEntry = { ipfsUrl: image, timestamp: timestamp || new Date().toISOString(), txHash };
      const existing = walletMap.get(owner);

      if (existing) {
        existing.totalBurns += 1;
        existing.totalBurned += burnAmountPerNft;
        existing.images.push(imageEntry);
        if (imageEntry.timestamp > existing.latestTimestamp) {
          existing.latestImage = image || existing.latestImage;
          existing.latestTimestamp = imageEntry.timestamp;
        }
      } else {
        walletMap.set(owner, {
          address: owner,
          totalBurns: 1,
          totalBurned: burnAmountPerNft,
          latestImage: image,
          latestTimestamp: imageEntry.timestamp,
          images: [imageEntry],
        });
      }
    }

    // 4. Resolve .mega names for holders
    await Promise.allSettled(
      Array.from(walletMap.values()).map(async (entry) => {
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
          // No .mega name
        }
      }),
    );

    // 5. Sort by total NFTs held descending
    const entries = Array.from(walletMap.values()).sort(
      (a, b) => b.totalBurns - a.totalBurns || b.totalBurned - a.totalBurned,
    );

    return NextResponse.json(
      { entries, agentId: null },
      { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } },
    );
  } catch (err) {
    console.error('[Chadboard] Error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ entries: [], error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
