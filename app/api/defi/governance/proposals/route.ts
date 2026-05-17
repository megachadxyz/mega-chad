import { NextRequest, NextResponse } from 'next/server';
import { client, ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe, PROPOSAL_STATES } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/governance/proposals?limit=20&offset=0
 *
 * Lists active and recent Jestermogger proposals with full state, vote tallies,
 * and links to the per-proposal endpoint.
 */
export async function GET(req: NextRequest) {
  const limit = Math.max(1, Math.min(100, Number(req.nextUrl.searchParams.get('limit')) || 20));

  const count = await client.readContract({
    address: ADDRESSES.JESTERMOGGER,
    abi: ABIS.JESTERMOGGER,
    functionName: 'proposalCount',
  });
  const total = Number(count);
  if (total === 0) {
    return NextResponse.json(
      jsonSafe({
        chain: CHAIN_BLOCK,
        governance: ADDRESSES.JESTERMOGGER,
        proposals: [],
        total: 0,
        note: 'No proposals have been created yet.',
      }),
    );
  }

  const startId = total;
  const endId = Math.max(1, total - limit + 1);
  const ids: number[] = [];
  for (let i = startId; i >= endId; i--) ids.push(i);

  const proposals = await Promise.all(
    ids.map(async (id) => {
      const [info, state] = await Promise.all([
        client.readContract({
          address: ADDRESSES.JESTERMOGGER,
          abi: ABIS.JESTERMOGGER,
          functionName: 'getProposal',
          args: [BigInt(id)],
        }),
        client.readContract({
          address: ADDRESSES.JESTERMOGGER,
          abi: ABIS.JESTERMOGGER,
          functionName: 'state',
          args: [BigInt(id)],
        }),
      ]);
      const [
        proposer,
        description,
        forVotes,
        againstVotes,
        abstainVotes,
        startTime,
        endTime,
        eta,
        executed,
        vetoed,
      ] = info;
      const stateIdx = Number(state);
      return {
        id,
        proposer,
        description,
        state: PROPOSAL_STATES[stateIdx] || `Unknown(${stateIdx})`,
        stateIndex: stateIdx,
        votes: {
          for: forVotes.toString(),
          against: againstVotes.toString(),
          abstain: abstainVotes.toString(),
        },
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        eta: eta.toString(),
        executed,
        vetoed,
        startISO: new Date(Number(startTime) * 1000).toISOString(),
        endISO: new Date(Number(endTime) * 1000).toISOString(),
        etaISO: eta > 0n ? new Date(Number(eta) * 1000).toISOString() : null,
        url: `/api/defi/governance/proposals/${id}`,
      };
    }),
  );

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      governance: ADDRESSES.JESTERMOGGER,
      vetoCouncil: ADDRESSES.NFT_VETO_COUNCIL,
      total,
      returned: proposals.length,
      proposals,
      txBuilders: {
        vote: '/api/defi/governance/vote-tx?proposalId=&support=for|against|abstain',
        queue: '/api/defi/governance/queue-tx?proposalId=',
        execute: '/api/defi/governance/execute-tx?proposalId=',
        propose: '/api/defi/governance/propose-tx (POST)',
      },
    }),
  );
}
