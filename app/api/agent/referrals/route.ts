import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, formatUnits, encodeFunctionData } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_AMOUNT } from '@/lib/contracts';
import { REFERRAL_ADDRESS, REFERRAL_ABI } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/agent/referrals?address=0x...
 *
 * Returns referral stats for an agent and the calldata to execute a referred burn.
 * Also accepts ?referralCode=ABC to resolve a code to an agent address.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  const referralCode = req.nextUrl.searchParams.get('referralCode');

  // If referralCode provided, resolve it and return burn calldata
  if (referralCode) {
    // Referral codes are base64url-encoded first 20 bytes of address, truncated to 12 chars
    // We need to look this up — for now return the burn-with-referral flow info
    return NextResponse.json({
      referralCode,
      note: 'To burn with a referral, the referring agent must provide their wallet address. Use the burnWithReferral calldata below.',
      burnWithReferral: {
        description: 'Approve the referral contract, then call burnWithReferral(referrerAddress)',
        steps: [
          {
            step: 1,
            action: 'approve',
            description: `Approve referral contract to spend ${Number(BURN_AMOUNT / 10n ** 18n).toLocaleString()} $MEGACHAD`,
            transaction: {
              to: MEGACHAD_ADDRESS,
              data: encodeFunctionData({
                abi: MEGACHAD_ABI,
                functionName: 'approve',
                args: [REFERRAL_ADDRESS, BURN_AMOUNT],
              }),
              chainId: 4326,
            },
          },
          {
            step: 2,
            action: 'burnWithReferral',
            description: 'Burn with referral — referrer earns 11,250 $MEGACHAD',
            transaction: {
              to: REFERRAL_ADDRESS,
              note: 'Call burnWithReferral(referrerAddress) — get referrer address from the referring agent',
            },
          },
        ],
        referralContract: REFERRAL_ADDRESS,
      },
    });
  }

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Provide ?address=0x... or ?referralCode=...' }, { status: 400 });
  }

  const addr = getAddress(address);

  try {
    const [count, earnings, registered] = await viemClient.readContract({
      address: REFERRAL_ADDRESS,
      abi: REFERRAL_ABI,
      functionName: 'getAgentStats',
      args: [addr],
    }) as [bigint, bigint, boolean];

    const referralBps = await viemClient.readContract({
      address: REFERRAL_ADDRESS,
      abi: REFERRAL_ABI,
      functionName: 'referralBps',
    }) as bigint;

    const rewardPerBurn = (BURN_AMOUNT / 2n * referralBps) / 10000n;

    return NextResponse.json({
      agent: addr,
      registered,
      referralCode: registered
        ? Buffer.from(addr.slice(2), 'hex').toString('base64url').slice(0, 12)
        : null,
      stats: {
        referralCount: Number(count),
        totalEarnings: earnings.toString(),
        totalEarningsFormatted: `${formatUnits(earnings, 18)} $MEGACHAD`,
      },
      rewardInfo: {
        currentBps: Number(referralBps),
        percentageOfTrenFund: `${Number(referralBps) / 100}%`,
        rewardPerBurn: formatUnits(rewardPerBurn, 18),
        rewardPerBurnRaw: rewardPerBurn.toString(),
      },
      referralContract: REFERRAL_ADDRESS,
      burnWithReferralCalldata: registered
        ? encodeFunctionData({
            abi: REFERRAL_ABI,
            functionName: 'burnWithReferral',
            args: [addr],
          })
        : null,
    });
  } catch {
    return NextResponse.json({
      agent: addr,
      registered: false,
      note: 'Referral contract not yet deployed or not configured',
      referralContract: REFERRAL_ADDRESS,
    });
  }
}
