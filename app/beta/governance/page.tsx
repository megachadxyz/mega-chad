'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { formatUnits, encodeFunctionData } from 'viem';
import {
  TESTNET_JESTERMOGGER_ADDRESS,
  TESTNET_FRAMEMOGGER_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  TESTNET_MEGACHAD_ADDRESS,
  TESTNET_JESTERGOONER_ADDRESS,
  JESTERMOGGER_ABI,
  FRAMEMOGGER_ABI,
  ERC20_ABI,
  PROPOSAL_STATES,
} from '@/lib/testnet-contracts';

type TemplateKind = 'custom' | 'set-alloc' | 'signal-burn-price' | 'signal';

const POOL_LABELS = [
  '0 — MEGACHAD / MEGAGOONER',
  '1 — MEGACHAD / ETH',
  '2 — MEGACHAD / USDm',
];

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
          MegaETH Testnet (Chain 6343)
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
  const [template, setTemplate] = useState<TemplateKind>('set-alloc');
  const [description, setDescription] = useState('');
  const [targetAddr, setTargetAddr] = useState('');
  const [value, setValue] = useState('0');
  const [calldata, setCalldata] = useState('0x');
  const [status, setStatus] = useState<'idle' | 'proposing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Template-specific inputs
  const [allocPid, setAllocPid] = useState('0');
  const [allocNew, setAllocNew] = useState('');
  const [burnPriceNew, setBurnPriceNew] = useState('');
  const [signalTarget, setSignalTarget] = useState<`0x${string}` | ''>('');

  const { data: canPropose } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'canPropose',
    args: [address],
  });

  const { writeContract: writePropose, data: proposeHash } = useWriteContract();
  const { isSuccess: proposeConfirmed } = useWaitForTransactionReceipt({ hash: proposeHash });

  // Build {target, value, calldata, description} from the selected template.
  // Returns a string on validation error, or the built call on success.
  const buildCall = (): string | {
    target: `0x${string}`;
    value: bigint;
    calldata: `0x${string}`;
    description: string;
  } => {
    if (template === 'custom') {
      if (!description.trim()) return 'Description required';
      if (!targetAddr.startsWith('0x') || targetAddr.length !== 42) return 'Valid target address required';
      let v: bigint;
      try { v = BigInt(value || '0'); } catch { return 'ETH value must be a whole number (wei)'; }
      if (!calldata.startsWith('0x')) return 'Calldata must start with 0x';
      return {
        target: targetAddr as `0x${string}`,
        value: v,
        calldata: calldata as `0x${string}`,
        description,
      };
    }

    if (template === 'set-alloc') {
      const pid = Number(allocPid);
      const newAlloc = Number(allocNew);
      if (!Number.isInteger(pid) || pid < 0 || pid > 2) return 'Pick a pool';
      if (!Number.isFinite(newAlloc) || newAlloc <= 0) return 'New alloc point must be > 0';
      const data = encodeFunctionData({
        abi: [{
          type: 'function',
          name: 'setAllocPoint',
          inputs: [
            { name: 'pid', type: 'uint256' },
            { name: 'newAllocPoint', type: 'uint256' },
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        }] as const,
        functionName: 'setAllocPoint',
        args: [BigInt(pid), BigInt(newAlloc)],
      });
      const desc = description.trim() ||
        `Set JesterGoonerV3 alloc point for pool ${pid} (${POOL_LABELS[pid]}) to ${newAlloc}`;
      return {
        target: TESTNET_JESTERGOONER_ADDRESS,
        value: 0n,
        calldata: data,
        description: desc,
      };
    }

    if (template === 'signal-burn-price') {
      const newPrice = Number(burnPriceNew);
      if (!Number.isFinite(newPrice) || newPrice <= 0) return 'New burn price must be > 0';
      const desc = [
        `[SIGNAL] Adjust Burn-to-Looksmaxx price to ${newPrice.toLocaleString()} $MEGACHAD`,
        '',
        'This is a non-binding signal proposal. The burn amount is currently a frontend constant,',
        'not an on-chain parameter, so this vote records community intent only. If it passes, the',
        'team will update the frontend constant in a follow-up deploy.',
        '',
        description.trim() ? `Rationale:\n${description.trim()}` : '',
      ].filter(Boolean).join('\n');
      return {
        target: TESTNET_FRAMEMOGGER_ADDRESS,
        value: 0n,
        calldata: '0x',
        description: desc,
      };
    }

    // 'signal' — general-purpose signal-only proposal
    if (!description.trim()) return 'Description required';
    if (!signalTarget || !signalTarget.startsWith('0x') || signalTarget.length !== 42) {
      return 'Pick a signal target contract';
    }
    return {
      target: signalTarget,
      value: 0n,
      calldata: '0x',
      description: `[SIGNAL] ${description.trim()}`,
    };
  };

  const handlePropose = () => {
    const built = buildCall();
    if (typeof built === 'string') { setErrorMsg(built); return; }
    setErrorMsg('');
    setStatus('proposing');

    writePropose({
      address: TESTNET_JESTERMOGGER_ADDRESS,
      abi: JESTERMOGGER_ABI,
      functionName: 'propose',
      args: [[built.target], [built.value], [built.calldata], built.description],
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
      setAllocNew('');
      setBurnPriceNew('');
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
        <label className="beta-input-label">PROPOSAL TYPE</label>
        <select
          value={template}
          onChange={(e) => { setTemplate(e.target.value as TemplateKind); setErrorMsg(''); }}
          className="beta-input"
        >
          <option value="set-alloc">Set JesterGoonerV3 pool alloc point</option>
          <option value="signal-burn-price">Signal: adjust Burn-to-Looksmaxx price (non-binding)</option>
          <option value="signal">General signal / no-op (non-binding)</option>
          <option value="custom">Custom / advanced (raw calldata)</option>
        </select>
        <p className="beta-dim" style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
          Templates auto-build the target + calldata so you don&apos;t have to hand-encode anything.
          Signal proposals are non-binding votes that record community intent without executing on-chain state changes.
        </p>
      </div>

      {template === 'set-alloc' && (
        <div className="beta-info-box" style={{ marginBottom: '1rem' }}>
          <h4>SET POOL ALLOC POINT</h4>
          <p className="beta-dim" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            Calls <code>JesterGoonerV3.setAllocPoint(pid, newAllocPoint)</code>. Alloc points determine each pool&apos;s share of weekly $MEGAGOONER emissions.
            Note: this call is <code>onlyOwner</code> — it only succeeds on execute if the Jestermogger timelock owns JesterGoonerV3.
          </p>
          <div className="beta-input-group">
            <label className="beta-input-label">POOL</label>
            <select value={allocPid} onChange={(e) => setAllocPid(e.target.value)} className="beta-input">
              {POOL_LABELS.map((label, i) => <option key={i} value={i}>{label}</option>)}
            </select>
          </div>
          <div className="beta-input-group" style={{ marginTop: '0.5rem' }}>
            <label className="beta-input-label">NEW ALLOC POINT</label>
            <input
              type="number"
              min="1"
              value={allocNew}
              onChange={(e) => setAllocNew(e.target.value)}
              placeholder="e.g. 1000"
              className="beta-input"
            />
          </div>
        </div>
      )}

      {template === 'signal-burn-price' && (
        <div className="beta-info-box" style={{ marginBottom: '1rem' }}>
          <h4>ADJUST BURN-TO-LOOKSMAXX PRICE (SIGNAL)</h4>
          <p className="beta-dim" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            Non-binding. The burn amount is currently a frontend constant — this vote records community intent.
            If it passes, the team updates the constant in a follow-up frontend deploy.
          </p>
          <div className="beta-input-group">
            <label className="beta-input-label">NEW BURN PRICE ($MEGACHAD)</label>
            <input
              type="number"
              min="1"
              value={burnPriceNew}
              onChange={(e) => setBurnPriceNew(e.target.value)}
              placeholder="e.g. 150000"
              className="beta-input"
            />
          </div>
        </div>
      )}

      {template === 'signal' && (
        <div className="beta-info-box" style={{ marginBottom: '1rem' }}>
          <h4>GENERAL SIGNAL PROPOSAL</h4>
          <p className="beta-dim" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
            Non-binding vote on anything — direction, priorities, budget intent. Encodes no on-chain action.
            Pick a target contract as the &quot;subject&quot; of the signal (e.g. Framemogger for burn policy questions).
          </p>
          <div className="beta-input-group">
            <label className="beta-input-label">SIGNAL SUBJECT (TARGET CONTRACT)</label>
            <select
              value={signalTarget}
              onChange={(e) => setSignalTarget(e.target.value as `0x${string}`)}
              className="beta-input"
            >
              <option value="">— Pick one —</option>
              <option value={TESTNET_MEGACHAD_ADDRESS}>MEGACHAD token</option>
              <option value={TESTNET_MEGAGOONER_ADDRESS}>MEGAGOONER token</option>
              <option value={TESTNET_FRAMEMOGGER_ADDRESS}>Framemogger</option>
              <option value={TESTNET_JESTERGOONER_ADDRESS}>JesterGoonerV3</option>
              <option value={TESTNET_JESTERMOGGER_ADDRESS}>Jestermogger (governance)</option>
            </select>
          </div>
        </div>
      )}

      <div className="beta-input-group">
        <label className="beta-input-label">
          {template === 'set-alloc' ? 'DESCRIPTION (OPTIONAL — AUTO-GENERATED IF BLANK)' : 'PROPOSAL DESCRIPTION'}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            template === 'signal-burn-price'
              ? 'Optional rationale for the signal vote...'
              : template === 'set-alloc'
              ? 'Leave blank to auto-generate, or add rationale...'
              : 'Describe what this proposal does and why...'
          }
          className="beta-textarea"
          rows={4}
        />
      </div>

      {template === 'custom' && (
      <>
      <div className="beta-input-group">
        <label className="beta-input-label">TARGET CONTRACT ADDRESS</label>
        <input
          type="text"
          value={targetAddr}
          onChange={(e) => setTargetAddr(e.target.value)}
          placeholder="0x..."
          className="beta-input"
        />
        <div className="beta-info-box" style={{ marginTop: '0.5rem' }}>
          <p className="beta-dim" style={{ marginBottom: '0.5rem' }}>
            The target address should be whichever contract the proposal wants to interact with. Click any address to use it:
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', listStyle: 'none' }}>
            <li style={{ marginBottom: '0.4rem' }}>
              <div><strong>MEGACHAD token</strong> — token operations (e.g. transfer from treasury)</div>
              <code
                onClick={() => setTargetAddr(TESTNET_MEGACHAD_ADDRESS)}
                style={{ cursor: 'pointer', wordBreak: 'break-all' }}
              >{TESTNET_MEGACHAD_ADDRESS}</code>
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              <div><strong>MEGAGOONER token</strong> — governance token changes</div>
              <code
                onClick={() => setTargetAddr(TESTNET_MEGAGOONER_ADDRESS)}
                style={{ cursor: 'pointer', wordBreak: 'break-all' }}
              >{TESTNET_MEGAGOONER_ADDRESS}</code>
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              <div><strong>Framemogger</strong> — parameter changes to the burn mechanism</div>
              <code
                onClick={() => setTargetAddr(TESTNET_FRAMEMOGGER_ADDRESS)}
                style={{ cursor: 'pointer', wordBreak: 'break-all' }}
              >{TESTNET_FRAMEMOGGER_ADDRESS}</code>
            </li>
            <li style={{ marginBottom: '0.4rem' }}>
              <div><strong>JesterGoonerV3</strong> — staking parameter changes (e.g. <code>setAllocPoint</code>)</div>
              <code
                onClick={() => setTargetAddr(TESTNET_JESTERGOONER_ADDRESS)}
                style={{ cursor: 'pointer', wordBreak: 'break-all' }}
              >{TESTNET_JESTERGOONER_ADDRESS}</code>
            </li>
            <li><strong>Any external contract</strong> — governance can call arbitrary contracts</li>
          </ul>
        </div>
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
        <div className="beta-info-box" style={{ marginTop: '0.5rem' }}>
          <p className="beta-dim" style={{ marginBottom: '0.25rem' }}>
            Amount of native ETH (in <strong>wei</strong>) the timelock should forward with the call.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem' }}>
            <li>Leave as <code>0</code> for almost all proposals — token transfers, parameter changes, staking updates, etc.</li>
            <li>Only set &gt; 0 if the target function is <code>payable</code> and actually needs ETH (e.g. funding a contract, paying a fee).</li>
            <li>1 ETH = <code>1000000000000000000</code> wei (10<sup>18</sup>).</li>
          </ul>
        </div>
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
        <div className="beta-info-box" style={{ marginTop: '0.5rem' }}>
          <p className="beta-dim" style={{ marginBottom: '0.25rem' }}>
            ABI-encoded function call the timelock will execute on the target. Must start with <code>0x</code>.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem' }}>
            <li>Use <code>0x</code> for a no-op proposal (signal-only) or when calling a function with no arguments and no side effects.</li>
            <li>
              To build it, ABI-encode the function selector + args. Easiest options:
              <ul style={{ margin: '0.25rem 0 0.25rem 1rem' }}>
                <li>
                  <strong>viem</strong>:
                  {' '}<code>encodeFunctionData(&#123; abi, functionName: &quot;transfer&quot;, args: [to, amount] &#125;)</code>
                </li>
                <li><strong>ethers</strong>: <code>iface.encodeFunctionData(&quot;transfer&quot;, [to, amount])</code></li>
                <li><strong>cast</strong>: <code>cast calldata &quot;transfer(address,uint256)&quot; 0x... 1000000000000000000</code></li>
              </ul>
            </li>
            <li>
              Common examples:
              <ul style={{ margin: '0.25rem 0 0.25rem 1rem' }}>
                <li><strong>ERC20 transfer from treasury:</strong> target = MEGACHAD, calldata = <code>transfer(recipient, amount)</code></li>
                <li><strong>Change staking alloc point:</strong> target = JesterGoonerV3, calldata = <code>setAllocPoint(pid, newAllocPoint)</code></li>
                <li><strong>Update burn parameters:</strong> target = Framemogger, calldata = the relevant setter</li>
              </ul>
            </li>
            <li>Always double-check encoding on a tool like <code>cast</code> or 4byte.directory before submitting — a bad selector will revert on execute.</li>
          </ul>
        </div>
      </div>
      </>
      )}

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
