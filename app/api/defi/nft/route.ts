import { NextRequest, NextResponse } from 'next/server';
import { client, ADDRESSES, ABIS, isAddress, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';
import { getRecentBurns } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const BOOST_TIERS = [
  { minNFTs: 25, multiplierBps: 11500, multiplier: 1.15, label: 'tier 3 (25+)' },
  { minNFTs: 10, multiplierBps: 10750, multiplier: 1.075, label: 'tier 2 (10+)' },
  { minNFTs: 1, multiplierBps: 10000, multiplier: 1.0, label: 'tier 1 (1+)' },
];

/**
 * GET /api/defi/nft?address=0x...
 *
 * MEGACHADNFT inventory + emissions-eligibility verdict for a wallet.
 * Use this BEFORE building any staking tx — wallets without an NFT show
 * 0 rewards even with stake. Also lists any recent looksmaxxed items owned
 * by the wallet (via the Redis-backed gallery, when available).
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: 'address must be 0x...' },
      { status: 400 },
    );
  }

  const balance = (await client.readContract({
    address: ADDRESSES.NFT,
    abi: ABIS.ERC20,
    functionName: 'balanceOf',
    args: [address],
  })) as bigint;

  const count = Number(balance);
  const tier =
    BOOST_TIERS.find((t) => count >= t.minNFTs) ??
    { minNFTs: 0, multiplierBps: 0, multiplier: 0, label: 'ineligible' };

  let recentItems: unknown[] = [];
  try {
    const burns = (await getRecentBurns(200, 0)) as unknown as Array<Record<string, unknown>>;
    recentItems = burns
      .filter((b) => typeof b?.address === 'string' && (b.address as string).toLowerCase() === address.toLowerCase())
      .slice(0, 20);
  } catch {
    // Redis not configured — skip
  }

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      nftContract: ADDRESSES.NFT,
      address,
      nftCount: count,
      nftCountRaw: balance.toString(),
      eligibility: {
        eligibleForStakingRewards: count >= 1,
        reason:
          count >= 1
            ? `Holds ${count} MEGACHADNFT — eligible for both MoggerStaking and JESTERGOONER rewards.`
            : 'Wallet holds 0 MEGACHADNFT. Looksmaxx (mint a portrait NFT) before staking, or rewards accrue to 0.',
        nextTierAt:
          count < 1 ? 1 : count < 10 ? 10 : count < 25 ? 25 : null,
      },
      boost: {
        currentTier: tier.label,
        multiplier: tier.multiplier,
        multiplierBps: tier.multiplierBps,
        tiers: BOOST_TIERS,
      },
      recentItems,
      relatedEndpoints: {
        looksmaxx: '/api/agent/looksmaxx',
        stakingPosition: `/api/defi/staking?address=${address}`,
        identity: `/api/identity/${address}`,
        gallery: '/api/gallery',
      },
    }),
    {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    },
  );
}
