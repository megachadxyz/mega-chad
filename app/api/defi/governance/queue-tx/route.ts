import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';
import { ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/governance/queue-tx?proposalId=N
 *
 * Returns the queue() calldata. Only valid for proposals in the Succeeded state.
 */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('proposalId'));
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'proposalId must be a positive integer' }, { status: 400 });
  }
  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      governance: ADDRESSES.JESTERMOGGER,
      executionPlan: [
        {
          step: 'queue',
          to: ADDRESSES.JESTERMOGGER,
          value: '0',
          data: encodeFunctionData({ abi: ABIS.JESTERMOGGER, functionName: 'queue', args: [BigInt(id)] }),
          functionName: 'queue',
          args: { proposalId: id },
        },
      ],
      note: 'Proposal must be in Succeeded state. Queueing starts the 2-day timelock.',
    }),
  );
}
