import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData, type Address } from 'viem';
import { client, ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe, isAddress } from '@/lib/defi';

export const dynamic = 'force-dynamic';

const SUPPORT_MAP: Record<string, boolean> = {
  yes: true,
  no: false,
  for: true,
  against: false,
  veto: true,
};

/**
 * GET /api/defi/governance/veto-tx?proposalId=N&support=yes|no&voter=0x...
 *
 * Returns the calldata for casting a veto vote on NFTVetoCouncil. If `voter`
 * is provided, also reports council-membership status and whether they have
 * already voted. If no veto window has started yet for the proposal, returns
 * an extra startVetoVote() tx so the caller can boot the window first.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const proposalIdParam = sp.get('proposalId');
  const supportParam = (sp.get('support') || 'yes').toLowerCase();
  const voter = sp.get('voter');

  const proposalId = Number(proposalIdParam);
  if (!proposalIdParam || !Number.isFinite(proposalId) || proposalId < 1) {
    return NextResponse.json({ error: 'proposalId must be a positive integer' }, { status: 400 });
  }
  if (!(supportParam in SUPPORT_MAP)) {
    return NextResponse.json({ error: 'support must be yes|no (or for|against)' }, { status: 400 });
  }
  if (voter && !isAddress(voter)) {
    return NextResponse.json({ error: 'voter must be 0x...' }, { status: 400 });
  }

  const support = SUPPORT_MAP[supportParam];
  const id = BigInt(proposalId);

  const [vetoInfo, isVetoed, isCouncilMember, hasVoted] = await Promise.all([
    client
      .readContract({
        address: ADDRESSES.NFT_VETO_COUNCIL,
        abi: ABIS.NFT_VETO_COUNCIL,
        functionName: 'getVetoVote',
        args: [id],
      })
      .catch(() => null) as Promise<readonly [bigint, bigint, bigint, bigint, boolean, boolean, boolean] | null>,
    client
      .readContract({
        address: ADDRESSES.NFT_VETO_COUNCIL,
        abi: ABIS.NFT_VETO_COUNCIL,
        functionName: 'isVetoed',
        args: [id],
      })
      .catch(() => false),
    voter
      ? (client.readContract({
          address: ADDRESSES.NFT_VETO_COUNCIL,
          abi: ABIS.NFT_VETO_COUNCIL,
          functionName: 'isCouncilMember',
          args: [voter as Address],
        }) as Promise<boolean>)
      : Promise.resolve<boolean | null>(null),
    voter
      ? (client.readContract({
          address: ADDRESSES.NFT_VETO_COUNCIL,
          abi: ABIS.NFT_VETO_COUNCIL,
          functionName: 'hasVotedOnVeto',
          args: [id, voter as Address],
        }) as Promise<boolean>)
      : Promise.resolve<boolean | null>(null),
  ]);

  const vetoWindowStarted = !!vetoInfo && vetoInfo[0] > 0n;
  const vetoWindowExpired = !!vetoInfo && vetoInfo[5];
  const vetoAlreadyExecuted = !!vetoInfo && vetoInfo[4];

  const actions: Array<Record<string, unknown>> = [];

  if (!vetoWindowStarted && !vetoAlreadyExecuted && !isVetoed) {
    actions.push({
      step: 'startVetoVote',
      to: ADDRESSES.NFT_VETO_COUNCIL,
      value: '0',
      data: encodeFunctionData({
        abi: ABIS.NFT_VETO_COUNCIL,
        functionName: 'startVetoVote',
        args: [id],
      }),
      functionName: 'startVetoVote',
      args: { proposalId },
      note: 'No veto window has been opened yet for this proposal. Any council member can open it.',
    });
  }

  actions.push({
    step: 'castVetoVote',
    to: ADDRESSES.NFT_VETO_COUNCIL,
    value: '0',
    data: encodeFunctionData({
      abi: ABIS.NFT_VETO_COUNCIL,
      functionName: 'castVetoVote',
      args: [id, support],
    }),
    functionName: 'castVetoVote',
    args: { proposalId, support },
  });

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      vetoCouncil: ADDRESSES.NFT_VETO_COUNCIL,
      proposalId,
      support: support ? 'yes (veto)' : 'no (defend)',
      vetoState: vetoInfo
        ? {
            startTime: vetoInfo[0].toString(),
            endTime: vetoInfo[1].toString(),
            yesVotes: vetoInfo[2].toString(),
            noVotes: vetoInfo[3].toString(),
            executed: vetoInfo[4],
            expired: vetoInfo[5],
            canExecute: vetoInfo[6],
          }
        : { note: 'Veto window not yet opened.' },
      isVetoed,
      voter: voter
        ? {
            address: voter,
            isCouncilMember,
            hasAlreadyVoted: hasVoted,
            canVote: !!isCouncilMember && !hasVoted && !vetoWindowExpired && !isVetoed,
          }
        : null,
      executionPlan: actions,
      thresholdNote: 'NFTVetoCouncil veto succeeds when 11/20 yes-votes accumulate within the 2-day window.',
      relatedEndpoints: {
        proposal: `/api/defi/governance/proposals/${proposalId}`,
        safety: '/api/defi/safety',
      },
    }),
  );
}
