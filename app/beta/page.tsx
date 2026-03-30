'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  TESTNET_MEGACHAD_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  TESTNET_FRAMEMOGGER_ADDRESS,
  TESTNET_MOGGER_STAKING_ADDRESS,
  TESTNET_JESTERGOONER_ADDRESS,
  TESTNET_LP_TOKEN_ADDRESS,
  TESTNET_BURN_ADDRESS,
  TESTNET_TREN_FUND_WALLET,
  TESTNET_BURN_AMOUNT,
  TESTNET_BURN_AMOUNT_DISPLAY,
  ERC20_ABI,
  FRAMEMOGGER_ABI,
  MOGGER_STAKING_ABI,
  JESTERGOONER_ABI,
} from '@/lib/testnet-contracts';

// ── Helpers ──────────────────────────────────────────────
function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtBig(raw: bigint | undefined, decimals = 18): string {
  if (raw === undefined) return '—';
  return Number(formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtCountdown(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

type ActiveTab = 'burn' | 'framemogger' | 'staking' | 'lp-staking';

// ═════════════════════════════════════════════════════════
export default function BetaProtocol() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<ActiveTab>('burn');
  const [whitelisted, setWhitelisted] = useState(false);

  // Check whitelist on connect
  useEffect(() => {
    if (!address) { setWhitelisted(false); return; }
    fetch(`/api/beta/whitelist?address=${address}`)
      .then((r) => r.json())
      .then((d) => setWhitelisted(d.whitelisted))
      .catch(() => setWhitelisted(false));
  }, [address]);

  return (
    <div className="beta-page">
      {/* Hero */}
      <section className="beta-hero">
        <h1 className="beta-hero-title">MEGA PROTOCOL</h1>
        <p className="beta-hero-subtitle">
          Testnet DeFi Suite — Burn, Stake, Govern
        </p>
        <div className="beta-chain-info">
          <span className="beta-chain-dot" />
          MegaETH Testnet (Chain 6342)
        </div>
      </section>

      {/* Tab navigation */}
      <div className="beta-tabs">
        <button
          className={`beta-tab${activeTab === 'burn' ? ' active' : ''}`}
          onClick={() => setActiveTab('burn')}
        >
          BURN TO LOOKSMAXX
        </button>
        <button
          className={`beta-tab${activeTab === 'framemogger' ? ' active' : ''}`}
          onClick={() => setActiveTab('framemogger')}
        >
          FRAMEMOGGER
        </button>
        <button
          className={`beta-tab${activeTab === 'staking' ? ' active' : ''}`}
          onClick={() => setActiveTab('staking')}
        >
          MOGGER STAKING
        </button>
        <button
          className={`beta-tab${activeTab === 'lp-staking' ? ' active' : ''}`}
          onClick={() => setActiveTab('lp-staking')}
        >
          JESTERGOONER
        </button>
      </div>

      {/* Tab content */}
      <div className="beta-content">
        {!isConnected ? (
          <div className="beta-connect-prompt">
            <p>Connect your wallet to interact with the testnet protocol.</p>
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
            <FaucetSection address={address!} />
            {activeTab === 'burn' && <BurnSection address={address!} />}
            {activeTab === 'framemogger' && <FramemoggerSection address={address!} />}
            {activeTab === 'staking' && <StakingSection address={address!} />}
            {activeTab === 'lp-staking' && <LPStakingSection address={address!} />}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// TESTNET FAUCET
// ═════════════════════════════════════════════════════════
function FaucetSection({ address }: { address: `0x${string}` }) {
  const [megachadStatus, setMegachadStatus] = useState<'idle' | 'dripping' | 'done' | 'error'>('idle');
  const [megagoonerStatus, setMegagoonerStatus] = useState<'idle' | 'dripping' | 'done' | 'error'>('idle');
  const [megachadMsg, setMegachadMsg] = useState('');
  const [megagoonerMsg, setMegagoonerMsg] = useState('');

  const { data: megachadBalance, refetch: refetchMegachad } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: megagoonerBalance, refetch: refetchMegagooner } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const drip = async (token: 'megachad' | 'megagooner') => {
    const setStatus = token === 'megachad' ? setMegachadStatus : setMegagoonerStatus;
    const setMsg = token === 'megachad' ? setMegachadMsg : setMegagoonerMsg;

    setStatus('dripping');
    setMsg('');

    try {
      const res = await fetch('/api/beta/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, token }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('done');
        setMsg(`Received ${data.amount} ${data.token}`);
        refetchMegachad();
        refetchMegagooner();
      } else {
        setStatus('error');
        setMsg(data.error || 'Faucet error');
      }
    } catch {
      setStatus('error');
      setMsg('Network error');
    }
  };

  return (
    <div className="beta-card beta-faucet">
      <div className="beta-card-header">
        <h2>TESTNET FAUCET</h2>
        <span className="beta-card-badge">FREE TOKENS</span>
      </div>
      <p className="beta-card-desc">
        Claim testnet tokens to interact with the protocol. 1M $MEGACHAD and 10K $MEGAGOONER per drip. 24h cooldown per token.
      </p>

      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGACHAD</span>
          <span className="beta-stat-value">{fmtBig(megachadBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGAGOONER</span>
          <span className="beta-stat-value">{fmtBig(megagoonerBalance)}</span>
        </div>
      </div>

      <div className="beta-faucet-buttons">
        <div className="beta-faucet-col">
          <button
            className="beta-btn-faucet megachad"
            onClick={() => drip('megachad')}
            disabled={megachadStatus === 'dripping'}
          >
            {megachadStatus === 'dripping' ? 'DRIPPING...' : 'DRIP $MEGACHAD'}
          </button>
          {megachadMsg && (
            <span className={`beta-faucet-msg ${megachadStatus === 'error' ? 'error' : 'success'}`}>
              {megachadMsg}
            </span>
          )}
        </div>
        <div className="beta-faucet-col">
          <button
            className="beta-btn-faucet megagooner"
            onClick={() => drip('megagooner')}
            disabled={megagoonerStatus === 'dripping'}
          >
            {megagoonerStatus === 'dripping' ? 'DRIPPING...' : 'DRIP $MEGAGOONER'}
          </button>
          {megagoonerMsg && (
            <span className={`beta-faucet-msg ${megagoonerStatus === 'error' ? 'error' : 'success'}`}>
              {megagoonerMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// BURN TO LOOKSMAXX (Testnet)
// ═════════════════════════════════════════════════════════
function BurnSection({ address }: { address: `0x${string}` }) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'burning' | 'confirming' | 'burning2' | 'confirming2' | 'generating' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: balance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { writeContract: writeBurn, data: burnHash } = useWriteContract();
  const { isSuccess: burnConfirmed } = useWaitForTransactionReceipt({ hash: burnHash });

  const { writeContract: writeTren, data: trenHash } = useWriteContract();
  const { isSuccess: trenConfirmed } = useWaitForTransactionReceipt({ hash: trenHash });

  const halfBurn = TESTNET_BURN_AMOUNT / 2n;

  // Image handler
  const handleImage = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      setErrorMsg('Only JPEG/PNG accepted');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Max 4MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  // Step 1: Burn to dead address
  const startBurn = () => {
    if (!imageFile) { setErrorMsg('Upload an image first'); return; }
    if (balance !== undefined && balance < TESTNET_BURN_AMOUNT) {
      setErrorMsg(`Need ${TESTNET_BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`);
      return;
    }
    setStatus('burning');
    setErrorMsg('');
    writeBurn({
      address: TESTNET_MEGACHAD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [TESTNET_BURN_ADDRESS, halfBurn],
    }, {
      onError: () => { setStatus('error'); setErrorMsg('Burn transaction rejected'); },
    });
  };

  // Step 2: Transfer to tren fund
  useEffect(() => {
    if (burnConfirmed && status === 'burning') {
      setStatus('burning2');
      writeTren({
        address: TESTNET_MEGACHAD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TESTNET_TREN_FUND_WALLET, halfBurn],
      }, {
        onError: () => { setStatus('error'); setErrorMsg('Tren fund transfer rejected'); },
      });
    }
  }, [burnConfirmed]);

  // Step 3: Mock generation (testnet — no actual AI generation)
  useEffect(() => {
    if (trenConfirmed && status === 'burning2') {
      setStatus('generating');
      // Simulate generation delay for testnet
      setTimeout(() => setStatus('done'), 2000);
    }
  }, [trenConfirmed]);

  const statusLabels: Record<string, string> = {
    idle: '',
    burning: 'Signing burn transaction (1/2)...',
    confirming: 'Waiting for burn confirmation...',
    burning2: 'Signing tren fund transfer (2/2)...',
    confirming2: 'Waiting for transfer confirmation...',
    generating: 'LOOKSMAXXING IN PROCESS... (testnet simulation)',
    done: 'Testnet burn complete!',
    error: errorMsg || 'Something went wrong.',
  };

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>BURN TO LOOKSMAXX</h2>
        <span className="beta-card-badge">TESTNET</span>
      </div>
      <p className="beta-card-desc">
        Burn {TESTNET_BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD to generate an AI-enhanced portrait.
        {' '}(112,500 burned + 112,500 to tren fund)
      </p>

      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR BALANCE</span>
          <span className="beta-stat-value">{fmtBig(balance)} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">BURN COST</span>
          <span className="beta-stat-value">{TESTNET_BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD</span>
        </div>
      </div>

      {/* Image upload */}
      <div
        className="beta-upload-zone"
        onClick={() => document.getElementById('beta-burn-upload')?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('dragover');
          const f = e.dataTransfer.files[0];
          if (f) handleImage(f);
        }}
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Preview" className="beta-upload-preview" />
        ) : (
          <div className="beta-upload-placeholder">
            <span>DROP IMAGE OR CLICK TO UPLOAD</span>
            <span className="beta-dim">JPEG/PNG, max 4MB</span>
          </div>
        )}
        <input
          id="beta-burn-upload"
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); }}
        />
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div className={`beta-status ${status === 'error' ? 'error' : status === 'done' ? 'success' : ''}`}>
          {statusLabels[status]}
        </div>
      )}
      {errorMsg && status === 'idle' && (
        <div className="beta-status error">{errorMsg}</div>
      )}

      {/* Action */}
      <button
        className="beta-btn-primary"
        onClick={startBurn}
        disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
      >
        {status === 'done' ? 'BURN AGAIN' : 'BURN TO LOOKSMAXX'}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// FRAMEMOGGER (Send MEGACHAD to Tren Fund + Burn MEGAGOONER)
// ═════════════════════════════════════════════════════════
function FramemoggerSection({ address }: { address: `0x${string}` }) {
  const [burnAmount, setBurnAmount] = useState('');

  // Balances
  const { data: megachadBalance, refetch: refetchMegachad } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: megagoonerBalance, refetch: refetchMegagooner } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // Allowance checks (both tokens need approval)
  const { data: megachadAllowance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_FRAMEMOGGER_ADDRESS],
  });

  const { data: megagoonerAllowance } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_FRAMEMOGGER_ADDRESS],
  });

  // Burn requirements (how much MEGACHAD + MEGAGOONER needed)
  const parsedAmount = burnAmount ? parseUnits(burnAmount, 18) : 0n;
  const { data: burnReqs } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'getBurnRequirements',
    args: [parsedAmount],
    query: { enabled: parsedAmount > 0n },
  });

  // Week info
  const { data: weekInfo } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'getCurrentWeekInfo',
  });

  // Top 3 burners
  const { data: top3 } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'getCurrentTop3',
  });

  // Can propose
  const { data: canPropose } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'canPropose',
    args: [address],
  });

  // User weekly burns
  const { data: userBurns } = useReadContract({
    address: TESTNET_FRAMEMOGGER_ADDRESS,
    abi: FRAMEMOGGER_ABI,
    functionName: 'getUserWeeklyBurns',
    args: weekInfo ? [weekInfo[0], address] : undefined,
    query: { enabled: !!weekInfo },
  });

  // NFT count for requirement display
  const { data: nftBalance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS, // placeholder — will be NFT contract
    abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }] as const,
    functionName: 'balanceOf',
    args: [address],
  });

  // Write contracts
  const { writeContract: writeApproveMegachad, data: approveMegachadHash } = useWriteContract();
  const { isSuccess: approveMegachadConfirmed } = useWaitForTransactionReceipt({ hash: approveMegachadHash });

  const { writeContract: writeApproveMegagooner, data: approveMegagoonerHash } = useWriteContract();
  const { isSuccess: approveMegagoonerConfirmed } = useWaitForTransactionReceipt({ hash: approveMegagoonerHash });

  const { writeContract: writeBurn, data: burnHash } = useWriteContract();
  const { isSuccess: burnConfirmed } = useWaitForTransactionReceipt({ hash: burnHash });

  const [status, setStatus] = useState<'idle' | 'approving-megachad' | 'approving-megagooner' | 'burning' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const megachadRequired = burnReqs ? burnReqs[0] : 0n;
  const megagoonerRequired = burnReqs ? burnReqs[1] : 0n;
  const needsMegachadApproval = megachadAllowance !== undefined && megachadRequired > 0n && megachadAllowance < megachadRequired;
  const needsMegagoonerApproval = megagoonerAllowance !== undefined && megagoonerRequired > 0n && megagoonerAllowance < megagoonerRequired;

  const handleBurn = () => {
    if (!burnAmount || parsedAmount <= 0n) {
      setErrorMsg('Enter an amount'); return;
    }
    if (megachadBalance !== undefined && megachadRequired > megachadBalance) {
      setErrorMsg('Insufficient $MEGACHAD balance'); return;
    }
    if (megagoonerBalance !== undefined && megagoonerRequired > megagoonerBalance) {
      setErrorMsg(`Insufficient $MEGAGOONER — need ${fmtBig(megagoonerRequired)} for deflation burn`); return;
    }
    setErrorMsg('');

    if (needsMegachadApproval) {
      setStatus('approving-megachad');
      writeApproveMegachad({
        address: TESTNET_MEGACHAD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_FRAMEMOGGER_ADDRESS, megachadRequired],
      }, {
        onError: () => { setStatus('error'); setErrorMsg('$MEGACHAD approval rejected'); },
      });
    } else if (needsMegagoonerApproval) {
      setStatus('approving-megagooner');
      writeApproveMegagooner({
        address: TESTNET_MEGAGOONER_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_FRAMEMOGGER_ADDRESS, megagoonerRequired],
      }, {
        onError: () => { setStatus('error'); setErrorMsg('$MEGAGOONER approval rejected'); },
      });
    } else {
      executeBurn();
    }
  };

  const executeBurn = () => {
    setStatus('burning');
    writeBurn({
      address: TESTNET_FRAMEMOGGER_ADDRESS,
      abi: FRAMEMOGGER_ABI,
      functionName: 'burnMEGACHAD',
      args: [parsedAmount],
    }, {
      onError: () => { setStatus('error'); setErrorMsg('Burn transaction failed'); },
    });
  };

  // Chain approvals: MEGACHAD → MEGAGOONER → burn
  useEffect(() => {
    if (approveMegachadConfirmed && status === 'approving-megachad') {
      if (needsMegagoonerApproval) {
        setStatus('approving-megagooner');
        writeApproveMegagooner({
          address: TESTNET_MEGAGOONER_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TESTNET_FRAMEMOGGER_ADDRESS, megagoonerRequired],
        }, {
          onError: () => { setStatus('error'); setErrorMsg('$MEGAGOONER approval rejected'); },
        });
      } else {
        executeBurn();
      }
    }
  }, [approveMegachadConfirmed]);

  useEffect(() => {
    if (approveMegagoonerConfirmed && status === 'approving-megagooner') executeBurn();
  }, [approveMegagoonerConfirmed]);

  useEffect(() => {
    if (burnConfirmed && status === 'burning') {
      setStatus('done');
      setBurnAmount('');
      refetchMegachad();
      refetchMegagooner();
    }
  }, [burnConfirmed]);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!weekInfo) return;
    const endTime = Number(weekInfo[2]);
    const update = () => setTimeLeft(Math.max(0, endTime - Math.floor(Date.now() / 1000)));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [weekInfo]);

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>FRAMEMOGGER</h2>
        <span className="beta-card-badge">BURN &rarr; DEFLATE</span>
      </div>
      <p className="beta-card-desc">
        Send $MEGACHAD to the Tren Fund and burn $MEGAGOONER for deflation. For every 1 $MEGACHAD burned,
        0.25 $MEGAGOONER is permanently destroyed (1:4 ratio). Requires 1+ Looksmaxxed NFT.
        Top 3 weekly burners earn the right to create governance proposals.
      </p>

      {/* How it works */}
      <div className="beta-info-box">
        <h4>HOW IT WORKS</h4>
        <ul>
          <li>$MEGACHAD is sent to the Tren Fund (economic commitment)</li>
          <li>$MEGAGOONER is burned at a 1:4 ratio (0.25 $MEGAGOONER per 1 $MEGACHAD)</li>
          <li>Requires holding at least 1 Looksmaxxed NFT to participate</li>
          <li>Top 3 weekly burners can submit governance proposals via Jestermogger</li>
        </ul>
      </div>

      {/* Week info */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">CURRENT WEEK</span>
          <span className="beta-stat-value">{weekInfo ? Number(weekInfo[0]).toString() : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TIME REMAINING</span>
          <span className="beta-stat-value">{fmtCountdown(timeLeft)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL BURNED THIS WEEK</span>
          <span className="beta-stat-value">{weekInfo ? fmtBig(weekInfo[3]) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">UNIQUE BURNERS</span>
          <span className="beta-stat-value">{weekInfo ? Number(weekInfo[4]).toString() : '—'}</span>
        </div>
      </div>

      {/* Top 3 */}
      <div className="beta-top3">
        <h3>TOP 3 BURNERS THIS WEEK</h3>
        <div className="beta-top3-list">
          {top3 && top3[0].map((burner: string, i: number) => (
            <div key={i} className="beta-top3-item">
              <span className="beta-top3-rank">#{i + 1}</span>
              <span className="beta-top3-addr">
                {burner === '0x0000000000000000000000000000000000000000' ? '—' : truncAddr(burner)}
              </span>
              <span className="beta-top3-amount">{fmtBig(top3[1][i])} $MEGACHAD</span>
            </div>
          ))}
        </div>
      </div>

      {/* User stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGACHAD</span>
          <span className="beta-stat-value">{fmtBig(megachadBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGAGOONER</span>
          <span className="beta-stat-value">{fmtBig(megagoonerBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR BURNS THIS WEEK</span>
          <span className="beta-stat-value">{userBurns !== undefined ? fmtBig(userBurns) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">CAN PROPOSE</span>
          <span className={`beta-stat-value ${canPropose ? 'text-green' : ''}`}>
            {canPropose ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {/* Burn input */}
      <div className="beta-input-group">
        <label className="beta-input-label">BURN AMOUNT ($MEGACHAD)</label>
        <div className="beta-input-row">
          <input
            type="number"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            placeholder="0.0"
            className="beta-input"
            min="0"
          />
          <button
            className="beta-btn-max"
            onClick={() => megachadBalance && setBurnAmount(formatUnits(megachadBalance, 18))}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Requirements preview */}
      {parsedAmount > 0n && burnReqs && (
        <div className="beta-requirements">
          <span>Requires: {fmtBig(burnReqs[0])} $MEGACHAD + {fmtBig(burnReqs[1])} $MEGAGOONER (deflation burn)</span>
        </div>
      )}

      {(status === 'approving-megachad' || status === 'approving-megagooner' || status === 'burning') && (
        <div className="beta-status">
          {status === 'approving-megachad' && 'Approving $MEGACHAD...'}
          {status === 'approving-megagooner' && 'Approving $MEGAGOONER for deflation burn...'}
          {status === 'burning' && 'Burning via Framemogger...'}
        </div>
      )}
      {status === 'done' && (
        <div className="beta-status success">Burn complete! $MEGACHAD sent to Tren Fund, $MEGAGOONER deflated.</div>
      )}
      {status === 'error' && (
        <div className="beta-status error">{errorMsg || 'Transaction failed'}</div>
      )}
      {errorMsg && status === 'idle' && (
        <div className="beta-status error">{errorMsg}</div>
      )}

      <button
        className="beta-btn-primary"
        onClick={handleBurn}
        disabled={status === 'approving-megachad' || status === 'approving-megagooner' || status === 'burning'}
      >
        {needsMegachadApproval || needsMegagoonerApproval ? 'APPROVE & BURN' : 'BURN $MEGACHAD'}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// MOGGER STAKING (Stake MEGACHAD → Earn MEGAGOONER)
// ═════════════════════════════════════════════════════════
function StakingSection({ address }: { address: `0x${string}` }) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<'idle' | 'approving' | 'staking' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Balances
  const { data: megachadBalance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: allowance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_MOGGER_STAKING_ADDRESS],
  });

  // Staker info
  const { data: stakerInfo, refetch: refetchStaker } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });

  // Global stats
  const { data: globalStats } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getGlobalStats',
  });

  // Earned
  const { data: earned } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'earned',
    args: [address],
  });

  // Write contracts
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: writeStake, data: stakeHash } = useWriteContract();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  const handleStakeUnstake = () => {
    if (!amount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    setErrorMsg('');

    if (action === 'stake') {
      if (megachadBalance !== undefined && parsedAmount > megachadBalance) {
        setErrorMsg('Insufficient balance'); return;
      }
      if (needsApproval) {
        setStatus('approving');
        writeApprove({
          address: TESTNET_MEGACHAD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TESTNET_MOGGER_STAKING_ADDRESS, parsedAmount],
        }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
      } else {
        executeStake();
      }
    } else {
      if (stakerInfo && parsedAmount > stakerInfo[0]) {
        setErrorMsg('Cannot unstake more than staked'); return;
      }
      setStatus('unstaking');
      writeStake({
        address: TESTNET_MOGGER_STAKING_ADDRESS,
        abi: MOGGER_STAKING_ABI,
        functionName: 'unstake',
        args: [parsedAmount],
      }, { onError: () => { setStatus('error'); setErrorMsg('Unstake failed'); } });
    }
  };

  const executeStake = () => {
    setStatus('staking');
    writeStake({
      address: TESTNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'stake',
      args: [parsedAmount],
    }, { onError: () => { setStatus('error'); setErrorMsg('Stake failed'); } });
  };

  const handleClaim = () => {
    setStatus('claiming');
    writeClaim({
      address: TESTNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'claimRewards',
    }, { onError: () => { setStatus('error'); setErrorMsg('Claim failed'); } });
  };

  useEffect(() => {
    if (approveConfirmed && status === 'approving') executeStake();
  }, [approveConfirmed]);

  useEffect(() => {
    if (stakeConfirmed && (status === 'staking' || status === 'unstaking')) {
      setStatus('done');
      setAmount('');
      refetchStaker();
    }
  }, [stakeConfirmed]);

  useEffect(() => {
    if (claimConfirmed && status === 'claiming') {
      setStatus('done');
      refetchStaker();
    }
  }, [claimConfirmed]);

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>MOGGER STAKING</h2>
        <span className="beta-card-badge">STAKE &rarr; EARN</span>
      </div>
      <p className="beta-card-desc">
        Stake $MEGACHAD to earn $MEGAGOONER rewards. No lock period — unstake anytime.
      </p>

      {/* NFT Boost explanation */}
      <div className="beta-info-box">
        <h4>NFT EMISSIONS BOOST</h4>
        <p>Holding Looksmaxxed NFTs increases your effective stake and rewards:</p>
        <ul>
          <li><strong>Tier 1 (0 NFTs):</strong> 1.0x base multiplier</li>
          <li><strong>Tier 2 (10+ NFTs):</strong> 1.075x multiplier</li>
          <li><strong>Tier 3 (25+ NFTs):</strong> 1.15x multiplier</li>
        </ul>
        <p>Your effective stake = staked amount &times; NFT multiplier. Higher effective stake = more $MEGAGOONER rewards per second.</p>
      </div>

      {/* Global stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL STAKED</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[0]) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL REWARDS DISTRIBUTED</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[1]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">REWARD RATE</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[2]) : '—'}/sec</span>
        </div>
      </div>

      {/* Your position */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR STAKED</span>
          <span className="beta-stat-value">{stakerInfo ? fmtBig(stakerInfo[0]) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">PENDING REWARDS</span>
          <span className="beta-stat-value highlight">{fmtBig(earned)} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">NFT MULTIPLIER</span>
          <span className="beta-stat-value">{stakerInfo ? `${Number(stakerInfo[3]) / 100}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">EFFECTIVE STAKE</span>
          <span className="beta-stat-value">{stakerInfo ? fmtBig(stakerInfo[4]) : '—'}</span>
        </div>
      </div>

      {/* Claim rewards */}
      {earned !== undefined && earned > 0n && (
        <button className="beta-btn-secondary" onClick={handleClaim} disabled={status === 'claiming'}>
          CLAIM {fmtBig(earned)} $MEGAGOONER
        </button>
      )}

      {/* Stake / Unstake toggle */}
      <div className="beta-toggle-row">
        <button
          className={`beta-toggle${action === 'stake' ? ' active' : ''}`}
          onClick={() => setAction('stake')}
        >
          STAKE
        </button>
        <button
          className={`beta-toggle${action === 'unstake' ? ' active' : ''}`}
          onClick={() => setAction('unstake')}
        >
          UNSTAKE
        </button>
      </div>

      <div className="beta-input-group">
        <label className="beta-input-label">
          {action === 'stake' ? 'STAKE AMOUNT ($MEGACHAD)' : 'UNSTAKE AMOUNT ($MEGACHAD)'}
        </label>
        <div className="beta-input-row">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="beta-input"
            min="0"
          />
          <button
            className="beta-btn-max"
            onClick={() => {
              if (action === 'stake' && megachadBalance) setAmount(formatUnits(megachadBalance, 18));
              if (action === 'unstake' && stakerInfo) setAmount(formatUnits(stakerInfo[0], 18));
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {status !== 'idle' && status !== 'done' && (
        <div className={`beta-status ${status === 'error' ? 'error' : ''}`}>
          {status === 'approving' && 'Approving $MEGACHAD...'}
          {status === 'staking' && 'Staking $MEGACHAD...'}
          {status === 'unstaking' && 'Unstaking $MEGACHAD...'}
          {status === 'claiming' && 'Claiming $MEGAGOONER rewards...'}
          {status === 'error' && (errorMsg || 'Transaction failed')}
        </div>
      )}
      {status === 'done' && <div className="beta-status success">Transaction confirmed!</div>}
      {errorMsg && status === 'idle' && <div className="beta-status error">{errorMsg}</div>}

      <button
        className="beta-btn-primary"
        onClick={handleStakeUnstake}
        disabled={status === 'approving' || status === 'staking' || status === 'unstaking'}
      >
        {needsApproval ? `APPROVE & ${action.toUpperCase()}` : action.toUpperCase()}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// JESTERGOONER (Stake MEGACHAD/MEGAGOONER LP → Earn MEGAGOONER)
// ═════════════════════════════════════════════════════════
function LPStakingSection({ address }: { address: `0x${string}` }) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<'idle' | 'approving' | 'staking' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // LP balance
  const { data: lpBalance } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: allowance } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_JESTERGOONER_ADDRESS],
  });

  // Staker info
  const { data: stakerInfo, refetch: refetchStaker } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });

  // Can unstake
  const { data: canUnstake } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'canUnstake',
    args: [address],
  });

  // Global stats
  const { data: globalStats } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getGlobalStats',
  });

  // Earned
  const { data: earned } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'earned',
    args: [address],
  });

  // Write contracts
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: writeStake, data: stakeHash } = useWriteContract();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  const handleStakeUnstake = () => {
    if (!amount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    setErrorMsg('');

    if (action === 'stake') {
      if (lpBalance !== undefined && parsedAmount > lpBalance) {
        setErrorMsg('Insufficient LP balance'); return;
      }
      if (needsApproval) {
        setStatus('approving');
        writeApprove({
          address: TESTNET_LP_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TESTNET_JESTERGOONER_ADDRESS, parsedAmount],
        }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
      } else {
        executeStake();
      }
    } else {
      if (!canUnstake) {
        setErrorMsg('Lock period has not ended yet'); return;
      }
      if (stakerInfo && parsedAmount > stakerInfo[0]) {
        setErrorMsg('Cannot unstake more than staked'); return;
      }
      setStatus('unstaking');
      writeStake({
        address: TESTNET_JESTERGOONER_ADDRESS,
        abi: JESTERGOONER_ABI,
        functionName: 'unstake',
        args: [parsedAmount],
      }, { onError: () => { setStatus('error'); setErrorMsg('Unstake failed'); } });
    }
  };

  const executeStake = () => {
    setStatus('staking');
    writeStake({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_ABI,
      functionName: 'stake',
      args: [parsedAmount],
    }, { onError: () => { setStatus('error'); setErrorMsg('Stake failed'); } });
  };

  const handleClaim = () => {
    setStatus('claiming');
    writeClaim({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_ABI,
      functionName: 'claimRewards',
    }, { onError: () => { setStatus('error'); setErrorMsg('Claim failed'); } });
  };

  useEffect(() => {
    if (approveConfirmed && status === 'approving') executeStake();
  }, [approveConfirmed]);

  useEffect(() => {
    if (stakeConfirmed && (status === 'staking' || status === 'unstaking')) {
      setStatus('done');
      setAmount('');
      refetchStaker();
    }
  }, [stakeConfirmed]);

  useEffect(() => {
    if (claimConfirmed && status === 'claiming') {
      setStatus('done');
      refetchStaker();
    }
  }, [claimConfirmed]);

  // Lock countdown
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  useEffect(() => {
    if (!stakerInfo) return;
    const lockEnd = Number(stakerInfo[2]);
    if (lockEnd === 0) return;
    const update = () => setLockTimeLeft(Math.max(0, lockEnd - Math.floor(Date.now() / 1000)));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [stakerInfo]);

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>JESTERGOONER</h2>
        <span className="beta-card-badge">LP STAKING</span>
      </div>
      <p className="beta-card-desc">
        Stake MEGACHAD/MEGAGOONER LP tokens to earn $MEGAGOONER rewards. 4-week minimum lock period.
        Receives 40% of weekly $MEGAGOONER emissions.
      </p>

      {/* NFT + Time Boost explanation */}
      <div className="beta-info-box">
        <h4>BOOST MULTIPLIERS</h4>
        <p><strong>NFT Boost</strong> — Looksmaxxed NFT holdings increase your effective stake:</p>
        <ul>
          <li><strong>Tier 1 (0 NFTs):</strong> 1.0x base</li>
          <li><strong>Tier 2 (10+ NFTs):</strong> 1.075x</li>
          <li><strong>Tier 3 (25+ NFTs):</strong> 1.15x</li>
        </ul>
        <p><strong>Time Boost</strong> — The longer you stake, the higher your time multiplier grows, further increasing your effective stake and share of rewards.</p>
      </div>

      {/* Global stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL LP STAKED</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[0]) : '—'} LP</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL REWARDS</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[1]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">REWARD RATE</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[2]) : '—'}/sec</span>
        </div>
      </div>

      {/* Your position */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR LP STAKED</span>
          <span className="beta-stat-value">{stakerInfo ? fmtBig(stakerInfo[0]) : '—'} LP</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">PENDING REWARDS</span>
          <span className="beta-stat-value highlight">{fmtBig(earned)} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">LOCK STATUS</span>
          <span className={`beta-stat-value ${canUnstake ? 'text-green' : 'text-orange'}`}>
            {stakerInfo && stakerInfo[0] > 0n
              ? canUnstake ? 'UNLOCKED' : `LOCKED (${fmtCountdown(lockTimeLeft)})`
              : 'NO POSITION'}
          </span>
        </div>
      </div>

      {/* Multipliers */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">NFT MULTIPLIER</span>
          <span className="beta-stat-value">{stakerInfo ? `${Number(stakerInfo[4]) / 100}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TIME MULTIPLIER</span>
          <span className="beta-stat-value">{stakerInfo ? `${Number(stakerInfo[5]) / 100}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">EFFECTIVE STAKE</span>
          <span className="beta-stat-value">{stakerInfo ? fmtBig(stakerInfo[6]) : '—'}</span>
        </div>
      </div>

      {/* Claim */}
      {earned !== undefined && earned > 0n && (
        <button className="beta-btn-secondary" onClick={handleClaim} disabled={status === 'claiming'}>
          CLAIM {fmtBig(earned)} $MEGAGOONER
        </button>
      )}

      {/* Toggle */}
      <div className="beta-toggle-row">
        <button
          className={`beta-toggle${action === 'stake' ? ' active' : ''}`}
          onClick={() => setAction('stake')}
        >
          STAKE LP
        </button>
        <button
          className={`beta-toggle${action === 'unstake' ? ' active' : ''}`}
          onClick={() => setAction('unstake')}
        >
          UNSTAKE LP
        </button>
      </div>

      <div className="beta-input-group">
        <label className="beta-input-label">
          {action === 'stake' ? 'STAKE AMOUNT (LP)' : 'UNSTAKE AMOUNT (LP)'}
        </label>
        <div className="beta-input-row">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="beta-input"
            min="0"
          />
          <button
            className="beta-btn-max"
            onClick={() => {
              if (action === 'stake' && lpBalance) setAmount(formatUnits(lpBalance, 18));
              if (action === 'unstake' && stakerInfo) setAmount(formatUnits(stakerInfo[0], 18));
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {status !== 'idle' && status !== 'done' && (
        <div className={`beta-status ${status === 'error' ? 'error' : ''}`}>
          {status === 'approving' && 'Approving LP tokens...'}
          {status === 'staking' && 'Staking LP tokens...'}
          {status === 'unstaking' && 'Unstaking LP tokens...'}
          {status === 'claiming' && 'Claiming $MEGAGOONER rewards...'}
          {status === 'error' && (errorMsg || 'Transaction failed')}
        </div>
      )}
      {status === 'done' && <div className="beta-status success">Transaction confirmed!</div>}
      {errorMsg && status === 'idle' && <div className="beta-status error">{errorMsg}</div>}

      <button
        className="beta-btn-primary"
        onClick={handleStakeUnstake}
        disabled={status === 'approving' || status === 'staking' || status === 'unstaking'}
      >
        {needsApproval ? `APPROVE & ${action.toUpperCase()}` : action === 'stake' ? 'STAKE LP' : 'UNSTAKE LP'}
      </button>
    </div>
  );
}
