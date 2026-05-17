import { NextResponse } from 'next/server';
import { client, ADDRESSES, ABIS, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

// CircuitBreaker ABI — minimal subset for safety status reads.
const CIRCUIT_BREAKER_ABI = [
  {
    type: 'function',
    name: 'getPauseStatus',
    inputs: [],
    outputs: [
      { name: 'paused', type: 'bool' },
      { name: 'pausedAt', type: 'uint256' },
      { name: 'autoUnpauseTime', type: 'uint256' },
      { name: 'pauseYesVotes', type: 'uint256' },
      { name: 'pauseNoVotes', type: 'uint256' },
      { name: 'unpauseYesVotes', type: 'uint256' },
      { name: 'unpauseNoVotes', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getGuardians',
    inputs: [],
    outputs: [{ name: '', type: 'address[5]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'timeUntilAutoUnpause',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * GET /api/defi/safety
 *
 * Snapshot of every safety-relevant on-chain switch the agent needs to check
 * BEFORE sending writes: CircuitBreaker pause state, guardian votes, and the
 * NFTVetoCouncil composition (20 seats, threshold, current members).
 * If `paused: true`, every staking/AMM/governance write will revert.
 */
export async function GET() {
  const [
    pauseStatus,
    guardians,
    timeUntilUnpause,
    council,
    councilSize,
    vetoThreshold,
    vetoWindow,
  ] = await Promise.all([
    client.readContract({
      address: ADDRESSES.CIRCUIT_BREAKER,
      abi: CIRCUIT_BREAKER_ABI,
      functionName: 'getPauseStatus',
    }),
    client.readContract({
      address: ADDRESSES.CIRCUIT_BREAKER,
      abi: CIRCUIT_BREAKER_ABI,
      functionName: 'getGuardians',
    }),
    client.readContract({
      address: ADDRESSES.CIRCUIT_BREAKER,
      abi: CIRCUIT_BREAKER_ABI,
      functionName: 'timeUntilAutoUnpause',
    }),
    client.readContract({
      address: ADDRESSES.NFT_VETO_COUNCIL,
      abi: ABIS.NFT_VETO_COUNCIL,
      functionName: 'getCouncil',
    }),
    client.readContract({
      address: ADDRESSES.NFT_VETO_COUNCIL,
      abi: ABIS.NFT_VETO_COUNCIL,
      functionName: 'COUNCIL_SIZE',
    }),
    client.readContract({
      address: ADDRESSES.NFT_VETO_COUNCIL,
      abi: ABIS.NFT_VETO_COUNCIL,
      functionName: 'VETO_THRESHOLD',
    }),
    client.readContract({
      address: ADDRESSES.NFT_VETO_COUNCIL,
      abi: ABIS.NFT_VETO_COUNCIL,
      functionName: 'VETO_VOTING_PERIOD',
    }),
  ]);

  const [paused, pausedAt, autoUnpauseTime, pauseYesVotes, pauseNoVotes, unpauseYesVotes, unpauseNoVotes] =
    pauseStatus as [boolean, bigint, bigint, bigint, bigint, bigint, bigint];

  const zeroAddr = '0x0000000000000000000000000000000000000000';
  const filledCouncil = (council as readonly string[]).filter((a) => a && a !== zeroAddr);

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      circuitBreaker: {
        address: ADDRESSES.CIRCUIT_BREAKER,
        paused,
        pausedAt: pausedAt.toString(),
        pausedAtISO: pausedAt > 0n ? new Date(Number(pausedAt) * 1000).toISOString() : null,
        autoUnpauseTime: autoUnpauseTime.toString(),
        autoUnpauseTimeISO: autoUnpauseTime > 0n ? new Date(Number(autoUnpauseTime) * 1000).toISOString() : null,
        timeUntilAutoUnpauseSec: timeUntilUnpause.toString(),
        pauseVotes: { yes: pauseYesVotes.toString(), no: pauseNoVotes.toString() },
        unpauseVotes: { yes: unpauseYesVotes.toString(), no: unpauseNoVotes.toString() },
        guardians,
        agentGuidance: paused
          ? 'Protocol is PAUSED. Any write tx targeting staking / AMM / governance will revert. Defer writes until unpause.'
          : 'Protocol is healthy — writes are safe to send.',
      },
      vetoCouncil: {
        address: ADDRESSES.NFT_VETO_COUNCIL,
        councilSize: Number(councilSize),
        vetoThreshold: Number(vetoThreshold),
        vetoWindowSec: Number(vetoWindow),
        currentMembers: filledCouncil,
        memberCount: filledCouncil.length,
        seatsFilled: `${filledCouncil.length}/${Number(councilSize)}`,
        model: `Top ${Number(councilSize)} NFT-holding addresses form a veto council. ${Number(vetoThreshold)}+ veto-yes votes within ${Math.floor(Number(vetoWindow) / 3600)}h cancel a queued proposal.`,
      },
      relatedEndpoints: {
        registry: '/.well-known/megachad-protocol.json',
        proposals: '/api/defi/governance/proposals',
        vetoTx: '/api/defi/governance/veto-tx?proposalId=&support=yes|no&voter=0x...',
      },
    }),
    { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15' } },
  );
}
