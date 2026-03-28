'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits } from 'viem';
import {
  TESTNET_JESTERMOGGER_ADDRESS,
  TESTNET_FRAMEMOGGER_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  JESTERMOGGER_ABI,
  FRAMEMOGGER_ABI,
  ERC20_ABI,
  PROPOSAL_STATES,
} from '@/lib/testnet-contracts';

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtBig(raw: bigint | undefined, decimals = 18): string {
  if (raw === undefined) return '—';
  return Number(formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtDate(ts: bigint | number): string {
  const n = Number(ts);
  if (n === 0) return '—';
  return new Date(n * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function stateColor(state: number): string {
  switch (state) {
    case 0: return 'state-pending';
    case 1: return 'state-active';
    case 2: return 'state-defeated';
    case 3: return 'state-succeeded';
    case 4: return 'state-queued';
    case 5: return 'state-executed';
    case 6: return 'state-expired';
    case 7: return 'state-vetoed';
    default: return '';
  }
}

// ═════════════════════════════════════════════════════════
export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const [view, setView] = useState<'proposals' | 'create'>('proposals');
  const [whitelisted, setWhitelisted] = useState(false);

  useEffect(() => {
    if (!address) { setWhitelisted(false); return; }
    fetch(`/api/beta/whitelist?address=${address}`)
      .then((r) => r.json())
      .then((d) => setWhitelisted(d.whitelisted))
      .catch(() => setWhitelisted(false));
  }, [address]);

  return (
    <div className="beta-page">
      <section className="beta-hero">
        <h1 className="beta-hero-title">JESTERMOGGER</h1>
        <p className="beta-hero-subtitle">
          Governance — Propose, Vote, Execute
        </p>
        <div className="beta-chain-info">
          <span className="beta-chain-dot" />
          MegaETH Testnet (Chain 6342)
        </div>
      </section>

      <div className="beta-content">
        {!isConnected ? (
          <div className="beta-connect-prompt">
            <p>Connect your wallet to participate in governance.</p>
          </div>
        ) : !whitelisted ? (
          <div className="beta-not-allowed">
            <div className="beta-lock-icon">&#128274;</div>
            <h3>WALLET NOT WHITELISTED</h3>
            <p>Your wallet ({truncAddr(address!)}) is not authorized for testnet operations.</p>
            <p className="beta-dim">Contact the team to request access.</p>
          </div>
        ) : (
          <>
            <GovernanceStats address={address!} />

            <div className="beta-tabs" style={{ marginTop: '2rem' }}>
              <button
                className={`beta-tab${view === 'proposals' ? ' active' : ''}`}
                onClick={() => setView('proposals')}
              >
                PROPOSALS
              </button>
              <button
                className={`beta-tab${view === 'create' ? ' active' : ''}`}
                onClick={() => setView('create')}
              >
                CREATE PROPOSAL
              </button>
            </div>

            {view === 'proposals' && <ProposalList address={address!} />}
            {view === 'create' && <CreateProposal address={address!} />}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// GOVERNANCE STATS
// ═════════════════════════════════════════════════════════
function GovernanceStats({ address }: { address: `0x${string}` }) {
  const { data: proposalCount } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'proposalCount',
  });

  const { data: megagoonerBalance } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: canPropose } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'canPropose',
    args: [address],
  });

  const { data: votingPeriod } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'VOTING_PERIOD',
  });

  const { data: quorum } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'QUORUM_PERCENTAGE',
  });

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>GOVERNANCE OVERVIEW</h2>
      </div>
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL PROPOSALS</span>
          <span className="beta-stat-value">{proposalCount !== undefined ? Number(proposalCount).toString() : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR VOTING POWER</span>
          <span className="beta-stat-value">{fmtBig(megagoonerBalance)} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">CAN PROPOSE</span>
          <span className={`beta-stat-value ${canPropose ? 'text-green' : ''}`}>
            {canPropose ? 'YES (Top 3 Burner)' : 'NO'}
          </span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">VOTING PERIOD</span>
          <span className="beta-stat-value">{votingPeriod ? `${Number(votingPeriod) / 86400}d` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">QUORUM</span>
          <span className="beta-stat-value">{quorum !== undefined ? `${Number(quorum)}%` : '—'}</span>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// PROPOSAL LIST
// ═════════════════════════════════════════════════════════
function ProposalList({ address }: { address: `0x${string}` }) {
  const { data: proposalCount } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'proposalCount',
  });

  const count = proposalCount ? Number(proposalCount) : 0;

  if (count === 0) {
    return (
      <div className="beta-card">
        <div className="beta-empty-state">
          <p>No proposals yet. Be the first to create one!</p>
          <p className="beta-dim">Top 3 weekly burners on Framemogger can create proposals.</p>
        </div>
      </div>
    );
  }

  // Render proposals in reverse order (newest first)
  const proposalIds = Array.from({ length: count }, (_, i) => count - i);

  return (
    <div className="beta-proposal-list">
      {proposalIds.map((id) => (
        <ProposalCard key={id} proposalId={id} voterAddress={address} />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// SINGLE PROPOSAL CARD
// ═════════════════════════════════════════════════════════
function ProposalCard({ proposalId, voterAddress }: { proposalId: number; voterAddress: `0x${string}` }) {
  const [expanded, setExpanded] = useState(false);
  const [voteChoice, setVoteChoice] = useState<0 | 1 | 2 | null>(null);

  const { data: proposal } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
  });

  const { data: receipt } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'getReceipt',
    args: [BigInt(proposalId), voterAddress],
  });

  const { data: proposalState } = useReadContract({
    address: TESTNET_JESTERMOGGER_ADDRESS,
    abi: JESTERMOGGER_ABI,
    functionName: 'state',
    args: [BigInt(proposalId)],
  });

  // Vote
  const { writeContract: writeVote, data: voteHash } = useWriteContract();
  const { isSuccess: voteConfirmed } = useWaitForTransactionReceipt({ hash: voteHash });

  // Queue
  const { writeContract: writeQueue, data: queueHash } = useWriteContract();
  const { isSuccess: queueConfirmed } = useWaitForTransactionReceipt({ hash: queueHash });

  // Execute
  const { writeContract: writeExecute, data: executeHash } = useWriteContract();
  const { isSuccess: executeConfirmed } = useWaitForTransactionReceipt({ hash: executeHash });

  const [actionStatus, setActionStatus] = useState<'idle' | 'voting' | 'queueing' | 'executing' | 'done' | 'error'>('idle');

  const handleVote = (support: 0 | 1 | 2) => {
    setActionStatus('voting');
    writeVote({
      address: TESTNET_JESTERMOGGER_ADDRESS,
      abi: JESTERMOGGER_ABI,
      functionName: 'castVote',
      args: [BigInt(proposalId), support],
    }, {
      onError: () => setActionStatus('error'),
    });
  };

  const handleQueue = () => {
    setActionStatus('queueing');
    writeQueue({
      address: TESTNET_JESTERMOGGER_ADDRESS,
      abi: JESTERMOGGER_ABI,
      functionName: 'queue',
      args: [BigInt(proposalId)],
    }, {
      onError: () => setActionStatus('error'),
    });
  };

  const handleExecute = () => {
    setActionStatus('executing');
    writeExecute({
      address: TESTNET_JESTERMOGGER_ADDRESS,
      abi: JESTERMOGGER_ABI,
      functionName: 'execute',
      args: [BigInt(proposalId)],
    }, {
      onError: () => setActionStatus('error'),
    });
  };

  useEffect(() => {
    if (voteConfirmed || queueConfirmed || executeConfirmed) setActionStatus('done');
  }, [voteConfirmed, queueConfirmed, executeConfirmed]);

  if (!proposal) return <div className="beta-card beta-card-loading">Loading proposal #{proposalId}...</div>;

  const [proposer, description, forVotes, againstVotes, abstainVotes, startTime, endTime, eta, executed, vetoed, currentState] = proposal;
  const state = proposalState !== undefined ? Number(proposalState) : Number(currentState);
  const totalVotes = forVotes + againstVotes + abstainVotes;
  const forPct = totalVotes > 0n ? Number((forVotes * 100n) / totalVotes) : 0;
  const againstPct = totalVotes > 0n ? Number((againstVotes * 100n) / totalVotes) : 0;
  const abstainPct = totalVotes > 0n ? Number((abstainVotes * 100n) / totalVotes) : 0;
  const hasVoted = receipt?.[0] ?? false;
  const isActive = state === 1;
  const isSucceeded = state === 3;
  const isQueued = state === 4;

  return (
    <div className={`beta-card beta-proposal-card ${expanded ? 'expanded' : ''}`}>
      <div className="beta-proposal-header" onClick={() => setExpanded(!expanded)}>
        <div className="beta-proposal-id">#{proposalId}</div>
        <div className="beta-proposal-title">{description.length > 80 ? description.slice(0, 80) + '...' : description}</div>
        <div className={`beta-proposal-state ${stateColor(state)}`}>
          {PROPOSAL_STATES[state] || 'Unknown'}
        </div>
        <div className="beta-proposal-expand">{expanded ? '−' : '+'}</div>
      </div>

      {expanded && (
        <div className="beta-proposal-body">
          <div className="beta-proposal-meta">
            <span>Proposer: {truncAddr(proposer)}</span>
            <span>Start: {fmtDate(startTime)}</span>
            <span>End: {fmtDate(endTime)}</span>
            {Number(eta) > 0 && <span>ETA: {fmtDate(eta)}</span>}
          </div>

          <p className="beta-proposal-desc">{description}</p>

          {/* Vote bars */}
          <div className="beta-vote-bars">
            <div className="beta-vote-bar">
              <div className="beta-vote-bar-label">
                <span>FOR</span>
                <span>{fmtBig(forVotes)} ({forPct}%)</span>
              </div>
              <div className="beta-vote-bar-track">
                <div className="beta-vote-bar-fill for" style={{ width: `${forPct}%` }} />
              </div>
            </div>
            <div className="beta-vote-bar">
              <div className="beta-vote-bar-label">
                <span>AGAINST</span>
                <span>{fmtBig(againstVotes)} ({againstPct}%)</span>
              </div>
              <div className="beta-vote-bar-track">
                <div className="beta-vote-bar-fill against" style={{ width: `${againstPct}%` }} />
              </div>
            </div>
            <div className="beta-vote-bar">
              <div className="beta-vote-bar-label">
                <span>ABSTAIN</span>
                <span>{fmtBig(abstainVotes)} ({abstainPct}%)</span>
              </div>
              <div className="beta-vote-bar-track">
                <div className="beta-vote-bar-fill abstain" style={{ width: `${abstainPct}%` }} />
              </div>
            </div>
          </div>

          {/* Your vote */}
          {hasVoted && (
            <div className="beta-your-vote">
              You voted: <strong>{['AGAINST', 'FOR', 'ABSTAIN'][receipt![1]]}</strong> with {fmtBig(receipt![2])} votes
            </div>
          )}

          {/* Actions */}
          <div className="beta-proposal-actions">
            {isActive && !hasVoted && (
              <div className="beta-vote-buttons">
                <button className="beta-btn-vote for" onClick={() => handleVote(1)}>VOTE FOR</button>
                <button className="beta-btn-vote against" onClick={() => handleVote(0)}>VOTE AGAINST</button>
                <button className="beta-btn-vote abstain" onClick={() => handleVote(2)}>ABSTAIN</button>
              </div>
            )}
            {isSucceeded && (
              <button className="beta-btn-primary" onClick={handleQueue}>QUEUE FOR EXECUTION</button>
            )}
            {isQueued && Number(eta) > 0 && Math.floor(Date.now() / 1000) >= Number(eta) && (
              <button className="beta-btn-primary" onClick={handleExecute}>EXECUTE</button>
            )}
            {isQueued && Number(eta) > 0 && Math.floor(Date.now() / 1000) < Number(eta) && (
              <div className="beta-dim">Timelock: executable after {fmtDate(eta)}</div>
            )}
          </div>

          {actionStatus !== 'idle' && actionStatus !== 'done' && (
            <div className={`beta-status ${actionStatus === 'error' ? 'error' : ''}`}>
              {actionStatus === 'voting' && 'Casting vote...'}
              {actionStatus === 'queueing' && 'Queueing proposal...'}
              {actionStatus === 'executing' && 'Executing proposal...'}
              {actionStatus === 'error' && 'Transaction failed'}
            </div>
          )}
          {actionStatus === 'done' && <div className="beta-status success">Action confirmed!</div>}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// CREATE PROPOSAL
// ═════════════════════════════════════════════════════════
function CreateProposal({ address }: { address: `0x${string}` }) {
  const [description, setDescription] = useState('');
  const [targetAddr, setTargetAddr] = useState('');
  const [value, setValue] = useState('0');
  const [calldata, setCalldata] = useState('0x');
  const [status, setStatus] = useState<'idle' | 'proposing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: canPropose } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'canPropose',
    args: [address],
  });

  const { writeContract: writePropose, data: proposeHash } = useWriteContract();
  const { isSuccess: proposeConfirmed } = useWaitForTransactionReceipt({ hash: proposeHash });

  const handlePropose = () => {
    if (!description.trim()) { setErrorMsg('Description required'); return; }
    if (!targetAddr.startsWith('0x') || targetAddr.length !== 42) { setErrorMsg('Valid target address required'); return; }
    setErrorMsg('');
    setStatus('proposing');

    writePropose({
      address: TESTNET_JESTERMOGGER_ADDRESS,
      abi: JESTERMOGGER_ABI,
      functionName: 'propose',
      args: [
        [targetAddr as `0x${string}`],
        [BigInt(value || '0')],
        [calldata as `0x${string}`],
        description,
      ],
    }, {
      onError: (err) => {
        setStatus('error');
        setErrorMsg(err.message?.includes('not in top 3') ? 'Only top 3 weekly burners can propose' : 'Proposal failed');
      },
    });
  };

  useEffect(() => {
    if (proposeConfirmed && status === 'proposing') {
      setStatus('done');
      setDescription('');
      setTargetAddr('');
      setValue('0');
      setCalldata('0x');
    }
  }, [proposeConfirmed]);

  if (!canPropose) {
    return (
      <div className="beta-card">
        <div className="beta-not-allowed">
          <h3>PROPOSAL ACCESS RESTRICTED</h3>
          <p>Only the top 3 weekly burners on Framemogger can create proposals.</p>
          <p className="beta-dim">Burn more $MEGACHAD to earn proposal rights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>CREATE PROPOSAL</h2>
        <span className="beta-card-badge">TOP 3 BURNER</span>
      </div>
      <p className="beta-card-desc">
        As a top 3 weekly burner, you can submit governance proposals for $MEGAGOONER holders to vote on.
      </p>

      <div className="beta-input-group">
        <label className="beta-input-label">PROPOSAL DESCRIPTION</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this proposal does and why..."
          className="beta-textarea"
          rows={4}
        />
      </div>

      <div className="beta-input-group">
        <label className="beta-input-label">TARGET CONTRACT ADDRESS</label>
        <input
          type="text"
          value={targetAddr}
          onChange={(e) => setTargetAddr(e.target.value)}
          placeholder="0x..."
          className="beta-input"
        />
      </div>

      <div className="beta-input-group">
        <label className="beta-input-label">ETH VALUE (wei)</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className="beta-input"
        />
      </div>

      <div className="beta-input-group">
        <label className="beta-input-label">CALLDATA (hex)</label>
        <input
          type="text"
          value={calldata}
          onChange={(e) => setCalldata(e.target.value)}
          placeholder="0x"
          className="beta-input"
        />
      </div>

      {status !== 'idle' && status !== 'done' && (
        <div className={`beta-status ${status === 'error' ? 'error' : ''}`}>
          {status === 'proposing' && 'Creating proposal...'}
          {status === 'error' && (errorMsg || 'Transaction failed')}
        </div>
      )}
      {status === 'done' && <div className="beta-status success">Proposal created successfully!</div>}
      {errorMsg && status === 'idle' && <div className="beta-status error">{errorMsg}</div>}

      <button
        className="beta-btn-primary"
        onClick={handlePropose}
        disabled={status === 'proposing'}
      >
        SUBMIT PROPOSAL
      </button>
    </div>
  );
}
