import { NextRequest, NextResponse } from 'next/server';
import { parseAbiItem, formatUnits, type Hex } from 'viem';
import { client, ADDRESSES, CHAIN_BLOCK, jsonSafe } from '@/lib/defi';

export const dynamic = 'force-dynamic';

// Pre-parsed event signatures.
const EVENTS = {
  burn: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
  staked: parseAbiItem('event Staked(address indexed user, uint256 amount)'),
  unstaked: parseAbiItem('event Unstaked(address indexed user, uint256 amount)'),
  rewardsClaimed: parseAbiItem('event RewardsClaimed(address indexed user, uint256 reward)'),
  framemoggerSent: parseAbiItem(
    'event MegachadSent(address indexed sender, uint256 megachadAmount, uint256 megagoonerBurned, uint256 week)',
  ),
  proposalCreated: parseAbiItem(
    'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address[] targets, uint256[] values, string description, uint256 startTime, uint256 endTime)',
  ),
  voteCast: parseAbiItem(
    'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 votes)',
  ),
  proposalExecuted: parseAbiItem('event ProposalExecuted(uint256 indexed proposalId)'),
  proposalQueued: parseAbiItem('event ProposalQueued(uint256 indexed proposalId, uint256 eta)'),
} as const;

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD' as const;
const SUPPORT_LABELS = ['Against', 'For', 'Abstain'] as const;

/**
 * GET /api/defi/activity?limit=50&blocks=2000
 *
 * Unified recent-events feed across the MEGA Protocol stack: burns (MEGACHAD →
 * dead address), Framemogger sends, MoggerStaking / JESTERGOONER stake / unstake
 * / claim, and Jestermogger proposal lifecycle (created / voted / queued /
 * executed). Caps the scan window to keep response fast; raise `blocks` for
 * deeper history. Sorted newest-first.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get('limit') || 50), 1), 200);
  const blocks = Math.min(Math.max(Number(sp.get('blocks') || 2000), 100), 50000);

  const latest = await client.getBlockNumber();
  const fromBlock = latest > BigInt(blocks) ? latest - BigInt(blocks) : 0n;

  const [
    burnLogs,
    framemoggerLogs,
    moggerStakedLogs,
    moggerUnstakedLogs,
    moggerClaimedLogs,
    jesterStakedLogs,
    jesterUnstakedLogs,
    jesterClaimedLogs,
    proposalCreatedLogs,
    voteCastLogs,
    proposalQueuedLogs,
    proposalExecutedLogs,
  ] = await Promise.all([
    client.getLogs({
      address: ADDRESSES.MEGACHAD,
      event: EVENTS.burn,
      args: { to: BURN_ADDRESS },
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({ address: ADDRESSES.FRAMEMOGGER, event: EVENTS.framemoggerSent, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.MOGGER_STAKING, event: EVENTS.staked, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.MOGGER_STAKING, event: EVENTS.unstaked, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.MOGGER_STAKING, event: EVENTS.rewardsClaimed, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERGOONER, event: EVENTS.staked, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERGOONER, event: EVENTS.unstaked, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERGOONER, event: EVENTS.rewardsClaimed, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERMOGGER, event: EVENTS.proposalCreated, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERMOGGER, event: EVENTS.voteCast, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERMOGGER, event: EVENTS.proposalQueued, fromBlock, toBlock: latest }),
    client.getLogs({ address: ADDRESSES.JESTERMOGGER, event: EVENTS.proposalExecuted, fromBlock, toBlock: latest }),
  ]);

  type Event = {
    kind: string;
    blockNumber: string;
    txHash: Hex;
    logIndex: number;
    summary: string;
    actor?: string;
    amount?: string;
    amountHuman?: string;
    proposalId?: string;
    extras?: Record<string, unknown>;
  };

  const events: Event[] = [];

  for (const l of burnLogs) {
    events.push({
      kind: 'burn',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.from,
      amount: l.args.value?.toString(),
      amountHuman: l.args.value ? formatUnits(l.args.value, 18) : undefined,
      summary: `${l.args.from?.slice(0, 6)}…${l.args.from?.slice(-4)} burned ${l.args.value ? formatUnits(l.args.value, 18) : '0'} MEGACHAD`,
    });
  }
  for (const l of framemoggerLogs) {
    events.push({
      kind: 'framemogger_send',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.sender,
      amount: l.args.megachadAmount?.toString(),
      amountHuman: l.args.megachadAmount ? formatUnits(l.args.megachadAmount, 18) : undefined,
      summary: `${l.args.sender?.slice(0, 6)}…${l.args.sender?.slice(-4)} sent ${l.args.megachadAmount ? formatUnits(l.args.megachadAmount, 18) : '0'} MEGACHAD to tren fund (week ${l.args.week?.toString()})`,
      extras: { megagoonerBurned: l.args.megagoonerBurned?.toString(), week: l.args.week?.toString() },
    });
  }
  for (const l of moggerStakedLogs) {
    events.push({
      kind: 'mogger_staked',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.amount?.toString(),
      amountHuman: l.args.amount ? formatUnits(l.args.amount, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} staked ${l.args.amount ? formatUnits(l.args.amount, 18) : '0'} MEGACHAD in MoggerStaking`,
    });
  }
  for (const l of moggerUnstakedLogs) {
    events.push({
      kind: 'mogger_unstaked',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.amount?.toString(),
      amountHuman: l.args.amount ? formatUnits(l.args.amount, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} unstaked ${l.args.amount ? formatUnits(l.args.amount, 18) : '0'} MEGACHAD`,
    });
  }
  for (const l of moggerClaimedLogs) {
    events.push({
      kind: 'mogger_claimed',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.reward?.toString(),
      amountHuman: l.args.reward ? formatUnits(l.args.reward, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} claimed ${l.args.reward ? formatUnits(l.args.reward, 18) : '0'} MEGAGOONER (Mogger)`,
    });
  }
  for (const l of jesterStakedLogs) {
    events.push({
      kind: 'jester_staked',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.amount?.toString(),
      amountHuman: l.args.amount ? formatUnits(l.args.amount, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} staked ${l.args.amount ? formatUnits(l.args.amount, 18) : '0'} MC/MG LP in JESTERGOONER`,
    });
  }
  for (const l of jesterUnstakedLogs) {
    events.push({
      kind: 'jester_unstaked',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.amount?.toString(),
      amountHuman: l.args.amount ? formatUnits(l.args.amount, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} unstaked ${l.args.amount ? formatUnits(l.args.amount, 18) : '0'} LP`,
    });
  }
  for (const l of jesterClaimedLogs) {
    events.push({
      kind: 'jester_claimed',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.user,
      amount: l.args.reward?.toString(),
      amountHuman: l.args.reward ? formatUnits(l.args.reward, 18) : undefined,
      summary: `${l.args.user?.slice(0, 6)}…${l.args.user?.slice(-4)} claimed ${l.args.reward ? formatUnits(l.args.reward, 18) : '0'} MEGAGOONER (Jester)`,
    });
  }
  for (const l of proposalCreatedLogs) {
    events.push({
      kind: 'proposal_created',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.proposer,
      proposalId: l.args.proposalId?.toString(),
      summary: `${l.args.proposer?.slice(0, 6)}…${l.args.proposer?.slice(-4)} created proposal #${l.args.proposalId?.toString()}`,
      extras: { description: l.args.description },
    });
  }
  for (const l of voteCastLogs) {
    const supportIdx = Number(l.args.support ?? 0);
    events.push({
      kind: 'vote_cast',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      actor: l.args.voter,
      proposalId: l.args.proposalId?.toString(),
      amount: l.args.votes?.toString(),
      amountHuman: l.args.votes ? formatUnits(l.args.votes, 18) : undefined,
      summary: `${l.args.voter?.slice(0, 6)}…${l.args.voter?.slice(-4)} voted ${SUPPORT_LABELS[supportIdx] ?? supportIdx} on #${l.args.proposalId?.toString()} (${l.args.votes ? formatUnits(l.args.votes, 18) : '0'} MEGAGOONER)`,
    });
  }
  for (const l of proposalQueuedLogs) {
    events.push({
      kind: 'proposal_queued',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      proposalId: l.args.proposalId?.toString(),
      summary: `Proposal #${l.args.proposalId?.toString()} queued (eta ${l.args.eta?.toString()})`,
    });
  }
  for (const l of proposalExecutedLogs) {
    events.push({
      kind: 'proposal_executed',
      blockNumber: l.blockNumber.toString(),
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      proposalId: l.args.proposalId?.toString(),
      summary: `Proposal #${l.args.proposalId?.toString()} executed`,
    });
  }

  events.sort((a, b) => {
    const blockDiff = BigInt(b.blockNumber) - BigInt(a.blockNumber);
    if (blockDiff !== 0n) return blockDiff > 0n ? 1 : -1;
    return b.logIndex - a.logIndex;
  });

  const trimmed = events.slice(0, limit);

  return NextResponse.json(
    jsonSafe({
      chain: CHAIN_BLOCK,
      window: {
        fromBlock: fromBlock.toString(),
        toBlock: latest.toString(),
        blocksScanned: blocks,
        approxSeconds: blocks * 0.25,
      },
      totalEvents: events.length,
      returned: trimmed.length,
      events: trimmed,
      explorer: 'https://megaexplorer.xyz',
      relatedEndpoints: {
        gallery: '/api/gallery',
        proposals: '/api/defi/governance/proposals',
        staking: '/api/defi/staking',
      },
    }),
    { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=10' } },
  );
}
