import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, formatUnits } from 'viem';
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
 * GET /api/defi/amm/add-liquidity-tx?amountMC=...&amountMG=...&recipient=0x...
 *
 * Builds approve(MC) + approve(MG) + addLiquidity. If reserves are non-zero,
 * the caller is responsible for matching the pool ratio — the pair refunds
 * the excess of whichever side is over-supplied.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const amountMC = sp.get('amountMC');
  const amountMG = sp.get('amountMG');
  const recipient = sp.get('recipient');
  const address = sp.get('address');

  if (!amountMC || !amountMG) {
    return NextResponse.json({ error: 'amountMC and amountMG required' }, { status: 400 });
  }
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: 'recipient must be a 0x address' }, { status: 400 });
  }

  let mcWei: bigint;
  let mgWei: bigint;
  try {
    mcWei = parseAmount(amountMC);
    mgWei = parseAmount(amountMG);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const [tokenA, reserveA, reserveB] = await Promise.all([
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'tokenA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveB' }),
  ]);
  const isMcA = tokenA.toLowerCase() === ADDRESSES.MEGACHAD.toLowerCase();
  const [argA, argB] = isMcA ? [mcWei, mgWei] : [mgWei, mcWei];

  const plan: Array<Record<string, unknown>> = [];

  for (const [token, want, sym] of [
    [ADDRESSES.MEGACHAD, mcWei, 'MEGACHAD'],
    [ADDRESSES.MEGAGOONER, mgWei, 'MEGAGOONER'],
  ] as const) {
    if (address && isAddress(address)) {
      const allowance = (await client.readContract({
        address: token,
        abi: ABIS.ERC20,
        functionName: 'allowance',
        args: [address, ADDRESSES.MC_MG_PAIR],
      })) as bigint;
      if (allowance < want) {
        plan.push({ step: `approve_${sym}`, ...buildApprove(token, ADDRESSES.MC_MG_PAIR, want) });
      }
    } else {
      plan.push({ step: `approve_${sym}`, ...buildApprove(token, ADDRESSES.MC_MG_PAIR, want) });
    }
  }

  plan.push({
    step: 'addLiquidity',
    to: ADDRESSES.MC_MG_PAIR,
    value: '0',
    data: encodeFunctionData({
      abi: ABIS.LP,
      functionName: 'addLiquidity',
      args: [argA, argB, recipient],
    }),
    functionName: 'addLiquidity',
    args: { amountA: argA.toString(), amountB: argB.toString(), to: recipient },
  });

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      pair: ADDRESSES.MC_MG_PAIR,
      poolReserves: { reserveA: reserveA.toString(), reserveB: reserveB.toString() },
      amountMC: mcWei.toString(),
      amountMCHuman: formatUnits(mcWei, 18),
      amountMG: mgWei.toString(),
      amountMGHuman: formatUnits(mgWei, 18),
      executionPlan: plan,
      note: 'LP shares from addLiquidity are auto-eligible to stake in JESTERGOONER for MEGAGOONER drip rewards.',
    }),
  );
}
