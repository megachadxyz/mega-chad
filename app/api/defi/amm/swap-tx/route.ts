import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, formatUnits } from 'viem';
import {
  client,
  ADDRESSES,
  ABIS,
  parseAmount,
  isAddress,
  getAmountOut,
  CHAIN_BLOCK,
  jsonSafe,
  buildERC20Transfer,
} from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/amm/swap-tx?from=MC|MG&amount=...&recipient=0x...&slippageBps=200
 *
 * MegaChadLP.swap() requires the input tokens to already be sitting in the pair
 * contract — the pool does NOT pull via transferFrom. This builder returns a
 * two-step plan: ERC20.transfer(pair, amountIn) → pair.swap(...). Slippage is
 * applied to the on-chain reserve quote at request time.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = (sp.get('from') || '').toUpperCase();
  const amount = sp.get('amount');
  const recipient = sp.get('recipient');
  const slippageBps = Math.max(0, Math.min(5000, Number(sp.get('slippageBps')) || 200));

  if (from !== 'MC' && from !== 'MG') {
    return NextResponse.json({ error: 'from must be "MC" or "MG"' }, { status: 400 });
  }
  if (!amount) {
    return NextResponse.json({ error: 'amount required' }, { status: 400 });
  }
  if (!recipient || !isAddress(recipient)) {
    return NextResponse.json({ error: 'recipient must be a 0x address' }, { status: 400 });
  }

  let amountIn: bigint;
  try {
    amountIn = parseAmount(amount);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const [tokenA, tokenB, reserveA, reserveB] = await Promise.all([
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'tokenA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'tokenB' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveB' }),
  ]);

  const isMcA = tokenA.toLowerCase() === ADDRESSES.MEGACHAD.toLowerCase();
  const mcReserve = isMcA ? reserveA : reserveB;
  const mgReserve = isMcA ? reserveB : reserveA;
  if (mcReserve === 0n || mgReserve === 0n) {
    return NextResponse.json({ error: 'Pool has no liquidity yet — cannot swap.' }, { status: 503 });
  }

  const inputToken = from === 'MC' ? ADDRESSES.MEGACHAD : ADDRESSES.MEGAGOONER;
  const reserveIn = from === 'MC' ? mcReserve : mgReserve;
  const reserveOut = from === 'MC' ? mgReserve : mcReserve;
  const expectedOut = getAmountOut(amountIn, reserveIn, reserveOut);
  const minOut = (expectedOut * BigInt(10000 - slippageBps)) / 10000n;

  // pair.swap(amountAIn, amountBIn, to) — one input must be zero.
  // Pair has no slippage param; protect via amountAIn/amountBIn sizing relative
  // to the transferred amount. (For minOut enforcement, agents should verify
  // their received balance off-chain or wrap this in a router. We surface minOut
  // in the response for that purpose.)
  const swapArgs: [bigint, bigint, `0x${string}`] = from === 'MC'
    ? (isMcA ? [amountIn, 0n, recipient] : [0n, amountIn, recipient])
    : (isMcA ? [0n, amountIn, recipient] : [amountIn, 0n, recipient]);

  const plan = [
    {
      step: 'transferInputToPair',
      ...buildERC20Transfer(inputToken, ADDRESSES.MC_MG_PAIR, amountIn),
      note: 'MegaChadLP.swap pulls reserves diff vs balanceOf — must transfer FIRST.',
    },
    {
      step: 'swap',
      to: ADDRESSES.MC_MG_PAIR,
      value: '0',
      data: encodeFunctionData({
        abi: ABIS.LP,
        functionName: 'swap',
        args: swapArgs,
      }),
      functionName: 'swap',
      args: {
        amountAIn: swapArgs[0].toString(),
        amountBIn: swapArgs[1].toString(),
        to: recipient,
      },
    },
  ];

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      pair: ADDRESSES.MC_MG_PAIR,
      from,
      to: from === 'MC' ? 'MG' : 'MC',
      amountIn: amountIn.toString(),
      amountInHuman: formatUnits(amountIn, 18),
      expectedOut: expectedOut.toString(),
      expectedOutHuman: formatUnits(expectedOut, 18),
      minOut: minOut.toString(),
      minOutHuman: formatUnits(minOut, 18),
      slippageBps,
      feeBps: 30,
      executionPlan: plan,
      warning:
        'MegaChadLP.swap has no on-chain minOut check. Verify your received balance after the swap, or call from a contract that reverts on slippage.',
    }),
  );
}
