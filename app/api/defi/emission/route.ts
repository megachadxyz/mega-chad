import { NextResponse } from 'next/server';
import { formatUnits } from 'viem';
import { client, ADDRESSES, EMISSION_CONTROLLER_ABI, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/defi/emission
 *
 * Current week + full 225-week emission schedule for MEGAGOONER.
 * Includes the EmissionController split (mogger / jester / treasury) so
 * agents can size APR projections per venue.
 */
export async function GET() {
  const [genesisTs, currentWeek, lastDistWeek, moggerBps, jesterBps, treasuryBps] = await Promise.all([
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'genesisTimestamp' }),
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'getCurrentWeek' }),
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'lastDistributionWeek' }),
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'moggerSplitBps' }),
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'jesterSplitBps' }),
    client.readContract({ address: ADDRESSES.EMISSION_CONTROLLER, abi: EMISSION_CONTROLLER_ABI, functionName: 'treasurySplitBps' }),
  ]);

  // 225-week quadratic decay: 662245 * ((225-w)/225)^2 MEGAGOONER per week.
  const WEEKS = 225;
  const BASE = 662245;
  const schedule = Array.from({ length: WEEKS }, (_, w) => {
    const remaining = WEEKS - w;
    const totalMG = (BASE * remaining * remaining) / (WEEKS * WEEKS);
    return {
      week: w,
      weekStartUnix: Number(genesisTs) + w * 604800,
      weekStartISO: new Date((Number(genesisTs) + w * 604800) * 1000).toISOString(),
      totalEmissionHuman: totalMG,
      moggerEmissionHuman: (totalMG * Number(moggerBps)) / 10000,
      jesterEmissionHuman: (totalMG * Number(jesterBps)) / 10000,
      treasuryEmissionHuman: (totalMG * Number(treasuryBps)) / 10000,
    };
  });

  const onchainCurrent = await client
    .readContract({
      address: ADDRESSES.EMISSION_CONTROLLER,
      abi: EMISSION_CONTROLLER_ABI,
      functionName: 'getWeeklyEmission',
      args: [currentWeek],
    })
    .catch(() => 0n);

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      controller: ADDRESSES.EMISSION_CONTROLLER,
      genesisTimestamp: genesisTs.toString(),
      genesisISO: new Date(Number(genesisTs) * 1000).toISOString(),
      currentWeek: Number(currentWeek),
      lastDistributionWeek: Number(lastDistWeek),
      splitBps: {
        moggerStaking: Number(moggerBps),
        jesterGooner: Number(jesterBps),
        treasury: Number(treasuryBps),
      },
      splitPct: {
        moggerStaking: Number(moggerBps) / 100,
        jesterGooner: Number(jesterBps) / 100,
        treasury: Number(treasuryBps) / 100,
      },
      currentWeekEmissionOnchain: {
        raw: onchainCurrent.toString(),
        human: formatUnits(onchainCurrent, 18),
      },
      formula: 'weeklyEmission(w) = 662245 * ((225 - w) / 225)^2 MEGAGOONER',
      totalWeeks: WEEKS,
      schedule,
    }),
  );
}
