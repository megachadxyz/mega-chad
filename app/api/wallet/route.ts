import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { megaeth } from '@/lib/wagmi';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI, BURN_AMOUNT, BURN_AMOUNT_DISPLAY } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

const NFT_CONTRACT = (process.env.NEXT_PUBLIC_NFT_CONTRACT ||
  '0x1f1eFd3476b95091B9332b2d36a24bDE12CC6296') as `0x${string}`;

const viemClient = createPublicClient({
  chain: megaeth,
  transport: http(),
});

const NFT_BALANCE_ABI = [
  {
    type: 'function' as const,
    name: 'balanceOf' as const,
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' as const,
  },
] as const;

/**
 * GET /api/wallet?address=0x...
 *
 * Returns wallet balances, NFT count, burn eligibility, and early access status.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address?.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json({ error: 'Invalid or missing address parameter' }, { status: 400 });
  }

  const addr = address as `0x${string}`;

  let ethBalance = 0n;
  let tokenBalance = 0n;
  let nftCount = 0;

  // Fetch all balances in parallel
  const [ethResult, tokenResult, nftResult] = await Promise.allSettled([
    viemClient.getBalance({ address: addr }),
    viemClient.readContract({
      address: MEGACHAD_ADDRESS,
      abi: MEGACHAD_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }),
    viemClient.readContract({
      address: NFT_CONTRACT,
      abi: NFT_BALANCE_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }),
  ]);

  if (ethResult.status === 'fulfilled') ethBalance = ethResult.value;
  if (tokenResult.status === 'fulfilled') tokenBalance = tokenResult.value as bigint;
  if (nftResult.status === 'fulfilled') nftCount = Number(nftResult.value as bigint);

  const tokenBalanceDisplay = Number(formatUnits(tokenBalance, 18));
  const canBurn = tokenBalance >= BURN_AMOUNT;
  const tokensNeeded = canBurn ? 0 : BURN_AMOUNT_DISPLAY - tokenBalanceDisplay;

  return NextResponse.json(
    {
      address: addr,
      balances: {
        eth: formatUnits(ethBalance, 18),
        ethWei: ethBalance.toString(),
        megachad: tokenBalanceDisplay,
        megachadWei: tokenBalance.toString(),
        looksmaxxedNFTs: nftCount,
      },
      burnEligibility: {
        canBurn,
        burnRequirement: BURN_AMOUNT_DISPLAY,
        tokensNeeded: canBurn ? 0 : tokensNeeded,
        message: canBurn
          ? `Ready to burn ${BURN_AMOUNT_DISPLAY} $MEGACHAD`
          : `Need ${Math.ceil(tokensNeeded)} more $MEGACHAD to burn (have ${tokenBalanceDisplay}, need ${BURN_AMOUNT_DISPLAY})`,
      },
      earlyAccess: {
        instantAccess: nftCount >= 3,
        referralPath: tokenBalance > 0n || nftCount >= 1,
        eligible: tokenBalance > 0n || nftCount >= 1,
      },
      contracts: {
        megachadToken: MEGACHAD_ADDRESS,
        nftContract: NFT_CONTRACT,
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10',
      },
    },
  );
}
