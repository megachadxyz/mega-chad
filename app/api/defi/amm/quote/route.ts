import { NextRequest, NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import {
  client,
  ADDRESSES,
  ABIS,
  parseAmount,
  getAmountOut,
  CHAIN_BLOCK,
  jsonSafe,
} from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/amm/quote?from=MC|MG&amount=1000
 *
 * Quote the MEGACHAD/MEGAGOONER AMM pair using the deployed reserves.
 * Math is constant-product with a 0.3% fee, identical to Uniswap V2.
 *
 * Without `from` + `amount`, returns the current reserves and price so an
 * agent can introspect the pool without simulating a swap.
 */
export async function GET(req: NextRequest) {
  const from = (req.nextUrl.searchParams.get('from') || '').toUpperCase();
  const amountIn = req.nextUrl.searchParams.get('amount');

  const [tokenA, tokenB, reserveA, reserveB, totalSupply] = await Promise.all([
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'tokenA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'tokenB' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveA' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'reserveB' }),
    client.readContract({ address: ADDRESSES.MC_MG_PAIR, abi: ABIS.LP, functionName: 'totalSupply' }),
  ]);

  const isMcA = tokenA.toLowerCase() === ADDRESSES.MEGACHAD.toLowerCase();
  const mcReserve = isMcA ? reserveA : reserveB;
  const mgReserve = isMcA ? reserveB : reserveA;

  const poolInfo = {
    pair: ADDRESSES.MC_MG_PAIR,
    tokenA,
    tokenB,
    reserveA: reserveA.toString(),
    reserveB: reserveB.toString(),
    mcReserve: mcReserve.toString(),
    mcReserveHuman: formatUnits(mcReserve, 18),
    mgReserve: mgReserve.toString(),
    mgReserveHuman: formatUnits(mgReserve, 18),
    totalSupply: totalSupply.toString(),
    feeBps: 30,
    spotPrice: {
      mcPerMg: mgReserve > 0n ? Number(formatUnits(mcReserve, 18)) / Number(formatUnits(mgReserve, 18)) : null,
      mgPerMc: mcReserve > 0n ? Number(formatUnits(mgReserve, 18)) / Number(formatUnits(mcReserve, 18)) : null,
    },
    namingNote:
      'MegaChadLP exposes tokenA/tokenB instead of token0/token1 — generic V2 router code WILL NOT find this pool.',
  };

  if (!from || !amountIn) {
    return NextResponse.json(
      jsonSafe({
        chain: CHAIN_BLOCK,
        pool: poolInfo,
        usage: 'Pass ?from=MC|MG&amount=<human-units> to get a swap quote with calldata builder URL.',
      }),
    );
  }

  if (from !== 'MC' && from !== 'MG') {
    return NextResponse.json({ error: 'from must be "MC" or "MG"' }, { status: 400 });
  }
  if (mcReserve === 0n || mgReserve === 0n) {
    return NextResponse.json(
      jsonSafe({
        chain: CHAIN_BLOCK,
        pool: poolInfo,
        error: 'Pool has no liquidity yet — quote unavailable.',
      }),
      { status: 503 },
    );
  }

  let amount: bigint;
  try {
    amount = parseAmount(amountIn);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const reserveIn = from === 'MC' ? mcReserve : mgReserve;
  const reserveOut = from === 'MC' ? mgReserve : mcReserve;
  const out = getAmountOut(amount, reserveIn, reserveOut);
  const priceImpactBps =
    reserveIn > 0n ? (amount * 10000n) / (reserveIn + amount) : 0n;

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      pool: poolInfo,
      quote: {
        from,
        to: from === 'MC' ? 'MG' : 'MC',
        amountIn: amount.toString(),
        amountInHuman: formatUnits(amount, 18),
        amountOut: out.toString(),
        amountOutHuman: formatUnits(out, 18),
        priceImpactBps: priceImpactBps.toString(),
        priceImpactPct: Number(priceImpactBps) / 100,
        feeBps: 30,
        effectivePrice:
          amount > 0n ? Number(formatUnits(out, 18)) / Number(formatUnits(amount, 18)) : null,
      },
      txBuilder: `/api/defi/amm/swap-tx?from=${from}&amount=${amountIn}&recipient=<YOUR_ADDRESS>&slippageBps=200`,
    }),
  );
}
