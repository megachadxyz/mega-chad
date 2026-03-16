import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI } from '@/lib/contracts';

const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwOnxR8mbFVNHayPWpc6kWwjP-hhnkAnKNfTMujysVwQ6M1ckOn7fT7-4yWcm_JQetk/exec';

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296') as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

/**
 * GET /api/early/register
 *
 * Returns eligibility requirements and instructions for agents.
 */
export async function GET() {
  return NextResponse.json({
    name: 'MegaChad Early Access',
    description:
      'Register for MegaChad testnet beta access. Requires holding $MEGACHAD tokens or looksmaxxed NFTs.',
    eligibility: {
      instantAccess: '3+ looksmaxxed NFTs',
      referralPath: 'Any $MEGACHAD balance or 1+ looksmaxxed NFTs, plus 3 referral signups',
    },
    registration: {
      method: 'POST',
      endpoint: '/api/early/register',
      contentType: 'application/json',
      body: {
        wallet: {
          type: 'string',
          required: true,
          description: 'Ethereum wallet address (0x...)',
        },
        twitter: {
          type: 'string',
          required: false,
          description: 'X/Twitter handle (e.g. @handle). Optional for agent registrations.',
        },
        referralCode: {
          type: 'string',
          required: false,
          description: 'Referral code from an existing registrant',
        },
      },
    },
    contracts: {
      megachadToken: MEGACHAD_ADDRESS,
      nftContract: NFT_CONTRACT,
      chain: 'MegaETH (4326)',
      rpc: 'https://mainnet.megaeth.com/rpc',
    },
  });
}

/**
 * POST /api/early/register
 *
 * Register a wallet for early access. Verifies on-chain eligibility,
 * then forwards to the Google Sheet backend.
 */
export async function POST(req: NextRequest) {
  let body: {
    wallet: string;
    twitter?: string;
    tweetUrl?: string;
    referralCode?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { wallet, twitter, tweetUrl, referralCode } = body;

  if (!wallet?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
  }

  // Check on-chain eligibility
  let tokenBalance = 0n;
  let nftCount = 0;

  try {
    const balanceResult = await viemClient.readContract({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    });
    tokenBalance = balanceResult as bigint;
  } catch (err) {
    console.error('[early/register] Token balance check failed:', err);
  }

  try {
    const nftAbi = [
      {
        type: 'function' as const,
        name: 'balanceOf' as const,
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view' as const,
      },
    ] as const;

    const nftResult = await viemClient.readContract({
      address: NFT_CONTRACT,
      abi: nftAbi,
      functionName: 'balanceOf',
      args: [wallet as `0x${string}`],
    });
    nftCount = Number(nftResult as bigint);
  } catch (err) {
    console.error('[early/register] NFT balance check failed:', err);
  }

  const hasTokens = tokenBalance > 0n;
  const hasNFTs = nftCount >= 1;
  const hasInstantAccess = nftCount >= 3;

  if (!hasTokens && !hasNFTs) {
    return NextResponse.json(
      {
        error: 'Not eligible',
        details:
          'Wallet must hold $MEGACHAD tokens or at least 1 looksmaxxed NFT to register.',
        tokenBalance: '0',
        nftCount: 0,
        buyTokenUrl: 'https://megachad.xyz/api/x402/quote',
      },
      { status: 403 },
    );
  }

  // Generate referral code
  const handle = (twitter || 'agent').replace('@', '').slice(0, 4);
  const myReferralCode = wallet.slice(2, 8).toLowerCase() + handle.toLowerCase();

  // Submit to Google Sheet backend
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: wallet.toLowerCase(),
        twitter: twitter || 'agent',
        tweetUrl: tweetUrl || 'agent-registration',
        referredBy: referralCode || '',
        referralCode: myReferralCode,
        timestamp: new Date().toISOString(),
        source: 'api',
      }),
    });
  } catch (err) {
    console.error('[early/register] Google Script submission failed:', err);
    return NextResponse.json({ error: 'Registration backend unavailable' }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    wallet: wallet.toLowerCase(),
    eligibility: {
      hasTokens,
      nftCount,
      instantAccess: hasInstantAccess,
      path: hasInstantAccess ? 'instant' : 'referral',
    },
    referralCode: myReferralCode,
    referralLink: `https://megachad.xyz/early?ref=${myReferralCode}`,
    message: hasInstantAccess
      ? 'Testnet access confirmed — 3+ looksmaxxed NFTs detected.'
      : `Registered on referral path. Share your referral code (${myReferralCode}) — 3 signups needed for testnet access.`,
  });
}
