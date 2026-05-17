import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';
import { ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/governance/execute-tx?proposalId=N
 *
 * Returns the execute() calldata. Only valid after the timelock has elapsed
 * AND the proposal has not been vetoed by the NFT council.
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
          step: 'execute',
          to: ADDRESSES.JESTERMOGGER,
          value: '0',
          data: encodeFunctionData({ abi: ABIS.JESTERMOGGER, functionName: 'execute', args: [BigInt(id)] }),
          functionName: 'execute',
          args: { proposalId: id },
        },
      ],
      note: 'execute() is payable — if the proposal actions require ETH, add msg.value to match the action `value` sum.',
    }),
  );
}
