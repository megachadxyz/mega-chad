import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, type Address } from 'viem';
import {
  client,
  ADDRESSES,
  ABIS,
  parseAmount,
  isAddress,
  CHAIN_BLOCK,
  jsonSafe,
  buildApprove,
} from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/staking/tx?action=stake|unstake|claim&venue=mogger|jester&amount=...&address=0x...
 *
 * Returns an ordered list of ready-to-sign transactions. For stake actions
 * the agent gets approve+stake; for unstake/claim a single tx. Each item
 * has { to, value, data, functionName, args } — ready to feed to wallet.sendTransaction.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = (sp.get('action') || '').toLowerCase();
  const venue = (sp.get('venue') || '').toLowerCase();
  const amount = sp.get('amount');
  const address = sp.get('address');

  if (!['stake', 'unstake', 'claim'].includes(action)) {
    return NextResponse.json({ error: 'action must be stake|unstake|claim' }, { status: 400 });
  }
  if (!['mogger', 'jester'].includes(venue)) {
    return NextResponse.json({ error: 'venue must be mogger|jester' }, { status: 400 });
  }
  if (address && !isAddress(address)) {
    return NextResponse.json({ error: 'address must be 0x...' }, { status: 400 });
  }

  const isMogger = venue === 'mogger';
  const stakingAddr = isMogger ? ADDRESSES.MOGGER_STAKING : ADDRESSES.JESTERGOONER;
  const abi = isMogger ? ABIS.MOGGER_STAKING : ABIS.JESTERGOONER;
  const stakeToken = isMogger
    ? ADDRESSES.MEGACHAD
    : ((await client.readContract({
        address: ADDRESSES.JESTERGOONER,
        abi: ABIS.JESTERGOONER,
        functionName: 'lpToken',
      })) as `0x${string}`);

  const actions: Array<Record<string, unknown>> = [];
  let amountWei: bigint | null = null;

  if (action === 'stake' || action === 'unstake') {
    if (!amount) return NextResponse.json({ error: 'amount required' }, { status: 400 });
    try {
      amountWei = parseAmount(amount);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (action === 'stake' && amountWei) {
    if (address) {
      const allowance = (await client.readContract({
        address: stakeToken,
        abi: ABIS.ERC20,
        functionName: 'allowance',
        args: [address as Address, stakingAddr],
      })) as bigint;
      if (allowance < amountWei) {
        actions.push({ step: 'approve', ...buildApprove(stakeToken, stakingAddr, amountWei) });
      }
    } else {
      actions.push({
        step: 'approve',
        ...buildApprove(stakeToken, stakingAddr, amountWei),
        note: 'Pass &address=0x... to skip approve if already granted.',
      });
    }
    actions.push({
      step: 'stake',
      to: stakingAddr,
      value: '0',
      data: encodeFunctionData({ abi, functionName: 'stake', args: [amountWei] }),
      functionName: 'stake',
      args: { amount: amountWei.toString() },
    });
  } else if (action === 'unstake' && amountWei) {
    actions.push({
      step: 'unstake',
      to: stakingAddr,
      value: '0',
      data: encodeFunctionData({ abi, functionName: 'unstake', args: [amountWei] }),
      functionName: 'unstake',
      args: { amount: amountWei.toString() },
    });
  } else if (action === 'claim') {
    actions.push({
      step: 'claimRewards',
      to: stakingAddr,
      value: '0',
      data: encodeFunctionData({ abi, functionName: 'claimRewards' }),
      functionName: 'claimRewards',
      args: {},
    });
  }

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      venue,
      action,
      contract: stakingAddr,
      stakeToken,
      rewardToken: ADDRESSES.MEGAGOONER,
      amount: amountWei?.toString() ?? null,
      executionPlan: actions,
      notes: [
        venue === 'jester'
          ? 'JESTERGOONER V4: no lock, no time multiplier. Unstake any time.'
          : null,
        'Wallet must hold 1+ MEGACHADNFT for rewards to accrue.',
      ].filter(Boolean),
    }),
  );
}
