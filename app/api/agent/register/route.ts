import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, getAddress, encodeFunctionData } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { REFERRAL_ADDRESS, REFERRAL_ABI } from '@/lib/referral';

export const dynamic = 'force-dynamic';

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/agent/register?address=0x...
 *
 * Check if a wallet is registered as a referring agent and return registration info.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Missing or invalid address' }, { status: 400 });
  }

  const addr = getAddress(address);

  try {
    const [count, earnings, registered] = await viemClient.readContract({
      address: REFERRAL_ADDRESS,
      abi: REFERRAL_ABI,
      functionName: 'getAgentStats',
      args: [addr],
    }) as [bigint, bigint, boolean];

    const referralCode = registered
      ? Buffer.from(addr.slice(2), 'hex').toString('base64url').slice(0, 12)
      : null;

    return NextResponse.json({
      agent: addr,
      registered,
      referralCode,
      stats: {
        referralCount: Number(count),
        totalEarnings: earnings.toString(),
        totalEarningsFormatted: `${(Number(earnings) / 1e18).toLocaleString()} $MEGACHAD`,
      },
      referralContract: REFERRAL_ADDRESS,
    });
  } catch {
    return NextResponse.json({
      agent: addr,
      registered: false,
      referralCode: null,
      stats: { referralCount: 0, totalEarnings: '0', totalEarningsFormatted: '0 $MEGACHAD' },
      referralContract: REFERRAL_ADDRESS,
      note: 'Referral contract not yet deployed or not configured',
    });
  }
}

/**
 * POST /api/agent/register
 *
 * Returns the transaction calldata an agent needs to sign to register on-chain.
 * Body: { wallet: "0x...", mcpEndpoint?: "https://...", description?: "..." }
 */
export async function POST(req: NextRequest) {
  let body: { wallet?: string; mcpEndpoint?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { wallet, mcpEndpoint, description } = body;

  if (!wallet?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  const addr = getAddress(wallet);

  // Check if already registered
  try {
    const isRegistered = await viemClient.readContract({
      address: REFERRAL_ADDRESS,
      abi: REFERRAL_ABI,
      functionName: 'isAgent',
      args: [addr],
    }) as boolean;

    if (isRegistered) {
      const referralCode = Buffer.from(addr.slice(2), 'hex').toString('base64url').slice(0, 12);
      return NextResponse.json({
        alreadyRegistered: true,
        agent: addr,
        referralCode,
        message: 'Agent is already registered. Share your referral code with users.',
      });
    }
  } catch {
    // Contract might not be deployed yet
  }

  // Return the registration transaction calldata
  const registerCalldata = encodeFunctionData({
    abi: REFERRAL_ABI,
    functionName: 'registerAgent',
  });

  const referralCode = Buffer.from(addr.slice(2), 'hex').toString('base64url').slice(0, 12);

  return NextResponse.json({
    agent: addr,
    referralCode,
    mcpEndpoint: mcpEndpoint || null,
    description: description || null,
    registration: {
      description: 'Sign this transaction to register as a MegaChad referring agent',
      transaction: {
        to: REFERRAL_ADDRESS,
        data: registerCalldata,
        chainId: 4326,
        value: '0',
      },
    },
    afterRegistration: {
      referralCode,
      howItWorks: [
        'Share your referral code with users or include it in burn submissions',
        'When a user burns with your referral, you earn 10% of the tren fund portion',
        'That equals 11,250 $MEGACHAD per referred burn (5% of total 225,000)',
        'Earnings are sent directly to your wallet on-chain',
      ],
      earnings: {
        perBurn: '11,250 $MEGACHAD',
        percentage: '10% of tren fund half (5% of total burn)',
      },
    },
  });
}
