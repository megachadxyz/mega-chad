'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useSwitchChain,
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
  TESTNET_NFT_ADDRESS,
  TESTNET_BURN_ADDRESS,
  TESTNET_TREN_FUND_WALLET,
  TESTNET_BURN_AMOUNT,
  TESTNET_BURN_AMOUNT_DISPLAY,
  ERC20_ABI,
  FRAMEMOGGER_ABI,
  MOGGER_STAKING_ABI,
  JESTERGOONER_ABI,
  LP_ABI,
} from '@/lib/testnet-contracts';

// ── Helpers ──────────────────────────────────────────────
function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtBig(raw: bigint | undefined, decimals = 18): string {
  if (raw === undefined) return '—';
  return Number(formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Format APY percentage for display
function fmtAPY(apy: number | undefined): string {
  if (apy === undefined || apy <= 0) return '—';
  if (apy >= 1000) return `${(apy / 1000).toFixed(1)}k%`;
  if (apy >= 100) return `${apy.toFixed(0)}%`;
  return `${apy.toFixed(2)}%`;
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
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<ActiveTab>('burn');
  const [whitelisted, setWhitelisted] = useState(false);
  const onWrongChain = isConnected && walletChainId !== 6343;

  // Check whitelist on connect (only when on correct chain and address is stable)
  useEffect(() => {
    if (!address || onWrongChain) { setWhitelisted(false); return; }
    fetch(`/api/beta/whitelist?address=${address}`)
      .then((r) => r.json())
      .then((d) => setWhitelisted(d.whitelisted))
      .catch(() => setWhitelisted(false));
  }, [address, onWrongChain]);

  return (
    <div className="beta-page">
      {/* Hero */}
      <section className="beta-hero">
        <h1 className="beta-hero-title">MEGACHAD PROTOCOL</h1>
        <p className="beta-hero-subtitle">
          Testnet DeFi Suite — Burn, Stake, Govern
        </p>
        <div className="beta-chain-info">
          <span className="beta-chain-dot" />
          MegaETH Testnet (Chain 6343)
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
        ) : onWrongChain ? (
          <div className="beta-not-allowed">
            <div className="beta-lock-icon">&#9888;</div>
            <h3>WRONG NETWORK</h3>
            <p>Your wallet is on chain {walletChainId}. Please switch to MegaETH Testnet (Chain 6343).</p>
            <button
              className="beta-btn-primary"
              onClick={() => switchChain({ chainId: 6343 })}
              style={{ marginTop: '1rem' }}
            >
              SWITCH TO TESTNET
            </button>
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
// BURN TO LOOKSMAXX (Testnet)
// ═════════════════════════════════════════════════════════
function BurnSection({ address }: { address: `0x${string}` }) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'burning' | 'confirming' | 'burning2' | 'confirming2' | 'generating' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const HALF_AMOUNT = TESTNET_BURN_AMOUNT / 2n;

  // --- Transfer 1: burn to dead address ---
  const {
    writeContract: writeBurn,
    data: burnTxHash,
    error: burnWriteError,
    reset: resetBurn,
  } = useWriteContract();

  const { isSuccess: burnConfirmed, isError: burnFailed } =
    useWaitForTransactionReceipt({
      hash: burnTxHash,
      query: { enabled: !!burnTxHash },
    });

  // --- Transfer 2: send to tren fund ---
  const {
    writeContract: writeTren,
    data: trenTxHash,
    error: trenWriteError,
    reset: resetTren,
  } = useWriteContract();

  const { isSuccess: trenConfirmed, isError: trenFailed } =
    useWaitForTransactionReceipt({
      hash: trenTxHash,
      query: { enabled: !!trenTxHash },
    });

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

  // Handle write errors for transfer 1
  useEffect(() => {
    if (burnWriteError && status === 'burning') {
      setStatus('error');
      setErrorMsg(burnWriteError.message.includes('User rejected')
        ? 'Transaction rejected.'
        : burnWriteError.message.slice(0, 120));
    }
  }, [burnWriteError, status]);

  // Handle write errors for transfer 2
  useEffect(() => {
    if (trenWriteError && status === 'burning2') {
      setStatus('error');
      setErrorMsg(trenWriteError.message.includes('User rejected')
        ? 'Transaction rejected.'
        : trenWriteError.message.slice(0, 120));
    }
  }, [trenWriteError, status]);

  // When burn tx hash arrives, move to confirming
  useEffect(() => {
    if (burnTxHash && status === 'burning') {
      setStatus('confirming');
    }
  }, [burnTxHash, status]);

  // When burn confirmed, fire transfer 2
  useEffect(() => {
    if (burnConfirmed && status === 'confirming') {
      const timer = setTimeout(() => {
        setStatus('burning2');
        writeTren({
          address: TESTNET_MEGACHAD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TESTNET_TREN_FUND_WALLET, HALF_AMOUNT],
          gas: 500000n,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
    if (burnFailed && status === 'confirming') {
      setStatus('error');
      setErrorMsg('Burn transaction failed on-chain.');
    }
  }, [burnConfirmed, burnFailed, status]);

  // When tren tx hash arrives, move to confirming2
  useEffect(() => {
    if (trenTxHash && status === 'burning2') {
      setStatus('confirming2');
    }
  }, [trenTxHash, status]);

  // When tren transfer confirmed, simulate generation
  useEffect(() => {
    if (trenConfirmed && status === 'confirming2') {
      setStatus('generating');
      setTimeout(() => {
        setStatus('done');
        refetchBalance();
      }, 2000);
    }
    if (trenFailed && status === 'confirming2') {
      setStatus('error');
      setErrorMsg('Tren fund transfer failed on-chain.');
    }
  }, [trenConfirmed, trenFailed, status]);

  const startBurn = () => {
    if (!imageFile) { setErrorMsg('Upload an image first'); return; }
    if (balance !== undefined && balance < TESTNET_BURN_AMOUNT) {
      setErrorMsg(`Need ${TESTNET_BURN_AMOUNT_DISPLAY.toLocaleString()} $MEGACHAD`);
      return;
    }
    setStatus('burning');
    setErrorMsg('');
    resetBurn();
    resetTren();

    writeBurn({
      address: TESTNET_MEGACHAD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [TESTNET_BURN_ADDRESS, HALF_AMOUNT],
      gas: 500000n,
    });
  };

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
// FRAMEMOGGER (Send MEGACHAD to Tren Fund, Burn MEGAGOONER for deflation)
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
    address: TESTNET_NFT_ADDRESS,
    abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }] as const,
    functionName: 'balanceOf',
    args: [address],
  });

  // Write contracts
  const { writeContract: writeApproveMegachad, data: approveMegachadHash } = useWriteContract();
  const { isSuccess: approveMegachadConfirmed } = useWaitForTransactionReceipt({ hash: approveMegachadHash, query: { enabled: !!approveMegachadHash } });

  const { writeContract: writeApproveMegagooner, data: approveMegagoonerHash } = useWriteContract();
  const { isSuccess: approveMegagoonerConfirmed } = useWaitForTransactionReceipt({ hash: approveMegagoonerHash, query: { enabled: !!approveMegagoonerHash } });

  const { writeContract: writeBurn, data: burnHash } = useWriteContract();
  const { isSuccess: burnConfirmed } = useWaitForTransactionReceipt({ hash: burnHash, query: { enabled: !!burnHash } });

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
      setErrorMsg(`Insufficient $MEGAGOONER — need ${fmtBig(megagoonerRequired)} for deflation`); return;
    }
    setErrorMsg('');

    if (needsMegachadApproval) {
      setStatus('approving-megachad');
      writeApproveMegachad({
        address: TESTNET_MEGACHAD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_FRAMEMOGGER_ADDRESS, megachadRequired],
        gas: 500000n,
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
        gas: 500000n,
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
      gas: 500000n,
    }, {
      onError: () => { setStatus('error'); setErrorMsg('Framemogger transaction failed'); },
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
          gas: 500000n,
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
        <span className="beta-card-badge">SEND &rarr; DEFLATE</span>
      </div>
      <p className="beta-card-desc">
        Send $MEGACHAD to the Tren Fund for future ecosystem use, while permanently burning $MEGAGOONER
        for deflation. For every 1 $MEGACHAD sent, 0.25 $MEGAGOONER is destroyed (1:4 ratio).
        Requires 1+ Looksmaxxed NFT. Top 3 weekly senders earn the right to create governance proposals.
      </p>

      {/* How it works */}
      <div className="beta-info-box">
        <h4>HOW IT WORKS</h4>
        <ul>
          <li>$MEGACHAD is sent to the Tren Fund — not burned, reserved for future ecosystem use</li>
          <li>$MEGAGOONER is permanently burned at a 1:4 ratio (0.25 $MEGAGOONER per 1 $MEGACHAD sent)</li>
          <li>Requires holding at least 1 Looksmaxxed NFT to participate</li>
          <li>Top 3 weekly participants can submit governance proposals via Jestermogger</li>
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
        <label className="beta-input-label">AMOUNT ($MEGACHAD TO SEND)</label>
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
          <span>Requires: {fmtBig(burnReqs[0])} $MEGACHAD (to Tren Fund) + {fmtBig(burnReqs[1])} $MEGAGOONER (burned for deflation)</span>
        </div>
      )}

      {(status === 'approving-megachad' || status === 'approving-megagooner' || status === 'burning') && (
        <div className="beta-status">
          {status === 'approving-megachad' && 'Approving $MEGACHAD...'}
          {status === 'approving-megagooner' && 'Approving $MEGAGOONER for deflation burn...'}
          {status === 'burning' && 'Sending via Framemogger...'}
        </div>
      )}
      {status === 'done' && (
        <div className="beta-status success">Complete! $MEGACHAD sent to Tren Fund, $MEGAGOONER deflated.</div>
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
        {needsMegachadApproval || needsMegagoonerApproval ? 'APPROVE & SEND' : 'SEND $MEGACHAD'}
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
  const { data: megachadBalance, refetch: refetchBalance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_MOGGER_STAKING_ADDRESS],
  });

  // Staker info: (staked, effectiveStake, pendingReward, multiplier, nftCount)
  const { data: stakerInfo, refetch: refetchStaker } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });

  // Global stats: (totalStaked, totalEffectiveStake, currentWeek, weeklyEmission, rewardsRemaining)
  const { data: globalStats } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getGlobalStats',
  });

  // Earned
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: TESTNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'earned',
    args: [address],
  });

  // LP reserves for APY calculation
  const { data: lpReserves } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'getReserves',
  });

  // Compute APY from weekly emission and LP price
  // MEGAGOONER price in MEGACHAD = reserveMEGACHAD / reserveMEGAGOONER
  // APY = (weeklyEmission * 52 * goonerPrice / totalEffectiveStake) * 100
  const stakingAPY = (() => {
    if (!globalStats || !lpReserves) return undefined;
    const totalEffective = Number(formatUnits(globalStats[1], 18));
    const weeklyEmission = Number(formatUnits(globalStats[3], 18));
    if (totalEffective <= 0 || weeklyEmission <= 0) return undefined;
    const reserveA = Number(formatUnits(lpReserves[0], 18));
    const reserveB = Number(formatUnits(lpReserves[1], 18));
    if (reserveA <= 0 || reserveB <= 0) return undefined;
    // LP is MEGACHAD(tokenA) / MEGAGOONER(tokenB) → price = reserveA / reserveB
    const goonerPrice = reserveA / reserveB;
    return (weeklyEmission * 52 * goonerPrice / totalEffective) * 100;
  })();

  // Write contracts
  const { writeContract: writeApprove, data: approveHash, reset: resetApprove } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: !!approveHash } });

  const { writeContract: writeStake, data: stakeHash, reset: resetStake } = useWriteContract();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash, query: { enabled: !!stakeHash } });

  const { writeContract: writeClaim, data: claimHash, reset: resetClaim } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  const handleStakeUnstake = () => {
    if (!amount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    setErrorMsg('');
    resetApprove();
    resetStake();

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
          gas: 500000n,
        });
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
        gas: 500000n,
      });
    }
  };

  const executeStake = () => {
    setStatus('staking');
    writeStake({
      address: TESTNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'stake',
      args: [parsedAmount],
      gas: 500000n,
    });
  };

  const handleClaim = () => {
    resetClaim();
    setStatus('claiming');
    writeClaim({
      address: TESTNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'claimRewards',
      gas: 500000n,
    });
  };

  useEffect(() => {
    if (approveConfirmed && status === 'approving') executeStake();
  }, [approveConfirmed, status]);

  useEffect(() => {
    if (stakeConfirmed && (status === 'staking' || status === 'unstaking')) {
      setStatus('done');
      setAmount('');
      refetchStaker();
      refetchBalance();
      refetchAllowance();
    }
  }, [stakeConfirmed, status]);

  useEffect(() => {
    if (claimConfirmed && status === 'claiming') {
      setStatus('done');
      refetchStaker();
      refetchEarned();
    }
  }, [claimConfirmed, status]);

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>MOGGER STAKING</h2>
        <span className="beta-card-badge">STAKE &rarr; EARN</span>
      </div>
      <p className="beta-card-desc">
        Stake $MEGACHAD to earn $MEGAGOONER rewards. No lock period — unstake anytime.
      </p>

      {/* NFT Requirement + Boost explanation */}
      <div className="beta-info-box beta-info-warning">
        <h4>LOOKSMAXXED NFT REQUIRED</h4>
        <p>You must hold at least 1 Looksmaxxed NFT to be eligible for any emissions. No NFT = no rewards.</p>
      </div>
      <div className="beta-info-box">
        <h4>NFT EMISSIONS BOOST</h4>
        <p>More NFTs increase your effective stake and rewards:</p>
        <ul>
          <li><strong>Tier 1 (1-9 NFTs):</strong> 1.0x base multiplier</li>
          <li><strong>Tier 2 (10-24 NFTs):</strong> 1.075x multiplier</li>
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
          <span className="beta-stat-label">APY</span>
          <span className="beta-stat-value">{fmtAPY(stakingAPY)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">WEEKLY EMISSION</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[3]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">WEEK</span>
          <span className="beta-stat-value">{globalStats ? `${Number(globalStats[2])} / 225` : '—'}</span>
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
          <span className="beta-stat-value">{stakerInfo ? `${(Number(stakerInfo[3]) / 10000).toFixed(2)}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">NFT COUNT</span>
          <span className="beta-stat-value">{stakerInfo ? Number(stakerInfo[4]).toString() : '—'}</span>
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
  const [status, setStatus] = useState<'idle' | 'approving' | 'approving-b' | 'adding' | 'removing' | 'staking' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [liqPanel, setLiqPanel] = useState<'none' | 'add' | 'remove'>('none');
  const [liqAmountA, setLiqAmountA] = useState('');
  const [removeLiqAmount, setRemoveLiqAmount] = useState('');

  // Token balances
  const { data: megachadBalance, refetch: refetchMegachadBal } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: megagoonerBalance, refetch: refetchGoonerBal } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // LP balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_JESTERGOONER_ADDRESS],
  });

  // Approvals for LP contract (for addLiquidity)
  const { data: megachadAllowanceLP } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_LP_TOKEN_ADDRESS],
  });

  const { data: megagoonerAllowanceLP } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_LP_TOKEN_ADDRESS],
  });

  // Staker info: (staked, effectiveStake, pendingReward, multiplier, nftCount)
  const { data: stakerInfo, refetch: refetchStaker } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });

  // Global stats: (totalStaked, totalEffectiveStake, currentWeek, weeklyEmission, rewardsRemaining)
  const { data: globalStats } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getGlobalStats',
  });

  // Earned
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'earned',
    args: [address],
  });

  // LP reserves for APY + ratio calculation
  const { data: lpReserves } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'getReserves',
  });

  const { data: lpTotalSupply } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'totalSupply',
  });

  // Pool ratio: MEGAGOONER per MEGACHAD
  const poolRatio = lpReserves && lpReserves[0] > 0n
    ? Number(formatUnits(lpReserves[1], 18)) / Number(formatUnits(lpReserves[0], 18))
    : 0.05; // fallback 20:1

  // Auto-calc MEGAGOONER amount from MEGACHAD input
  const parsedLiqA = liqAmountA ? parseUnits(liqAmountA, 18) : 0n;
  const liqAmountB = liqAmountA && Number(liqAmountA) > 0
    ? (Number(liqAmountA) * poolRatio).toFixed(6)
    : '';
  const parsedLiqB = liqAmountB ? parseUnits(liqAmountB, 18) : 0n;

  // Remove liquidity: estimate tokens returned
  const parsedRemoveLiq = removeLiqAmount ? parseUnits(removeLiqAmount, 18) : 0n;
  const removeEstimate = (() => {
    if (!lpReserves || !lpTotalSupply || parsedRemoveLiq <= 0n || lpTotalSupply <= 0n) return null;
    const share = Number(formatUnits(parsedRemoveLiq, 18)) / Number(formatUnits(lpTotalSupply, 18));
    const estA = Number(formatUnits(lpReserves[0], 18)) * share;
    const estB = Number(formatUnits(lpReserves[1], 18)) * share;
    return { megachad: estA, megagooner: estB };
  })();

  const lpStakingAPY = (() => {
    if (!globalStats || !lpReserves || !lpTotalSupply) return undefined;
    const totalEffective = Number(formatUnits(globalStats[1], 18));
    const weeklyEmission = Number(formatUnits(globalStats[3], 18));
    if (totalEffective <= 0 || weeklyEmission <= 0) return undefined;
    const reserveA = Number(formatUnits(lpReserves[0], 18));
    const reserveB = Number(formatUnits(lpReserves[1], 18));
    const totalLP = Number(formatUnits(lpTotalSupply, 18));
    if (reserveA <= 0 || reserveB <= 0 || totalLP <= 0) return undefined;
    const goonerPrice = reserveA / reserveB;
    const lpValuePerToken = (2 * reserveA) / totalLP;
    const effectiveValue = totalEffective * lpValuePerToken;
    return (weeklyEmission * 52 * goonerPrice / effectiveValue) * 100;
  })();

  // Write contracts
  const { writeContract: writeApprove, data: approveHash, reset: resetApprove } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: !!approveHash } });

  const { writeContract: writeApproveB, data: approveBHash, reset: resetApproveB } = useWriteContract();
  const { isSuccess: approveBConfirmed } = useWaitForTransactionReceipt({ hash: approveBHash, query: { enabled: !!approveBHash } });

  const { writeContract: writeAddLiq, data: addLiqHash, reset: resetAddLiq } = useWriteContract();
  const { isSuccess: addLiqConfirmed } = useWaitForTransactionReceipt({ hash: addLiqHash, query: { enabled: !!addLiqHash } });

  const { writeContract: writeRemoveLiq, data: removeLiqHash, reset: resetRemoveLiq } = useWriteContract();
  const { isSuccess: removeLiqConfirmed } = useWaitForTransactionReceipt({ hash: removeLiqHash, query: { enabled: !!removeLiqHash } });

  const { writeContract: writeStake, data: stakeHash, reset: resetStake } = useWriteContract();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash, query: { enabled: !!stakeHash } });

  const { writeContract: writeClaim, data: claimHash, reset: resetClaim } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  // ── Add Liquidity flow ──
  const handleAddLiquidity = () => {
    if (parsedLiqA <= 0n || parsedLiqB <= 0n) { setErrorMsg('Enter an amount'); return; }
    if (megachadBalance !== undefined && parsedLiqA > megachadBalance) { setErrorMsg('Insufficient $MEGACHAD'); return; }
    if (megagoonerBalance !== undefined && parsedLiqB > megagoonerBalance) { setErrorMsg('Insufficient $MEGAGOONER'); return; }
    setErrorMsg('');
    resetApprove();
    resetApproveB();
    resetAddLiq();

    const needsApproveA = megachadAllowanceLP !== undefined && megachadAllowanceLP < parsedLiqA;
    const needsApproveBToken = megagoonerAllowanceLP !== undefined && megagoonerAllowanceLP < parsedLiqB;

    if (needsApproveA) {
      setStatus('approving');
      writeApprove({
        address: TESTNET_MEGACHAD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_LP_TOKEN_ADDRESS, parsedLiqA],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else if (needsApproveBToken) {
      setStatus('approving-b');
      writeApproveB({
        address: TESTNET_MEGAGOONER_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_LP_TOKEN_ADDRESS, parsedLiqB],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else {
      executeAddLiquidity();
    }
  };

  const executeApproveB = () => {
    const needsApproveBToken = megagoonerAllowanceLP !== undefined && megagoonerAllowanceLP < parsedLiqB;
    if (needsApproveBToken) {
      setStatus('approving-b');
      writeApproveB({
        address: TESTNET_MEGAGOONER_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_LP_TOKEN_ADDRESS, parsedLiqB],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else {
      executeAddLiquidity();
    }
  };

  const executeAddLiquidity = () => {
    setStatus('adding');
    writeAddLiq({
      address: TESTNET_LP_TOKEN_ADDRESS,
      abi: LP_ABI,
      functionName: 'addLiquidity',
      args: [parsedLiqA, parsedLiqB, address],
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Add liquidity failed'); } });
  };

  // ── Remove Liquidity flow ──
  const handleRemoveLiquidity = () => {
    if (parsedRemoveLiq <= 0n) { setErrorMsg('Enter an amount'); return; }
    if (lpBalance !== undefined && parsedRemoveLiq > lpBalance) { setErrorMsg('Insufficient LP balance'); return; }
    setErrorMsg('');
    resetRemoveLiq();
    setStatus('removing');
    writeRemoveLiq({
      address: TESTNET_LP_TOKEN_ADDRESS,
      abi: LP_ABI,
      functionName: 'removeLiquidity',
      args: [parsedRemoveLiq, address],
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Remove liquidity failed'); } });
  };

  // Chain: approveA → approveB → addLiquidity
  useEffect(() => {
    if (approveConfirmed && status === 'approving' && liqPanel === 'add') executeApproveB();
  }, [approveConfirmed, status, liqPanel]);

  useEffect(() => {
    if (approveBConfirmed && status === 'approving-b') executeAddLiquidity();
  }, [approveBConfirmed, status]);

  useEffect(() => {
    if (addLiqConfirmed && status === 'adding') {
      setStatus('done');
      setLiqAmountA('');
      refetchLpBalance();
      refetchMegachadBal();
      refetchGoonerBal();
    }
  }, [addLiqConfirmed, status]);

  useEffect(() => {
    if (removeLiqConfirmed && status === 'removing') {
      setStatus('done');
      setRemoveLiqAmount('');
      refetchLpBalance();
      refetchMegachadBal();
      refetchGoonerBal();
    }
  }, [removeLiqConfirmed, status]);

  // ── Stake / Unstake flow ──
  const handleStakeUnstake = () => {
    if (!amount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    setErrorMsg('');
    resetApprove();
    resetStake();

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
          gas: 2000000n,
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
        address: TESTNET_JESTERGOONER_ADDRESS,
        abi: JESTERGOONER_ABI,
        functionName: 'unstake',
        args: [parsedAmount],
        gas: 2000000n,
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
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Stake failed'); } });
  };

  const handleClaim = () => {
    resetClaim();
    setStatus('claiming');
    writeClaim({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_ABI,
      functionName: 'claimRewards',
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Claim failed'); } });
  };

  // Stake approve → stake chain (only when not in add-liq panel)
  useEffect(() => {
    if (approveConfirmed && status === 'approving' && liqPanel !== 'add') executeStake();
  }, [approveConfirmed, status, liqPanel]);

  useEffect(() => {
    if (stakeConfirmed && (status === 'staking' || status === 'unstaking')) {
      setStatus('done');
      setAmount('');
      refetchStaker();
      refetchEarned();
      refetchLpBalance();
      refetchAllowance();
    }
  }, [stakeConfirmed, status]);

  useEffect(() => {
    if (claimConfirmed && status === 'claiming') {
      setStatus('done');
      refetchStaker();
      refetchEarned();
    }
  }, [claimConfirmed, status]);

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>JESTERGOONER</h2>
        <span className="beta-card-badge">LP STAKING</span>
      </div>
      <p className="beta-card-desc">
        Stake MEGACHAD/MEGAGOONER LP tokens to earn $MEGAGOONER rewards. No lock period — stake and unstake freely.
        Receives 60% of weekly $MEGAGOONER emissions.
      </p>

      {/* NFT Requirement */}
      <div className="beta-info-box beta-info-warning">
        <h4>LOOKSMAXXED NFT REQUIRED</h4>
        <p>You must hold at least 1 Looksmaxxed NFT to be eligible for any emissions. No NFT = no rewards.</p>
      </div>

      {/* NFT Boost explanation */}
      <div className="beta-info-box">
        <h4>NFT BOOST MULTIPLIERS</h4>
        <p>Looksmaxxed NFT holdings increase your effective stake:</p>
        <ul>
          <li><strong>Tier 1 (1-9 NFTs):</strong> 1.0x base</li>
          <li><strong>Tier 2 (10-24 NFTs):</strong> 1.075x</li>
          <li><strong>Tier 3 (25+ NFTs):</strong> 1.15x</li>
        </ul>
      </div>

      {/* Global stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL LP STAKED</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[0]) : '—'} LP</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">APY</span>
          <span className="beta-stat-value">{fmtAPY(lpStakingAPY)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">WEEKLY EMISSION</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[3]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">WEEK</span>
          <span className="beta-stat-value">{globalStats ? `${Number(globalStats[2])} / 225` : '—'}</span>
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
          <span className="beta-stat-label">NFT MULTIPLIER</span>
          <span className="beta-stat-value">{stakerInfo ? `${(Number(stakerInfo[3]) / 10000).toFixed(2)}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">LP BALANCE</span>
          <span className="beta-stat-value">{fmtBig(lpBalance)} LP</span>
        </div>
      </div>

      {/* Claim */}
      {earned !== undefined && earned > 0n && (
        <button className="beta-btn-secondary" onClick={handleClaim} disabled={isBusy}>
          CLAIM {fmtBig(earned)} $MEGAGOONER
        </button>
      )}

      {/* ── Liquidity Management ── */}
      <div style={{ margin: '1.5rem 0 0.5rem', borderTop: '1px solid rgba(247,134,198,0.2)', paddingTop: '1rem' }}>
        <div className="beta-toggle-row">
          <button
            className={`beta-toggle${liqPanel === 'add' ? ' active' : ''}`}
            onClick={() => { setLiqPanel(liqPanel === 'add' ? 'none' : 'add'); setErrorMsg(''); setStatus('idle'); }}
          >
            ADD LIQUIDITY
          </button>
          <button
            className={`beta-toggle${liqPanel === 'remove' ? ' active' : ''}`}
            onClick={() => { setLiqPanel(liqPanel === 'remove' ? 'none' : 'remove'); setErrorMsg(''); setStatus('idle'); }}
          >
            REMOVE LIQUIDITY
          </button>
        </div>
      </div>

      {liqPanel === 'add' && (
        <div style={{ padding: '1rem', border: '1px solid rgba(247,134,198,0.15)', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p className="beta-card-desc" style={{ marginBottom: '0.75rem' }}>
            Deposit $MEGACHAD and $MEGAGOONER in the current pool ratio to receive LP tokens.
          </p>

          <div className="beta-stat-row" style={{ marginBottom: '0.75rem' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">POOL RATIO</span>
              <span className="beta-stat-value">1 MEGACHAD = {poolRatio.toFixed(4)} MEGAGOONER</span>
            </div>
          </div>

          <div className="beta-input-group">
            <label className="beta-input-label">$MEGACHAD AMOUNT</label>
            <div className="beta-input-row">
              <input
                type="number"
                value={liqAmountA}
                onChange={(e) => setLiqAmountA(e.target.value)}
                placeholder="0.0"
                className="beta-input"
                min="0"
              />
              <button
                className="beta-btn-max"
                onClick={() => {
                  if (megachadBalance) setLiqAmountA(formatUnits(megachadBalance, 18));
                }}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="beta-input-group" style={{ marginTop: '0.5rem' }}>
            <label className="beta-input-label">$MEGAGOONER AMOUNT (auto)</label>
            <div className="beta-input-row">
              <input
                type="text"
                value={liqAmountB}
                readOnly
                placeholder="—"
                className="beta-input"
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>

          <div className="beta-stat-row" style={{ margin: '0.5rem 0' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">YOUR $MEGACHAD</span>
              <span className="beta-stat-value">{fmtBig(megachadBalance)}</span>
            </div>
            <div className="beta-stat">
              <span className="beta-stat-label">YOUR $MEGAGOONER</span>
              <span className="beta-stat-value">{fmtBig(megagoonerBalance)}</span>
            </div>
          </div>

          <button
            className="beta-btn-primary"
            onClick={handleAddLiquidity}
            disabled={isBusy || parsedLiqA <= 0n}
          >
            {status === 'approving' ? 'APPROVING $MEGACHAD...'
              : status === 'approving-b' ? 'APPROVING $MEGAGOONER...'
              : status === 'adding' ? 'ADDING LIQUIDITY...'
              : 'ADD LIQUIDITY'}
          </button>
        </div>
      )}

      {liqPanel === 'remove' && (
        <div style={{ padding: '1rem', border: '1px solid rgba(247,134,198,0.15)', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p className="beta-card-desc" style={{ marginBottom: '0.75rem' }}>
            Burn LP tokens to withdraw your $MEGACHAD and $MEGAGOONER from the pool.
          </p>

          <div className="beta-input-group">
            <label className="beta-input-label">LP TOKENS TO REMOVE</label>
            <div className="beta-input-row">
              <input
                type="number"
                value={removeLiqAmount}
                onChange={(e) => setRemoveLiqAmount(e.target.value)}
                placeholder="0.0"
                className="beta-input"
                min="0"
              />
              <button
                className="beta-btn-max"
                onClick={() => {
                  if (lpBalance) setRemoveLiqAmount(formatUnits(lpBalance, 18));
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {removeEstimate && (
            <div className="beta-stat-row" style={{ margin: '0.75rem 0' }}>
              <div className="beta-stat">
                <span className="beta-stat-label">YOU RECEIVE (EST.)</span>
                <span className="beta-stat-value">{removeEstimate.megachad.toFixed(2)} $MEGACHAD</span>
              </div>
              <div className="beta-stat">
                <span className="beta-stat-label">&nbsp;</span>
                <span className="beta-stat-value">{removeEstimate.megagooner.toFixed(2)} $MEGAGOONER</span>
              </div>
            </div>
          )}

          <div className="beta-stat-row" style={{ margin: '0.5rem 0' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">YOUR LP BALANCE</span>
              <span className="beta-stat-value">{fmtBig(lpBalance)} LP</span>
            </div>
          </div>

          <button
            className="beta-btn-primary"
            onClick={handleRemoveLiquidity}
            disabled={isBusy || parsedRemoveLiq <= 0n}
          >
            {status === 'removing' ? 'REMOVING LIQUIDITY...' : 'REMOVE LIQUIDITY'}
          </button>
        </div>
      )}

      {/* ── Stake / Unstake ── */}
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
          {status === 'approving' && liqPanel !== 'add' && 'Approving LP tokens...'}
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
        disabled={isBusy}
      >
        {needsApproval ? `APPROVE & ${action.toUpperCase()}` : action === 'stake' ? 'STAKE LP' : 'UNSTAKE LP'}
      </button>
    </div>
  );
}
