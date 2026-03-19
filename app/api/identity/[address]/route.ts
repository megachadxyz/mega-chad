import { NextRequest, NextResponse } from 'next/server';
import { resolveIdentity } from '@/lib/identity';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * GET /api/identity/:addressOrName
 *
 * Unified identity endpoint for MegaETH.
 * Resolves wallet address or .mega name into a full profile:
 * - MegaNames (.mega domain, avatar, bio, social links)
 * - Token balances (ETH, $MEGACHAD)
 * - Burn history (count, total burned, rank, images)
 * - Reputation (ERC-8004 score, review count)
 * - Referral data (agent status, earnings, referral code)
 * - Tier (Unburned → Normie → Mewer → Mogger → Gigachad → Eternal Chad)
 *
 * Works with 0x addresses and .mega names:
 *   /api/identity/0x1234...5678
 *   /api/identity/chad.mega
 *   /api/identity/chad
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json({ error: 'Address or .mega name required' }, { status: 400 });
  }

  // Basic validation
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  const isMegaName = /^[a-zA-Z0-9_-]+(?:\.mega)?$/.test(address);

  if (!isAddress && !isMegaName) {
    return NextResponse.json(
      { error: 'Invalid address or .mega name format' },
      { status: 400 },
    );
  }

  try {
    const identity = await resolveIdentity(address);

    return NextResponse.json({
      ...identity,
      _meta: {
        endpoint: `/api/identity/${address}`,
        resolvedAt: new Date().toISOString(),
        version: '1.0.0',
        description: 'MegaChad Identity Layer — unified on-chain profile for MegaETH',
      },
      _links: {
        profile: `https://megachad.xyz/profile/${identity.address}`,
        chadboard: 'https://megachad.xyz/chadboard',
        gallery: 'https://megachad.xyz/gallery',
        explorer: `https://megaexplorer.xyz/address/${identity.address}`,
      },
    });
  } catch (err) {
    console.error('[identity] Error resolving:', err);
    return NextResponse.json(
      { error: 'Failed to resolve identity', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
