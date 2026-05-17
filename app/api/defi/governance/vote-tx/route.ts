import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';
import { ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

const SUPPORT_MAP: Record<string, 0 | 1 | 2> = {
  against: 0,
  '0': 0,
  no: 0,
  for: 1,
  '1': 1,
  yes: 1,
  abstain: 2,
  '2': 2,
};

/**
 * GET /api/defi/governance/vote-tx?proposalId=N&support=for|against|abstain
 *
 * Returns the castVote calldata for Jestermogger.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const idStr = sp.get('proposalId');
  const support = (sp.get('support') || '').toLowerCase();

  const id = Number(idStr);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'proposalId must be a positive integer' }, { status: 400 });
  }
  const supportNum = SUPPORT_MAP[support];
  if (supportNum === undefined) {
    return NextResponse.json({ error: 'support must be for|against|abstain' }, { status: 400 });
  }

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      governance: ADDRESSES.JESTERMOGGER,
      executionPlan: [
        {
          step: 'castVote',
          to: ADDRESSES.JESTERMOGGER,
          value: '0',
          data: encodeFunctionData({
            abi: ABIS.JESTERMOGGER,
            functionName: 'castVote',
            args: [BigInt(id), supportNum],
          }),
          functionName: 'castVote',
          args: { proposalId: id, support: supportNum, supportLabel: support },
        },
      ],
      note: 'Vote weight = your MEGAGOONER balance at proposal snapshot. Holders without MEGAGOONER at snapshot time have 0 votes.',
    }),
  );
}
