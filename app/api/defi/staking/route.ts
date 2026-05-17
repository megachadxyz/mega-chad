import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { client, ADDRESSES, ABIS, isAddress, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/staking?address=0x...
 *
 * Returns the wallet's combined MoggerStaking + JESTERGOONER position plus
 * global stats for both venues. Designed to be the single read an agent makes
 * before deciding to stake / claim / unstake.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  // Global stats are useful even without a user address.
  const [
    moggerStaked,
    moggerEffective,
    moggerRewardRate,
    moggerPeriodFinish,
    jesterStaked,
    jesterEffective,
    jesterRewardRate,
    jesterPeriodFinish,
    jesterLpToken,
  ] = await Promise.all([
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'totalStaked' }),
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'totalEffectiveStake' }),
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'rewardRate' }),
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'periodFinish' }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'totalStaked' }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'totalEffectiveStake' }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'rewardRate' }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'periodFinish' }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'lpToken' }),
  ]);

  const SECONDS_PER_YEAR = 31_536_000n;
  const moggerAprBps =
    moggerEffective > 0n
      ? (BigInt(moggerRewardRate) * SECONDS_PER_YEAR * 10000n) / BigInt(moggerEffective)
      : 0n;
  const jesterAprBps =
    jesterEffective > 0n
      ? (BigInt(jesterRewardRate) * SECONDS_PER_YEAR * 10000n) / BigInt(jesterEffective)
      : 0n;

  const globalStats = {
    moggerStaking: {
      address: ADDRESSES.MOGGER_STAKING,
      stakeToken: { symbol: 'MEGACHAD', address: ADDRESSES.MEGACHAD, decimals: 18 },
      rewardToken: { symbol: 'MEGAGOONER', address: ADDRESSES.MEGAGOONER, decimals: 18 },
      totalStaked: moggerStaked.toString(),
      totalStakedHuman: formatUnits(moggerStaked, 18),
      totalEffectiveStake: moggerEffective.toString(),
      rewardRatePerSec: moggerRewardRate.toString(),
      periodFinish: moggerPeriodFinish.toString(),
      periodFinishISO: new Date(Number(moggerPeriodFinish) * 1000).toISOString(),
      aprBps: moggerAprBps.toString(),
      aprPct: Number(moggerAprBps) / 100,
    },
    jesterGooner: {
      address: ADDRESSES.JESTERGOONER,
      version: 'V4',
      stakeToken: { symbol: 'MC/MG LP', address: jesterLpToken, decimals: 18 },
      rewardToken: { symbol: 'MEGAGOONER', address: ADDRESSES.MEGAGOONER, decimals: 18 },
      totalStaked: jesterStaked.toString(),
      totalStakedHuman: formatUnits(jesterStaked, 18),
      totalEffectiveStake: jesterEffective.toString(),
      rewardRatePerSec: jesterRewardRate.toString(),
      periodFinish: jesterPeriodFinish.toString(),
      periodFinishISO: new Date(Number(jesterPeriodFinish) * 1000).toISOString(),
      aprBps: jesterAprBps.toString(),
      aprPct: Number(jesterAprBps) / 100,
      note: 'V4: no lock period, no time multiplier. NFT boost still applies.',
    },
  };

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      jsonSafe({
        chain: CHAIN_BLOCK,
        globalStats,
        note: 'Pass ?address=0x... to also get the wallet position.',
      }),
    );
  }

  const [
    moggerInfo,
    moggerEarned,
    moggerNftMult,
    mcBalance,
    mcAllowanceMogger,
    jesterInfo,
    jesterEarned,
    jesterCanUnstake,
    lpBalance,
    lpAllowanceJester,
    mgBalance,
    nftCount,
  ] = await Promise.all([
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'getStakerInfo', args: [address] }),
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'earned', args: [address] }),
    client.readContract({ address: ADDRESSES.MOGGER_STAKING, abi: ABIS.MOGGER_STAKING, functionName: 'getNFTMultiplier', args: [address] }),
    client.readContract({ address: ADDRESSES.MEGACHAD, abi: ABIS.ERC20, functionName: 'balanceOf', args: [address] }),
    client.readContract({ address: ADDRESSES.MEGACHAD, abi: ABIS.ERC20, functionName: 'allowance', args: [address, ADDRESSES.MOGGER_STAKING] }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'getStakerInfo', args: [address] }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'earned', args: [address] }),
    client.readContract({ address: ADDRESSES.JESTERGOONER, abi: ABIS.JESTERGOONER, functionName: 'canUnstake', args: [address] }),
    client.readContract({ address: jesterLpToken, abi: ABIS.ERC20, functionName: 'balanceOf', args: [address] }),
    client.readContract({ address: jesterLpToken, abi: ABIS.ERC20, functionName: 'allowance', args: [address, ADDRESSES.JESTERGOONER] }),
    client.readContract({ address: ADDRESSES.MEGAGOONER, abi: ABIS.ERC20, functionName: 'balanceOf', args: [address] }),
    client.readContract({ address: ADDRESSES.NFT, abi: ABIS.ERC20, functionName: 'balanceOf', args: [address] }),
  ]);

  const position = {
    address,
    eligible: nftCount > 0n,
    nftCount: nftCount.toString(),
    nftRequirementNote: 'Wallet must hold at least 1 MEGACHADNFT to earn staking rewards.',
    balances: {
      MEGACHAD: { raw: mcBalance.toString(), human: formatUnits(mcBalance, 18) },
      MEGAGOONER: { raw: mgBalance.toString(), human: formatUnits(mgBalance, 18) },
      LP: { raw: lpBalance.toString(), human: formatUnits(lpBalance, 18), token: jesterLpToken },
    },
    moggerStaking: {
      staked: moggerInfo[0].toString(),
      stakedHuman: formatUnits(moggerInfo[0], 18),
      earnedRewards: moggerEarned.toString(),
      earnedRewardsHuman: formatUnits(moggerEarned, 18),
      effectiveStake: moggerInfo[4].toString(),
      nftMultiplierBps: moggerNftMult.toString(),
      allowance: mcAllowanceMogger.toString(),
      needsApproval: mcAllowanceMogger < mcBalance,
    },
    jesterGooner: {
      staked: jesterInfo[0].toString(),
      stakedHuman: formatUnits(jesterInfo[0], 18),
      earnedRewards: jesterEarned.toString(),
      earnedRewardsHuman: formatUnits(jesterEarned, 18),
      effectiveStake: jesterInfo[6].toString(),
      canUnstake: jesterCanUnstake,
      allowance: lpAllowanceJester.toString(),
      needsApproval: lpAllowanceJester < lpBalance,
    },
  };

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      position,
      globalStats,
      docs: 'https://megachad.xyz/docs',
      txBuilders: {
        stake: '/api/defi/staking/tx?action=stake&venue=mogger|jester&amount=&address=',
        unstake: '/api/defi/staking/tx?action=unstake&venue=mogger|jester&amount=&address=',
        claim: '/api/defi/staking/tx?action=claim&venue=mogger|jester&address=',
      },
    }),
  );
}
