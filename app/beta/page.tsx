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
  TESTNET_JESTERGOONER_V1_ADDRESS,
  JESTERGOONER_V1_ABI,
  TESTNET_JESTERGOONER_V2_ADDRESS,
  TESTNET_LP_ETH_ADDRESS,
  TESTNET_LP_USDM_ADDRESS,
  TESTNET_WETH_ADDRESS,
  TESTNET_USDM_ADDRESS,
  JESTERGOONER_V3_ABI,
  WETH_ABI,
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

type ActiveTab = 'burn' | 'framemogger' | 'staking' | 'lp-staking' | 'swap';

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
        <button
          className={`beta-tab${activeTab === 'swap' ? ' active' : ''}`}
          onClick={() => setActiveTab('swap')}
        >
          SWAP
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
            {activeTab === 'swap' && <SwapSection address={address!} />}
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

  const [status, setStatus] = useState<'idle' | 'approving-megachad' | 'approving-megagooner' | 'burning' | 'minting' | 'done' | 'error'>('idle');
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
    if (burnConfirmed && status === 'burning' && burnHash) {
      // Burn confirmed — now mint the testnet NFT
      setStatus('minting');
      fetch('/api/beta/mint-nft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, burnTxHash: burnHash }),
      })
        .then((res) => res.json())
        .then(() => {
          setStatus('done');
          setBurnAmount('');
          refetchMegachad();
          refetchMegagooner();
        })
        .catch(() => {
          // NFT mint failed but burn succeeded — still mark done
          setStatus('done');
          setBurnAmount('');
          refetchMegachad();
          refetchMegagooner();
          setErrorMsg('Burn succeeded but NFT mint failed — contact team');
        });
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

      {(status === 'approving-megachad' || status === 'approving-megagooner' || status === 'burning' || status === 'minting') && (
        <div className="beta-status">
          {status === 'approving-megachad' && 'Approving $MEGACHAD...'}
          {status === 'approving-megagooner' && 'Approving $MEGAGOONER for deflation burn...'}
          {status === 'burning' && 'Sending via Framemogger...'}
          {status === 'minting' && 'Minting Looksmaxxed NFT...'}
        </div>
      )}
      {status === 'done' && (
        <div className="beta-status success">Complete! $MEGACHAD sent to Tren Fund, $MEGAGOONER deflated, NFT minted.</div>
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
        disabled={status === 'approving-megachad' || status === 'approving-megagooner' || status === 'burning' || status === 'minting'}
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
// JESTERGOONER (Multi-Pool LP Staking → Earn MEGAGOONER)
// ═════════════════════════════════════════════════════════

const POOL_CONFIG = [
  { pid: 0, name: 'MEGACHAD / MEGAGOONER', lpAddress: TESTNET_LP_TOKEN_ADDRESS, tokenBAddress: TESTNET_MEGAGOONER_ADDRESS, tokenBSymbol: 'MEGAGOONER', isEth: false },
  { pid: 1, name: 'MEGACHAD / ETH', lpAddress: TESTNET_LP_ETH_ADDRESS, tokenBAddress: TESTNET_WETH_ADDRESS, tokenBSymbol: 'ETH', isEth: true },
  { pid: 2, name: 'MEGACHAD / USDm', lpAddress: TESTNET_LP_USDM_ADDRESS, tokenBAddress: TESTNET_USDM_ADDRESS, tokenBSymbol: 'USDm', isEth: false },
] as const;

function LPStakingSection({ address }: { address: `0x${string}` }) {
  const [selectedPool, setSelectedPool] = useState(0);
  const pool = POOL_CONFIG[selectedPool];

  // ── State ──
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<'idle' | 'approving' | 'approving-b' | 'adding' | 'removing' | 'wrapping' | 'staking' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [liqPanel, setLiqPanel] = useState<'none' | 'add' | 'remove'>('none');
  const [liqAmountA, setLiqAmountA] = useState('');
  const [removeLiqAmount, setRemoveLiqAmount] = useState('');

  // ── Token balances ──
  const { data: megachadBalance, refetch: refetchMegachadBal } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
  });
  const { data: tokenBBalance, refetch: refetchTokenBBal } = useReadContract({
    address: pool.tokenBAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
  });

  // LP token balance (for this pool)
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: pool.lpAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
  });

  // ── Allowances ──
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: pool.lpAddress, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, TESTNET_JESTERGOONER_ADDRESS],
  });
  const { data: megachadAllowanceLP } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, pool.lpAddress],
  });
  const { data: tokenBAllowanceLP } = useReadContract({
    address: pool.tokenBAddress, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, pool.lpAddress],
  });

  // ── V3 contract reads (pid-based) ──
  const { data: poolInfoData } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getPoolInfo',
    args: [BigInt(selectedPool)],
  });
  const { data: userInfoData, refetch: refetchStaker } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getUserInfo',
    args: [BigInt(selectedPool), address],
  });
  const { data: globalStats } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getGlobalStats',
  });
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'earned',
    args: [BigInt(selectedPool), address],
  });
  const { data: earnedAll } = useReadContract({
    address: TESTNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'earnedAll',
    args: [address],
  });

  // ── LP reserves for ratio/APY ──
  const { data: lpReserves } = useReadContract({
    address: pool.lpAddress, abi: LP_ABI, functionName: 'getReserves',
  });
  const { data: lpTotalSupply } = useReadContract({
    address: pool.lpAddress, abi: LP_ABI, functionName: 'totalSupply',
  });

  // ── Computed values ──
  const poolRatio = lpReserves && lpReserves[0] > 0n
    ? Number(formatUnits(lpReserves[1], 18)) / Number(formatUnits(lpReserves[0], 18))
    : 0.05;
  const parsedLiqA = liqAmountA ? parseUnits(liqAmountA, 18) : 0n;
  const liqAmountB = liqAmountA && Number(liqAmountA) > 0 ? (Number(liqAmountA) * poolRatio).toFixed(6) : '';
  const parsedLiqB = liqAmountB ? parseUnits(liqAmountB, 18) : 0n;
  const parsedRemoveLiq = removeLiqAmount ? parseUnits(removeLiqAmount, 18) : 0n;
  const removeEstimate = (() => {
    if (!lpReserves || !lpTotalSupply || parsedRemoveLiq <= 0n || lpTotalSupply <= 0n) return null;
    const share = Number(formatUnits(parsedRemoveLiq, 18)) / Number(formatUnits(lpTotalSupply, 18));
    return { tokenA: Number(formatUnits(lpReserves[0], 18)) * share, tokenB: Number(formatUnits(lpReserves[1], 18)) * share };
  })();
  const poolAllocPct = poolInfoData ? Number(poolInfoData[1]) / 100 : 0;
  const poolWeeklyEmission = poolInfoData ? poolInfoData[4] : undefined;

  // ── Write hooks ──
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
  const { writeContract: writeWrap, data: wrapHash, reset: resetWrap } = useWriteContract();
  const { isSuccess: wrapConfirmed } = useWaitForTransactionReceipt({ hash: wrapHash, query: { enabled: !!wrapHash } });

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  // ── Add Liquidity flow ──
  const handleAddLiquidity = () => {
    if (parsedLiqA <= 0n || parsedLiqB <= 0n) { setErrorMsg('Enter an amount'); return; }
    if (megachadBalance !== undefined && parsedLiqA > megachadBalance) { setErrorMsg('Insufficient $MEGACHAD'); return; }
    // For ETH pool, check native ETH balance is handled by wrapping step
    if (!pool.isEth && tokenBBalance !== undefined && parsedLiqB > tokenBBalance) { setErrorMsg(`Insufficient $${pool.tokenBSymbol}`); return; }
    setErrorMsg('');
    resetApprove();
    resetApproveB();
    resetAddLiq();
    resetWrap();

    // For ETH pool: wrap ETH → WETH first
    if (pool.isEth) {
      setStatus('wrapping');
      writeWrap({
        address: TESTNET_WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: 'deposit',
        value: parsedLiqB,
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('ETH wrap failed'); } });
      return;
    }

    startApproveChain();
  };

  const startApproveChain = () => {
    const needsApproveA = megachadAllowanceLP !== undefined && megachadAllowanceLP < parsedLiqA;
    const needsApproveBToken = tokenBAllowanceLP !== undefined && tokenBAllowanceLP < parsedLiqB;

    if (needsApproveA) {
      setStatus('approving');
      writeApprove({
        address: TESTNET_MEGACHAD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [pool.lpAddress, parsedLiqA],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else if (needsApproveBToken) {
      setStatus('approving-b');
      writeApproveB({
        address: pool.tokenBAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [pool.lpAddress, parsedLiqB],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else {
      executeAddLiquidity();
    }
  };

  const executeApproveB = () => {
    const needsApproveBToken = tokenBAllowanceLP !== undefined && tokenBAllowanceLP < parsedLiqB;
    if (needsApproveBToken) {
      setStatus('approving-b');
      writeApproveB({
        address: pool.tokenBAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [pool.lpAddress, parsedLiqB],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else {
      executeAddLiquidity();
    }
  };

  const executeAddLiquidity = () => {
    setStatus('adding');
    writeAddLiq({
      address: pool.lpAddress,
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
      address: pool.lpAddress,
      abi: LP_ABI,
      functionName: 'removeLiquidity',
      args: [parsedRemoveLiq, address],
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Remove liquidity failed'); } });
  };

  // Chain: wrap → approveA → approveB → addLiquidity
  useEffect(() => {
    if (wrapConfirmed && status === 'wrapping') startApproveChain();
  }, [wrapConfirmed, status]);

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
      refetchTokenBBal();
    }
  }, [addLiqConfirmed, status]);

  useEffect(() => {
    if (removeLiqConfirmed && status === 'removing') {
      setStatus('done');
      setRemoveLiqAmount('');
      refetchLpBalance();
      refetchMegachadBal();
      refetchTokenBBal();
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
          address: pool.lpAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TESTNET_JESTERGOONER_ADDRESS, parsedAmount],
          gas: 2000000n,
        }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
      } else {
        executeStake();
      }
    } else {
      if (userInfoData && parsedAmount > userInfoData[0]) {
        setErrorMsg('Cannot unstake more than staked'); return;
      }
      setStatus('unstaking');
      writeStake({
        address: TESTNET_JESTERGOONER_ADDRESS,
        abi: JESTERGOONER_V3_ABI,
        functionName: 'unstake',
        args: [BigInt(selectedPool), parsedAmount],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Unstake failed'); } });
    }
  };

  const executeStake = () => {
    setStatus('staking');
    writeStake({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_V3_ABI,
      functionName: 'stake',
      args: [BigInt(selectedPool), parsedAmount],
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Stake failed'); } });
  };

  const handleClaim = () => {
    resetClaim();
    setStatus('claiming');
    writeClaim({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_V3_ABI,
      functionName: 'claimRewards',
      args: [BigInt(selectedPool)],
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Claim failed'); } });
  };

  const handleClaimAll = () => {
    resetClaim();
    setStatus('claiming');
    writeClaim({
      address: TESTNET_JESTERGOONER_ADDRESS,
      abi: JESTERGOONER_V3_ABI,
      functionName: 'claimAllRewards',
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Claim all failed'); } });
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

  // ── V1 Migration: old JesterGooner with lock periods ──
  const { data: v1StakerInfo, refetch: refetchV1Staker } = useReadContract({
    address: TESTNET_JESTERGOONER_V1_ADDRESS,
    abi: JESTERGOONER_V1_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });
  const { data: v1Earned, refetch: refetchV1Earned } = useReadContract({
    address: TESTNET_JESTERGOONER_V1_ADDRESS,
    abi: JESTERGOONER_V1_ABI,
    functionName: 'earned',
    args: [address],
  });
  const { writeContract: writeV1Unstake, data: v1UnstakeHash, reset: resetV1Unstake } = useWriteContract();
  const { isSuccess: v1UnstakeConfirmed } = useWaitForTransactionReceipt({ hash: v1UnstakeHash, query: { enabled: !!v1UnstakeHash } });
  const { writeContract: writeV1Claim, data: v1ClaimHash, reset: resetV1Claim } = useWriteContract();
  const { isSuccess: v1ClaimConfirmed } = useWaitForTransactionReceipt({ hash: v1ClaimHash, query: { enabled: !!v1ClaimHash } });

  const v1Staked = v1StakerInfo ? v1StakerInfo[0] : 0n;
  const v1LockEnd = v1StakerInfo ? Number(v1StakerInfo[2]) : 0;
  const v1CanUnstake = v1StakerInfo ? v1StakerInfo[6] : false;
  const [v1Status, setV1Status] = useState<'idle' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [v1Error, setV1Error] = useState('');

  // ── V2 Migration: old JesterGooner V2 (single pool, no lock) ──
  const { data: v2StakerInfo, refetch: refetchV2Staker } = useReadContract({
    address: TESTNET_JESTERGOONER_V2_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });
  const { data: v2Earned, refetch: refetchV2Earned } = useReadContract({
    address: TESTNET_JESTERGOONER_V2_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'earned',
    args: [address],
  });
  const { writeContract: writeV2Unstake, data: v2UnstakeHash, reset: resetV2Unstake } = useWriteContract();
  const { isSuccess: v2UnstakeConfirmed } = useWaitForTransactionReceipt({ hash: v2UnstakeHash, query: { enabled: !!v2UnstakeHash } });
  const { writeContract: writeV2Claim, data: v2ClaimHash, reset: resetV2Claim } = useWriteContract();
  const { isSuccess: v2ClaimConfirmed } = useWaitForTransactionReceipt({ hash: v2ClaimHash, query: { enabled: !!v2ClaimHash } });

  const v2Staked = v2StakerInfo ? v2StakerInfo[0] : 0n;
  const [v2Status, setV2Status] = useState<'idle' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [v2Error, setV2Error] = useState('');

  const handleV1Unstake = () => {
    resetV1Unstake();
    setV1Status('unstaking');
    setV1Error('');
    writeV1Unstake({
      address: TESTNET_JESTERGOONER_V1_ADDRESS,
      abi: JESTERGOONER_V1_ABI,
      functionName: 'unstake',
      args: [v1Staked],
      gas: 2000000n,
    }, { onError: (err) => { setV1Status('error'); setV1Error(err.message?.includes('locked') ? 'Still locked' : 'Unstake failed'); } });
  };

  const handleV1Claim = () => {
    resetV1Claim();
    setV1Status('claiming');
    setV1Error('');
    writeV1Claim({
      address: TESTNET_JESTERGOONER_V1_ADDRESS,
      abi: JESTERGOONER_V1_ABI,
      functionName: 'claimRewards',
      gas: 2000000n,
    }, { onError: () => { setV1Status('error'); setV1Error('Claim failed'); } });
  };

  const handleV2Unstake = () => {
    resetV2Unstake();
    setV2Status('unstaking');
    setV2Error('');
    writeV2Unstake({
      address: TESTNET_JESTERGOONER_V2_ADDRESS,
      abi: JESTERGOONER_ABI,
      functionName: 'unstake',
      args: [v2Staked],
      gas: 2000000n,
    }, { onError: () => { setV2Status('error'); setV2Error('Unstake failed'); } });
  };

  const handleV2Claim = () => {
    resetV2Claim();
    setV2Status('claiming');
    setV2Error('');
    writeV2Claim({
      address: TESTNET_JESTERGOONER_V2_ADDRESS,
      abi: JESTERGOONER_ABI,
      functionName: 'claimRewards',
      gas: 2000000n,
    }, { onError: () => { setV2Status('error'); setV2Error('Claim failed'); } });
  };

  useEffect(() => {
    if (v1UnstakeConfirmed && v1Status === 'unstaking') {
      setV1Status('done');
      refetchV1Staker();
      refetchV1Earned();
      refetchLpBalance();
    }
  }, [v1UnstakeConfirmed, v1Status]);

  useEffect(() => {
    if (v1ClaimConfirmed && v1Status === 'claiming') {
      setV1Status('done');
      refetchV1Staker();
      refetchV1Earned();
    }
  }, [v1ClaimConfirmed, v1Status]);

  useEffect(() => {
    if (v2UnstakeConfirmed && v2Status === 'unstaking') {
      setV2Status('done');
      refetchV2Staker();
      refetchV2Earned();
      refetchLpBalance();
    }
  }, [v2UnstakeConfirmed, v2Status]);

  useEffect(() => {
    if (v2ClaimConfirmed && v2Status === 'claiming') {
      setV2Status('done');
      refetchV2Staker();
      refetchV2Earned();
    }
  }, [v2ClaimConfirmed, v2Status]);

  const v1LockTimeLeft = v1LockEnd > 0 ? Math.max(0, v1LockEnd - Math.floor(Date.now() / 1000)) : 0;
  const v1LockDisplay = v1LockTimeLeft > 0
    ? `${Math.floor(v1LockTimeLeft / 86400)}d ${Math.floor((v1LockTimeLeft % 86400) / 3600)}h`
    : 'Unlocked';

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>JESTERGOONER V3</h2>
        <span className="beta-card-badge">MULTI-POOL LP STAKING</span>
      </div>
      <p className="beta-card-desc">
        Stake LP tokens across multiple pools to earn $MEGAGOONER rewards. No lock period — stake and unstake freely.
      </p>

      {/* V1 Migration Banner */}
      {v1Staked > 0n && (
        <div className="beta-info-box beta-info-warning" style={{ borderColor: '#F786C6' }}>
          <h4>V1 MIGRATION REQUIRED</h4>
          <p>You have <strong>{Number(formatUnits(v1Staked, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} LP</strong> staked in V1 (lock-based).</p>
          <div className="beta-stat-row" style={{ margin: '0.5rem 0' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">LOCK STATUS</span>
              <span className="beta-stat-value">{v1LockDisplay}</span>
            </div>
            <div className="beta-stat">
              <span className="beta-stat-label">PENDING REWARDS</span>
              <span className="beta-stat-value">{v1Earned ? Number(formatUnits(v1Earned, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0'} $MEGAGOONER</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              className="beta-btn-primary"
              onClick={handleV1Unstake}
              disabled={!v1CanUnstake || v1Status === 'unstaking' || v1Status === 'claiming'}
              style={{ flex: 1, opacity: v1CanUnstake ? 1 : 0.5 }}
            >
              {v1Status === 'unstaking' ? 'UNSTAKING...' : v1CanUnstake ? 'UNSTAKE FROM V1' : `LOCKED (${v1LockDisplay})`}
            </button>
            {v1Earned !== undefined && v1Earned > 0n && (
              <button
                className="beta-btn-secondary"
                onClick={handleV1Claim}
                disabled={v1Status === 'unstaking' || v1Status === 'claiming'}
                style={{ flex: 1 }}
              >
                {v1Status === 'claiming' ? 'CLAIMING...' : 'CLAIM V1 REWARDS'}
              </button>
            )}
          </div>
          {v1Status === 'done' && <div className="beta-status success" style={{ marginTop: '0.5rem' }}>V1 transaction confirmed!</div>}
          {v1Status === 'error' && <div className="beta-status error" style={{ marginTop: '0.5rem' }}>{v1Error || 'V1 transaction failed'}</div>}
        </div>
      )}

      {/* V2 Migration Banner */}
      {v2Staked > 0n && (
        <div className="beta-info-box beta-info-warning" style={{ borderColor: '#F786C6' }}>
          <h4>V2 MIGRATION REQUIRED</h4>
          <p>You have <strong>{Number(formatUnits(v2Staked, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} LP</strong> staked in V2 (single pool). Unstake and re-stake in V3 to earn from the new multi-pool system.</p>
          <div className="beta-stat-row" style={{ margin: '0.5rem 0' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">PENDING REWARDS</span>
              <span className="beta-stat-value">{v2Earned ? Number(formatUnits(v2Earned, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0'} $MEGAGOONER</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              className="beta-btn-primary"
              onClick={handleV2Unstake}
              disabled={v2Status === 'unstaking' || v2Status === 'claiming'}
              style={{ flex: 1 }}
            >
              {v2Status === 'unstaking' ? 'UNSTAKING...' : 'UNSTAKE FROM V2'}
            </button>
            {v2Earned !== undefined && v2Earned > 0n && (
              <button
                className="beta-btn-secondary"
                onClick={handleV2Claim}
                disabled={v2Status === 'unstaking' || v2Status === 'claiming'}
                style={{ flex: 1 }}
              >
                {v2Status === 'claiming' ? 'CLAIMING...' : 'CLAIM V2 REWARDS'}
              </button>
            )}
          </div>
          {v2Status === 'done' && <div className="beta-status success" style={{ marginTop: '0.5rem' }}>V2 transaction confirmed!</div>}
          {v2Status === 'error' && <div className="beta-status error" style={{ marginTop: '0.5rem' }}>{v2Error || 'V2 transaction failed'}</div>}
        </div>
      )}

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
          <span className="beta-stat-label">WEEK</span>
          <span className="beta-stat-value">{globalStats ? `${Number(globalStats[0])} / 225` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL WEEKLY EMISSION</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[1]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">REWARDS REMAINING</span>
          <span className="beta-stat-value">{globalStats ? fmtBig(globalStats[2]) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">POOLS</span>
          <span className="beta-stat-value">{globalStats ? Number(globalStats[3]).toString() : '—'}</span>
        </div>
      </div>

      {/* Claim All Rewards */}
      {earnedAll !== undefined && earnedAll > 0n && (
        <button className="beta-btn-secondary" onClick={handleClaimAll} disabled={isBusy} style={{ marginBottom: '1rem' }}>
          CLAIM ALL: {fmtBig(earnedAll)} $MEGAGOONER
        </button>
      )}

      {/* ── Pool Selector Tabs ── */}
      <div className="beta-toggle-row" style={{ marginBottom: '1rem' }}>
        {POOL_CONFIG.map((p, i) => (
          <button
            key={i}
            className={`beta-toggle${selectedPool === i ? ' active' : ''}`}
            onClick={() => { setSelectedPool(i); setAmount(''); setLiqPanel('none'); setErrorMsg(''); setStatus('idle'); }}
            style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem' }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Pool-specific stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">POOL ALLOCATION</span>
          <span className="beta-stat-value">{poolAllocPct.toFixed(1)}%</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">POOL WEEKLY EMISSION</span>
          <span className="beta-stat-value">{poolWeeklyEmission ? fmtBig(poolWeeklyEmission) : '—'} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TOTAL LP STAKED</span>
          <span className="beta-stat-value">{poolInfoData ? fmtBig(poolInfoData[2]) : '—'} LP</span>
        </div>
      </div>

      {/* Your position in selected pool */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR LP STAKED</span>
          <span className="beta-stat-value">{userInfoData ? fmtBig(userInfoData[0]) : '—'} LP</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">PENDING REWARDS</span>
          <span className="beta-stat-value highlight">{fmtBig(earned)} $MEGAGOONER</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">NFT MULTIPLIER</span>
          <span className="beta-stat-value">{userInfoData ? `${(Number(userInfoData[3]) / 10000).toFixed(2)}x` : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">LP BALANCE</span>
          <span className="beta-stat-value">{fmtBig(lpBalance)} LP</span>
        </div>
      </div>

      {/* Claim this pool */}
      {earned !== undefined && earned > 0n && (
        <button className="beta-btn-secondary" onClick={handleClaim} disabled={isBusy}>
          CLAIM {fmtBig(earned)} $MEGAGOONER (THIS POOL)
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
            Deposit $MEGACHAD and ${pool.tokenBSymbol} in the current pool ratio to receive LP tokens.
            {pool.isEth && ' ETH will be automatically wrapped to WETH.'}
          </p>

          <div className="beta-stat-row" style={{ marginBottom: '0.75rem' }}>
            <div className="beta-stat">
              <span className="beta-stat-label">POOL RATIO</span>
              <span className="beta-stat-value">1 MEGACHAD = {poolRatio.toFixed(4)} {pool.tokenBSymbol}</span>
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
            <label className="beta-input-label">${pool.tokenBSymbol} AMOUNT (auto)</label>
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
              <span className="beta-stat-label">YOUR ${pool.tokenBSymbol}</span>
              <span className="beta-stat-value">{fmtBig(tokenBBalance)}</span>
            </div>
          </div>

          <button
            className="beta-btn-primary"
            onClick={handleAddLiquidity}
            disabled={isBusy || parsedLiqA <= 0n}
          >
            {status === 'wrapping' ? 'WRAPPING ETH...'
              : status === 'approving' ? 'APPROVING $MEGACHAD...'
              : status === 'approving-b' ? `APPROVING $${pool.tokenBSymbol}...`
              : status === 'adding' ? 'ADDING LIQUIDITY...'
              : 'ADD LIQUIDITY'}
          </button>
        </div>
      )}

      {liqPanel === 'remove' && (
        <div style={{ padding: '1rem', border: '1px solid rgba(247,134,198,0.15)', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p className="beta-card-desc" style={{ marginBottom: '0.75rem' }}>
            Burn LP tokens to withdraw your $MEGACHAD and ${pool.tokenBSymbol} from the pool.
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
                <span className="beta-stat-value">{removeEstimate.tokenA.toFixed(2)} $MEGACHAD</span>
              </div>
              <div className="beta-stat">
                <span className="beta-stat-label">&nbsp;</span>
                <span className="beta-stat-value">{removeEstimate.tokenB.toFixed(2)} ${pool.tokenBSymbol}</span>
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
              if (action === 'unstake' && userInfoData) setAmount(formatUnits(userInfoData[0], 18));
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {status !== 'idle' && status !== 'done' && (
        <div className={`beta-status ${status === 'error' ? 'error' : ''}`}>
          {status === 'wrapping' && 'Wrapping ETH to WETH...'}
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

// ═════════════════════════════════════════════════════════
// SWAP — Buy / Sell MEGAGOONER via LP
// ═════════════════════════════════════════════════════════

function SwapSection({ address }: { address: `0x${string}` }) {
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'approving' | 'swapping' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Balances
  const { data: megachadBalance, refetch: refetchChad } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: megagoonerBalance, refetch: refetchGooner } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // Allowances on LP contract
  const { data: chadAllowance, refetch: refetchChadAllowance } = useReadContract({
    address: TESTNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_LP_TOKEN_ADDRESS],
  });

  const { data: goonerAllowance, refetch: refetchGoonerAllowance } = useReadContract({
    address: TESTNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, TESTNET_LP_TOKEN_ADDRESS],
  });

  // Reserves for quote
  const { data: reserves } = useReadContract({
    address: TESTNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'getReserves',
  });

  const parsedInput = inputAmount && Number(inputAmount) > 0 ? parseUnits(inputAmount, 18) : 0n;

  // Compute output estimate (constant-product with 0.3% fee)
  const outputEstimate = (() => {
    if (!reserves || parsedInput <= 0n) return 0n;
    const [reserveA, reserveB] = reserves; // A = MEGACHAD, B = MEGAGOONER
    if (reserveA <= 0n || reserveB <= 0n) return 0n;

    if (direction === 'buy') {
      // Sending MEGACHAD (A) to get MEGAGOONER (B)
      const amountInWithFee = parsedInput * 997n;
      return (amountInWithFee * reserveB) / (reserveA * 1000n + amountInWithFee);
    } else {
      // Sending MEGAGOONER (B) to get MEGACHAD (A)
      const amountInWithFee = parsedInput * 997n;
      return (amountInWithFee * reserveA) / (reserveB * 1000n + amountInWithFee);
    }
  })();

  // Price impact
  const priceImpact = (() => {
    if (!reserves || parsedInput <= 0n) return 0;
    const [reserveA, reserveB] = reserves;
    if (reserveA <= 0n || reserveB <= 0n) return 0;
    const spotPrice = direction === 'buy'
      ? Number(formatUnits(reserveB, 18)) / Number(formatUnits(reserveA, 18))
      : Number(formatUnits(reserveA, 18)) / Number(formatUnits(reserveB, 18));
    if (spotPrice <= 0) return 0;
    const effectivePrice = Number(formatUnits(outputEstimate, 18)) / Number(inputAmount);
    return Math.abs(1 - effectivePrice / spotPrice) * 100;
  })();

  // Spot price
  const spotPrice = (() => {
    if (!reserves) return null;
    const [rA, rB] = reserves;
    if (rA <= 0n || rB <= 0n) return null;
    return Number(formatUnits(rA, 18)) / Number(formatUnits(rB, 18));
  })();

  const inputToken = direction === 'buy' ? 'MEGACHAD' : 'MEGAGOONER';
  const outputToken = direction === 'buy' ? 'MEGAGOONER' : 'MEGACHAD';
  const inputBalance = direction === 'buy' ? megachadBalance : megagoonerBalance;
  const currentAllowance = direction === 'buy' ? chadAllowance : goonerAllowance;
  const needsApproval = currentAllowance !== undefined && parsedInput > 0n && currentAllowance < parsedInput;

  // Write hooks
  const { writeContract: writeApprove, data: approveHash, reset: resetApprove } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: !!approveHash } });

  const { writeContract: writeSwap, data: swapHash, reset: resetSwap } = useWriteContract();
  const { isSuccess: swapConfirmed } = useWaitForTransactionReceipt({ hash: swapHash, query: { enabled: !!swapHash } });

  const executeSwap = () => {
    setStatus('swapping');
    const args: [bigint, bigint, `0x${string}`] = direction === 'buy'
      ? [parsedInput, 0n, address]
      : [0n, parsedInput, address];

    writeSwap({
      address: TESTNET_LP_TOKEN_ADDRESS,
      abi: LP_ABI,
      functionName: 'swap',
      args,
      gas: 2000000n,
    }, { onError: () => { setStatus('error'); setErrorMsg('Swap failed'); } });
  };

  const handleSwap = () => {
    if (parsedInput <= 0n) { setErrorMsg('Enter an amount'); return; }
    if (inputBalance !== undefined && parsedInput > inputBalance) { setErrorMsg(`Insufficient $${inputToken}`); return; }
    setErrorMsg('');
    resetApprove();
    resetSwap();

    if (needsApproval) {
      setStatus('approving');
      const tokenAddr = direction === 'buy' ? TESTNET_MEGACHAD_ADDRESS : TESTNET_MEGAGOONER_ADDRESS;
      writeApprove({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [TESTNET_LP_TOKEN_ADDRESS, parsedInput],
        gas: 2000000n,
      }, { onError: () => { setStatus('error'); setErrorMsg('Approval rejected'); } });
    } else {
      executeSwap();
    }
  };

  // Chain: approve → swap
  useEffect(() => {
    if (approveConfirmed && status === 'approving') {
      refetchChadAllowance();
      refetchGoonerAllowance();
      executeSwap();
    }
  }, [approveConfirmed, status]);

  useEffect(() => {
    if (swapConfirmed && status === 'swapping') {
      setStatus('done');
      setInputAmount('');
      refetchChad();
      refetchGooner();
      refetchChadAllowance();
      refetchGoonerAllowance();
    }
  }, [swapConfirmed, status]);

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>SWAP</h2>
        <span className="beta-card-badge">DEX</span>
      </div>
      <p className="beta-card-desc">
        Buy or sell $MEGAGOONER using $MEGACHAD via the MEGACHAD/MEGAGOONER liquidity pool. 0.3% swap fee.
      </p>

      {/* Price info */}
      {spotPrice !== null && (
        <div className="beta-stat-row">
          <div className="beta-stat">
            <span className="beta-stat-label">PRICE</span>
            <span className="beta-stat-value">1 $MEGAGOONER = {spotPrice.toFixed(2)} $MEGACHAD</span>
          </div>
          <div className="beta-stat">
            <span className="beta-stat-label">POOL RESERVES</span>
            <span className="beta-stat-value">
              {reserves ? `${fmtBig(reserves[0])} MEGACHAD / ${fmtBig(reserves[1])} MEGAGOONER` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Direction toggle */}
      <div className="beta-toggle-row">
        <button
          className={`beta-toggle${direction === 'buy' ? ' active' : ''}`}
          onClick={() => { setDirection('buy'); setInputAmount(''); setErrorMsg(''); setStatus('idle'); }}
        >
          BUY $MEGAGOONER
        </button>
        <button
          className={`beta-toggle${direction === 'sell' ? ' active' : ''}`}
          onClick={() => { setDirection('sell'); setInputAmount(''); setErrorMsg(''); setStatus('idle'); }}
        >
          SELL $MEGAGOONER
        </button>
      </div>

      {/* Input */}
      <div className="beta-input-group">
        <label className="beta-input-label">YOU PAY (${inputToken})</label>
        <div className="beta-input-row">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.0"
            className="beta-input"
            min="0"
          />
          <button
            className="beta-btn-max"
            onClick={() => { if (inputBalance) setInputAmount(formatUnits(inputBalance, 18)); }}
          >
            MAX
          </button>
        </div>
        <span className="beta-input-hint">Balance: {fmtBig(inputBalance)} ${inputToken}</span>
      </div>

      {/* Output estimate */}
      <div className="beta-input-group" style={{ marginTop: '0.5rem' }}>
        <label className="beta-input-label">YOU RECEIVE (${outputToken})</label>
        <div className="beta-input-row">
          <input
            type="text"
            value={outputEstimate > 0n ? Number(formatUnits(outputEstimate, 18)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : ''}
            readOnly
            placeholder="—"
            className="beta-input"
            style={{ opacity: 0.7 }}
          />
        </div>
      </div>

      {/* Swap details */}
      {parsedInput > 0n && outputEstimate > 0n && (
        <div className="beta-stat-row" style={{ margin: '0.75rem 0' }}>
          <div className="beta-stat">
            <span className="beta-stat-label">RATE</span>
            <span className="beta-stat-value">
              1 ${inputToken} = {(Number(formatUnits(outputEstimate, 18)) / Number(inputAmount)).toFixed(4)} ${outputToken}
            </span>
          </div>
          <div className="beta-stat">
            <span className="beta-stat-label">PRICE IMPACT</span>
            <span className="beta-stat-value" style={{ color: priceImpact > 5 ? '#ff4444' : priceImpact > 1 ? '#ffaa00' : '#44ff44' }}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="beta-stat">
            <span className="beta-stat-label">FEE</span>
            <span className="beta-stat-value">0.3%</span>
          </div>
        </div>
      )}

      {/* Status */}
      {status !== 'idle' && status !== 'done' && (
        <div className={`beta-status ${status === 'error' ? 'error' : ''}`}>
          {status === 'approving' && `Approving $${inputToken}...`}
          {status === 'swapping' && 'Swapping...'}
          {status === 'error' && (errorMsg || 'Transaction failed')}
        </div>
      )}
      {status === 'done' && <div className="beta-status success">Swap confirmed!</div>}
      {errorMsg && status === 'idle' && <div className="beta-status error">{errorMsg}</div>}

      {/* Price impact warning */}
      {priceImpact > 5 && (
        <div className="beta-info-box beta-info-warning">
          <h4>HIGH PRICE IMPACT</h4>
          <p>This trade has a {priceImpact.toFixed(1)}% price impact. Consider swapping a smaller amount.</p>
        </div>
      )}

      <button
        className="beta-btn-primary"
        onClick={handleSwap}
        disabled={isBusy || parsedInput <= 0n}
      >
        {needsApproval
          ? `APPROVE & SWAP`
          : status === 'approving' ? `APPROVING...`
          : status === 'swapping' ? 'SWAPPING...'
          : direction === 'buy' ? 'BUY $MEGAGOONER' : 'SELL $MEGAGOONER'}
      </button>
    </div>
  );
}
