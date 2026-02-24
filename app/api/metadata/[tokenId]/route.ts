import { NextRequest, NextResponse } from 'next/server';
import { getWarrenImageUrl } from '@/lib/warren';

export const dynamic = 'force-dynamic';

interface NFTMetadata {
  tokenId: string;
  warrenTokenId?: number;
  ipfsUrl: string;
  burner: string;
  burnTxHash: string;
  devTxHash?: string;
  timestamp: string;
}

/**
 * Custom ERC-721 metadata endpoint
 * Returns NFT metadata with Warren on-chain image + Pinata fallback
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  const { tokenId } = params;

  try {
    // Fetch NFT metadata from Redis
    const { Redis } = await import('@upstash/redis');
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      return NextResponse.json(
        { error: 'Metadata service unavailable' },
        { status: 503 }
      );
    }

    const redis = new Redis({ url: redisUrl, token: redisToken });

    // Get NFT metadata from Redis (stored during minting)
    const metadataKey = `nft:metadata:${tokenId}`;
    const metadata = await redis.get<NFTMetadata>(metadataKey);

    if (!metadata) {
      return NextResponse.json(
        { error: 'NFT not found' },
        { status: 404 }
      );
    }

    // Build ERC-721 metadata JSON
    const response = {
      name: `$MEGACHAD ${String(tokenId).padStart(4, '0')}`,
      description: `Looksmaxxed by ${metadata.burner}. Burn tx: ${metadata.burnTxHash}`,
      // Primary: Warren on-chain image, Fallback: IPFS
      image: metadata.warrenTokenId
        ? getWarrenImageUrl(metadata.warrenTokenId)
        : metadata.ipfsUrl,
      // Include both for redundancy
      image_url: metadata.warrenTokenId
        ? getWarrenImageUrl(metadata.warrenTokenId)
        : metadata.ipfsUrl,
      external_url: 'https://megachad.xyz',
      attributes: [
        {
          trait_type: 'Burner',
          value: metadata.burner,
        },
        {
          trait_type: 'Burn Tx',
          value: metadata.burnTxHash,
        },
        {
          trait_type: 'Storage',
          value: metadata.warrenTokenId ? 'Warren (On-Chain)' : 'IPFS',
        },
        {
          trait_type: 'Timestamp',
          value: metadata.timestamp,
        },
        ...(metadata.devTxHash
          ? [{ trait_type: 'Dev Tx', value: metadata.devTxHash }]
          : []),
      ],
      // Fallback URLs for maximum compatibility
      properties: {
        ipfs_backup: metadata.ipfsUrl,
        warren_token_id: metadata.warrenTokenId || null,
        on_chain: !!metadata.warrenTokenId,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Metadata] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
