import { NextRequest, NextResponse } from 'next/server';
import { client, ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe, isAddress, PROPOSAL_STATES } from '@/lib/defi';

export const dynamic = 'force-dynamic';

/**
 * GET /api/defi/governance/proposals/{id}?voter=0x...
 *
 * Full state for a single Jestermogger proposal: actions, vote tally, veto
 * status, and (if `voter` supplied) the voter's receipt + vote weight.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: 'proposalId must be a positive integer' }, { status: 400 });
  }

  const voter = req.nextUrl.searchParams.get('voter');

  const [info, state, actions, vetoInfo, isVetoed] = await Promise.all([
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
    client.readContract({
      address: ADDRESSES.JESTERMOGGER,
      abi: ABIS.JESTERMOGGER,
      functionName: 'getActions',
      args: [BigInt(id)],
    }),
    client
      .readContract({
        address: ADDRESSES.NFT_VETO_COUNCIL,
        abi: ABIS.NFT_VETO_COUNCIL,
        functionName: 'getVetoVote',
        args: [BigInt(id)],
      })
      .catch(() => null),
    client
      .readContract({
        address: ADDRESSES.NFT_VETO_COUNCIL,
        abi: ABIS.NFT_VETO_COUNCIL,
        functionName: 'isVetoed',
        args: [BigInt(id)],
      })
      .catch(() => false),
  ]);

  const [proposer, description, forVotes, againstVotes, abstainVotes, startTime, endTime, eta, executed, vetoed] = info;
  const [targets, values, calldatas] = actions;
  const stateIdx = Number(state);

  let receipt = null;
  if (voter && isAddress(voter)) {
    const r = await client.readContract({
      address: ADDRESSES.JESTERMOGGER,
      abi: ABIS.JESTERMOGGER,
      functionName: 'getReceipt',
      args: [BigInt(id), voter],
    });
    const supportMap = ['Against', 'For', 'Abstain'] as const;
    receipt = {
      voter,
      hasVoted: r[0],
      support: r[0] ? supportMap[Number(r[1])] : null,
      votes: r[2].toString(),
    };
  }

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      governance: ADDRESSES.JESTERMOGGER,
      proposal: {
        id,
        proposer,
        description,
        state: PROPOSAL_STATES[stateIdx] || `Unknown(${stateIdx})`,
        stateIndex: stateIdx,
        executed,
        vetoed: vetoed || isVetoed,
        votes: {
          for: forVotes.toString(),
          against: againstVotes.toString(),
          abstain: abstainVotes.toString(),
        },
        timing: {
          startTime: startTime.toString(),
          endTime: endTime.toString(),
          eta: eta.toString(),
          startISO: new Date(Number(startTime) * 1000).toISOString(),
          endISO: new Date(Number(endTime) * 1000).toISOString(),
          etaISO: eta > 0n ? new Date(Number(eta) * 1000).toISOString() : null,
        },
        actions: targets.map((t: string, i: number) => ({
          target: t,
          value: values[i].toString(),
          calldata: calldatas[i],
        })),
      },
      veto: vetoInfo
        ? {
            council: ADDRESSES.NFT_VETO_COUNCIL,
            startTime: vetoInfo[0].toString(),
            endTime: vetoInfo[1].toString(),
            yesVotes: vetoInfo[2].toString(),
            noVotes: vetoInfo[3].toString(),
            executed: vetoInfo[4],
            expired: vetoInfo[5],
            canExecute: vetoInfo[6],
          }
        : null,
      receipt,
      txBuilders: {
        vote: `/api/defi/governance/vote-tx?proposalId=${id}&support=for|against|abstain`,
        queue: `/api/defi/governance/queue-tx?proposalId=${id}`,
        execute: `/api/defi/governance/execute-tx?proposalId=${id}`,
      },
    }),
  );
}
