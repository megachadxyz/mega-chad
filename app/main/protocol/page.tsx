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
  MAINNET_CHAIN_ID,
  MAINNET_MEGACHAD_ADDRESS,
  MAINNET_MEGAGOONER_ADDRESS,
  MAINNET_FRAMEMOGGER_ADDRESS,
  MAINNET_MOGGER_STAKING_ADDRESS,
  MAINNET_JESTERGOONER_ADDRESS,
  MAINNET_LP_TOKEN_ADDRESS,
  MAINNET_MC_MG_PAIR_ADDRESS,
  MAINNET_NFT_ADDRESS,
  MAINNET_BURN_ADDRESS,
  MAINNET_TREN_FUND_WALLET,
  MAINNET_BURN_AMOUNT,
  MAINNET_BURN_AMOUNT_DISPLAY,
  ERC20_ABI,
  FRAMEMOGGER_ABI,
  MOGGER_STAKING_ABI,
  JESTERGOONER_ABI,
  LP_ABI,
  MAINNET_JESTERGOONER_V1_ADDRESS,
  JESTERGOONER_V1_ABI,
  MAINNET_JESTERGOONER_V2_ADDRESS,
  MAINNET_LP_ETH_ADDRESS,
  MAINNET_LP_USDM_ADDRESS,
  MAINNET_WETH_ADDRESS,
  MAINNET_USDM_ADDRESS,
  JESTERGOONER_V3_ABI,
  WETH_ABI,
  isContractDeployed,
} from '@/lib/mainnet-contracts';

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

type ActiveTab = 'framemogger' | 'staking' | 'lp-staking' | 'swap';

// ContractGate renders a "launch pending" placeholder when the relevant
// mainnet contract has not yet been deployed (address is 0x0).
function ContractGate({
  addresses,
  label,
  children,
}: {
  addresses: `0x${string}`[];
  label: string;
  children: React.ReactNode;
}) {
  const missing = addresses.filter((a) => !isContractDeployed(a));
  if (missing.length === 0) return <>{children}</>;
  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>{label.toUpperCase()}</h2>
        <span className="beta-card-badge">LAUNCH PENDING</span>
      </div>
      <p className="beta-card-desc">
        This module goes live with the mainnet protocol deploy. Once the
        underlying contract is deployed and its address is wired into the
        frontend environment, this panel will activate automatically.
      </p>
    </div>
  );
}

// JESTERGOONER + Swap rely on a real MEGACHAD/MEGAGOONER DEX pair. The mainnet
// deploy uses a placeholder ERC20 as lpToken so the protocol could launch ahead
// of the DEX. Until the real pair exists and JESTERGOONER is upgraded to point
// at it, render this notice instead of the staking/swap UI.
function PendingDexPairCard() {
  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>PENDING DEX PAIR</h2>
        <span className="beta-card-badge">COMING SOON</span>
      </div>
      <p className="beta-card-desc">
        LP staking and the in-app swap open once the MEGACHAD/MEGAGOONER pool
        is live on a MegaETH DEX. The JESTERGOONER contract is already deployed
        and will be upgraded to point at the real pair as soon as it exists.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
export default function MainnetProtocol() {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [activeTab, setActiveTab] = useState<ActiveTab>('framemogger');
  const onWrongChain = isConnected && walletChainId !== MAINNET_CHAIN_ID;

  return (
    <div className="beta-page">
      {/* Hero */}
      <section className="beta-hero">
        <h1 className="beta-hero-title">MEGACHAD PROTOCOL</h1>
        <p className="beta-hero-subtitle">
          Mainnet DeFi Suite — Burn, Stake, Govern
        </p>
        <div className="beta-chain-info">
          <span className="beta-chain-dot" />
          MegaETH Mainnet (Chain {MAINNET_CHAIN_ID})
        </div>
      </section>

      {/* Public stats (visible without wallet / stake) */}
      <PublicStatsCard />

      {/* Tab navigation — burn-to-NFT lives on the /main page (already mainnet-wired) */}
      <div className="beta-tabs">
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
            <p>Connect your wallet to interact with the mainnet protocol.</p>
          </div>
        ) : onWrongChain ? (
          <div className="beta-not-allowed">
            <div className="beta-lock-icon">&#9888;</div>
            <h3>WRONG NETWORK</h3>
            <p>Your wallet is on chain {walletChainId}. Please switch to MegaETH Mainnet (Chain {MAINNET_CHAIN_ID}).</p>
            <button
              className="beta-btn-primary"
              onClick={() => switchChain({ chainId: MAINNET_CHAIN_ID })}
              style={{ marginTop: '1rem' }}
            >
              SWITCH TO MAINNET
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'framemogger' && (
              <ContractGate
                addresses={[MAINNET_FRAMEMOGGER_ADDRESS, MAINNET_MEGAGOONER_ADDRESS]}
                label="Framemogger"
              >
                <FramemoggerSection address={address!} />
              </ContractGate>
            )}
            {activeTab === 'staking' && (
              <ContractGate
                addresses={[MAINNET_MOGGER_STAKING_ADDRESS, MAINNET_MEGAGOONER_ADDRESS]}
                label="Mogger Staking"
              >
                <StakingSection address={address!} />
              </ContractGate>
            )}
            {activeTab === 'lp-staking' && (
              <ContractGate
                addresses={[MAINNET_JESTERGOONER_ADDRESS, MAINNET_MEGAGOONER_ADDRESS]}
                label="JesterGooner"
              >
                <LPStakingSection address={address!} />
              </ContractGate>
            )}
            {activeTab === 'swap' && (
              <ContractGate
                addresses={[MAINNET_LP_TOKEN_ADDRESS, MAINNET_MEGAGOONER_ADDRESS]}
                label="Swap"
              >
                <PendingDexPairCard />
              </ContractGate>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// FRAMEMOGGER (Send MEGACHAD to Tren Fund, Burn MEGAGOONER for deflation)
// ═════════════════════════════════════════════════════════
function FramemoggerSection({ address }: { address: `0x${string}` }) {
  const [sendAmount, setSendAmount] = useState('');

  // Balances
  const { data: megachadBalance, refetch: refetchMegachad } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
  });
  const { data: megagoonerBalance, refetch: refetchMegagooner } = useReadContract({
    address: MAINNET_MEGAGOONER_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
  });

  // Allowances (both tokens need approval to Framemogger)
  const { data: megachadAllowance } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, MAINNET_FRAMEMOGGER_ADDRESS],
  });
  const { data: megagoonerAllowance } = useReadContract({
    address: MAINNET_MEGAGOONER_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, MAINNET_FRAMEMOGGER_ADDRESS],
  });

  // Parsed input + MEGAGOONER requirement (1:4 ratio)
  const parsedAmount = sendAmount ? parseUnits(sendAmount, 18) : 0n;
  const { data: megagoonerNeeded } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'getBurnRequirements',
    args: [parsedAmount], query: { enabled: parsedAmount > 0n },
  });

  // Current week number
  const { data: currentWeek } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'getCurrentWeek',
  });

  // Week stats (totalSent, uniqueSenders, timeRemaining)
  const { data: weekStats } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'getWeekStats',
    args: currentWeek !== undefined ? [currentWeek] : undefined,
    query: { enabled: currentWeek !== undefined },
  });

  // Top 3 senders this week
  const { data: top3 } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'getWeekTop3',
    args: currentWeek !== undefined ? [currentWeek] : undefined,
    query: { enabled: currentWeek !== undefined },
  });

  // Can propose (top 3 current or previous week)
  const { data: canPropose } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'canPropose', args: [address],
  });

  // User sends this week
  const { data: userWeeklySent } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'weeklyUserSent',
    args: currentWeek !== undefined ? [currentWeek, address] : undefined,
    query: { enabled: currentWeek !== undefined },
  });

  // Lifetime stats
  const { data: totalSentAllTime } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'totalSentAllTime',
  });
  const { data: totalGoonerBurned } = useReadContract({
    address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI, functionName: 'totalMegagoonerBurned',
  });

  // NFT count
  const { data: nftBalance } = useReadContract({
    address: MAINNET_NFT_ADDRESS,
    abi: [{ type: 'function', name: 'balanceOf', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }] as const,
    functionName: 'balanceOf', args: [address],
  });

  // Write hooks
  const { writeContract: writeApproveMegachad, data: approveMegachadHash } = useWriteContract();
  const { isSuccess: approveMegachadConfirmed } = useWaitForTransactionReceipt({ hash: approveMegachadHash, query: { enabled: !!approveMegachadHash } });
  const { writeContract: writeApproveMegagooner, data: approveMegagoonerHash } = useWriteContract();
  const { isSuccess: approveMegagoonerConfirmed } = useWaitForTransactionReceipt({ hash: approveMegagoonerHash, query: { enabled: !!approveMegagoonerHash } });
  const { writeContract: writeSend, data: sendHash } = useWriteContract();
  const { isSuccess: sendConfirmed } = useWaitForTransactionReceipt({ hash: sendHash, query: { enabled: !!sendHash } });

  const [status, setStatus] = useState<'idle' | 'approving-megachad' | 'approving-megagooner' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const megagoonerRequired = megagoonerNeeded ?? 0n;
  const needsMegachadApproval = megachadAllowance !== undefined && parsedAmount > 0n && megachadAllowance < parsedAmount;
  const needsMegagoonerApproval = megagoonerAllowance !== undefined && megagoonerRequired > 0n && megagoonerAllowance < megagoonerRequired;

  const handleSend = () => {
    if (!sendAmount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    if (parsedAmount < 4n * (10n ** 18n)) { setErrorMsg('Minimum 4 $MEGACHAD (to burn at least 1 $MEGAGOONER)'); return; }
    if (megachadBalance !== undefined && parsedAmount > megachadBalance) { setErrorMsg('Insufficient $MEGACHAD'); return; }
    if (megagoonerBalance !== undefined && megagoonerRequired > megagoonerBalance) {
      setErrorMsg(`Insufficient $MEGAGOONER — need ${fmtBig(megagoonerRequired)} for deflation`); return;
    }
    if (nftBalance !== undefined && nftBalance < 1n) { setErrorMsg('Requires 1+ Looksmaxxed NFT'); return; }
    setErrorMsg('');

    if (needsMegachadApproval) {
      setStatus('approving-megachad');
      writeApproveMegachad({
        address: MAINNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
        args: [MAINNET_FRAMEMOGGER_ADDRESS, parsedAmount],
      }, { onError: () => { setStatus('error'); setErrorMsg('$MEGACHAD approval rejected'); } });
    } else if (needsMegagoonerApproval) {
      setStatus('approving-megagooner');
      writeApproveMegagooner({
        address: MAINNET_MEGAGOONER_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
        args: [MAINNET_FRAMEMOGGER_ADDRESS, megagoonerRequired],
      }, { onError: () => { setStatus('error'); setErrorMsg('$MEGAGOONER approval rejected'); } });
    } else {
      executeSend();
    }
  };

  const executeSend = () => {
    setStatus('sending');
    writeSend({
      address: MAINNET_FRAMEMOGGER_ADDRESS, abi: FRAMEMOGGER_ABI,
      functionName: 'sendMegachad', args: [parsedAmount],
    }, { onError: () => { setStatus('error'); setErrorMsg('Framemogger transaction failed'); } });
  };

  // Chain: approve MEGACHAD → approve MEGAGOONER → send
  useEffect(() => {
    if (approveMegachadConfirmed && status === 'approving-megachad') {
      if (needsMegagoonerApproval) {
        setStatus('approving-megagooner');
        writeApproveMegagooner({
          address: MAINNET_MEGAGOONER_ADDRESS, abi: ERC20_ABI, functionName: 'approve',
          args: [MAINNET_FRAMEMOGGER_ADDRESS, megagoonerRequired],
        }, { onError: () => { setStatus('error'); setErrorMsg('$MEGAGOONER approval rejected'); } });
      } else {
        executeSend();
      }
    }
  }, [approveMegachadConfirmed]);

  useEffect(() => {
    if (approveMegagoonerConfirmed && status === 'approving-megagooner') executeSend();
  }, [approveMegagoonerConfirmed]);

  useEffect(() => {
    if (sendConfirmed && status === 'sending') {
      setStatus('done');
      setSendAmount('');
      refetchMegachad();
      refetchMegagooner();
    }
  }, [sendConfirmed]);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (weekStats === undefined) return;
    const remaining = Number(weekStats[2]);
    setTimeLeft(remaining);
    const iv = setInterval(() => setTimeLeft((t) => Math.max(0, t - 60)), 60000);
    return () => clearInterval(iv);
  }, [weekStats]);

  const isBusy = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div className="beta-card">
      <div className="beta-card-header">
        <h2>FRAMEMOGGER</h2>
        <span className="beta-card-badge">SEND &rarr; DEFLATE</span>
      </div>
      <p className="beta-card-desc">
        Send $MEGACHAD to the Tren Fund for future ecosystem use, while permanently burning $MEGAGOONER
        for deflation. For every 4 $MEGACHAD sent, 1 $MEGAGOONER is destroyed.
        Requires 1+ Looksmaxxed NFT. Top 3 weekly senders earn the right to create governance proposals.
      </p>

      {/* How it works */}
      <div className="beta-info-box">
        <h4>HOW IT WORKS</h4>
        <ul>
          <li>$MEGACHAD is sent to the Tren Fund — not burned, reserved for future ecosystem use</li>
          <li>$MEGAGOONER is permanently burned at a 4:1 ratio (1 $MEGAGOONER destroyed per 4 $MEGACHAD sent)</li>
          <li>Requires holding at least 1 Looksmaxxed NFT to participate</li>
          <li>Top 3 weekly senders can submit governance proposals via Jestermogger</li>
        </ul>
      </div>

      {/* NFT gate warning */}
      {nftBalance !== undefined && nftBalance < 1n && (
        <div className="beta-info-box beta-info-warning">
          <h4>NFT REQUIRED</h4>
          <p>You need at least 1 Looksmaxxed NFT to use Framemogger. Burn $MEGACHAD in the &quot;Burn to Looksmaxx&quot; tab to mint one.</p>
        </div>
      )}

      {/* Week info */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">CURRENT WEEK</span>
          <span className="beta-stat-value">{currentWeek !== undefined ? Number(currentWeek).toString() : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">TIME REMAINING</span>
          <span className="beta-stat-value">{fmtCountdown(timeLeft)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">SENT THIS WEEK</span>
          <span className="beta-stat-value">{weekStats ? fmtBig(weekStats[0]) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">UNIQUE SENDERS</span>
          <span className="beta-stat-value">{weekStats ? Number(weekStats[1]).toString() : '—'}</span>
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">ALL-TIME $MEGACHAD SENT</span>
          <span className="beta-stat-value">{fmtBig(totalSentAllTime)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">ALL-TIME $MEGAGOONER BURNED</span>
          <span className="beta-stat-value">{fmtBig(totalGoonerBurned)}</span>
        </div>
      </div>

      {/* Top 3 */}
      <div className="beta-top3">
        <h3>TOP 3 SENDERS THIS WEEK</h3>
        <div className="beta-top3-list">
          {top3 ? top3[0].map((sender: string, i: number) => (
            <div key={i} className="beta-top3-item">
              <span className="beta-top3-rank">#{i + 1}</span>
              <span className="beta-top3-addr">
                {sender === '0x0000000000000000000000000000000000000000' ? '—' : truncAddr(sender)}
              </span>
              <span className="beta-top3-amount">{top3 ? fmtBig(top3[1][i]) : '0'} $MEGACHAD</span>
            </div>
          )) : [0, 1, 2].map((i) => (
            <div key={i} className="beta-top3-item">
              <span className="beta-top3-rank">#{i + 1}</span>
              <span className="beta-top3-addr">—</span>
              <span className="beta-top3-amount">—</span>
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
          <span className="beta-stat-label">YOUR SENDS THIS WEEK</span>
          <span className="beta-stat-value">{userWeeklySent !== undefined ? fmtBig(userWeeklySent) : '—'} $MEGACHAD</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">CAN PROPOSE</span>
          <span className={`beta-stat-value ${canPropose ? 'text-green' : ''}`}>
            {canPropose ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {/* Send input */}
      <div className="beta-input-group">
        <label className="beta-input-label">AMOUNT ($MEGACHAD TO SEND)</label>
        <div className="beta-input-row">
          <input
            type="number"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            placeholder="0.0"
            className="beta-input"
            min="0"
          />
          <button
            className="beta-btn-max"
            onClick={() => megachadBalance && setSendAmount(formatUnits(megachadBalance, 18))}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Requirements preview */}
      {parsedAmount > 0n && megagoonerNeeded !== undefined && (
        <div className="beta-requirements">
          <span>Sends {fmtBig(parsedAmount)} $MEGACHAD to Tren Fund + burns {fmtBig(megagoonerNeeded)} $MEGAGOONER for deflation</span>
        </div>
      )}

      {isBusy && (
        <div className="beta-status">
          {status === 'approving-megachad' && 'Approving $MEGACHAD...'}
          {status === 'approving-megagooner' && 'Approving $MEGAGOONER for deflation...'}
          {status === 'sending' && 'Sending via Framemogger...'}
        </div>
      )}
      {status === 'done' && (
        <div className="beta-status success">Complete! $MEGACHAD sent to Tren Fund, $MEGAGOONER permanently deflated.</div>
      )}
      {status === 'error' && (
        <div className="beta-status error">{errorMsg || 'Transaction failed'}</div>
      )}
      {errorMsg && status === 'idle' && (
        <div className="beta-status error">{errorMsg}</div>
      )}

      <button
        className="beta-btn-primary"
        onClick={handleSend}
        disabled={isBusy}
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
    address: MAINNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, MAINNET_MOGGER_STAKING_ADDRESS],
  });

  // Staker info: (stakedAmount, earnedRewards, nftCount, multiplier, effectiveStake)
  const { data: stakerInfo, refetch: refetchStaker } = useReadContract({
    address: MAINNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });

  // Global stats: (totalStaked, totalRewardsDistributed, rewardRate)
  const { data: globalStats } = useReadContract({
    address: MAINNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getGlobalStats',
  });

  // Total effective stake (separate view — used for APY)
  const { data: totalEffectiveStake } = useReadContract({
    address: MAINNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'totalEffectiveStake',
  });

  // Earned
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: MAINNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'earned',
    args: [address],
  });

  // LP reserves for APY calculation
  const { data: lpReserves } = useReadContract({
    address: MAINNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'getReserves',
  });

  // Live NFT balance from the MEGACHADNFT contract. The stakerInfo tuple's nftCount
  // field is only populated after the user has interacted with MoggerStaking (it
  // snapshots on stake/unstake/claim), so we read the NFT contract directly for
  // display and stake-gating before first interaction.
  const { data: nftBalance } = useReadContract({
    address: MAINNET_NFT_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // APY is hidden until the EmissionController weekly rate + a real LP pair exist.
  // The placeholder LP carries no MEGACHAD/MEGAGOONER price signal, so any computation
  // would be misleading. Show "—" until the DEX pair lands.
  const stakingAPY: number | undefined = undefined;

  // Write contracts
  const { writeContract: writeApprove, data: approveHash, reset: resetApprove } = useWriteContract();
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: !!approveHash } });

  const { writeContract: writeStake, data: stakeHash, reset: resetStake } = useWriteContract();
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash, query: { enabled: !!stakeHash } });

  const { writeContract: writeClaim, data: claimHash, reset: resetClaim } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash, query: { enabled: !!claimHash } });

  // Permissionless weekly emission trigger — pulls MEGAGOONER from EmissionController
  // for every unclaimed week up to the current one and notifies MoggerStaking/JESTERGOONER.
  const { writeContract: writeDistribute, data: distributeHash, reset: resetDistribute } = useWriteContract();
  const { isSuccess: distributeConfirmed } = useWaitForTransactionReceipt({ hash: distributeHash, query: { enabled: !!distributeHash } });
  const [distributeStatus, setDistributeStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [distributeError, setDistributeError] = useState('');

  const handleDistribute = () => {
    resetDistribute();
    setDistributeStatus('pending');
    setDistributeError('');
    writeDistribute({
      address: MAINNET_MOGGER_STAKING_ADDRESS,
      abi: MOGGER_STAKING_ABI,
      functionName: 'distributeWeeklyRewards',
      gas: 1000000n,
    }, { onError: (e) => { setDistributeStatus('error'); setDistributeError(e.message?.includes('AlreadyClaimed') ? 'All eligible weeks already distributed' : 'Distribute failed'); } });
  };

  useEffect(() => {
    if (distributeConfirmed && distributeStatus === 'pending') {
      setDistributeStatus('done');
      refetchEarned();
      refetchStaker();
    }
  }, [distributeConfirmed, distributeStatus]);

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = action === 'stake' && allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;

  // Prefer the live on-chain NFT balance; fall back to the stakerInfo snapshot only
  // if the direct read hasn't resolved yet.
  const liveNftCount = nftBalance !== undefined ? Number(nftBalance) : undefined;
  const stakerNftCount = liveNftCount ?? (stakerInfo ? Number(stakerInfo[2]) : undefined);
  const lacksNFT = stakerNftCount !== undefined && stakerNftCount < 1;

  const handleStakeUnstake = () => {
    if (!amount || parsedAmount <= 0n) { setErrorMsg('Enter an amount'); return; }
    setErrorMsg('');
    resetApprove();
    resetStake();

    if (action === 'stake') {
      if (stakerNftCount !== undefined && stakerNftCount < 1) {
        setErrorMsg('Requires 1+ Looksmaxxed NFT to stake'); return;
      }
      if (megachadBalance !== undefined && parsedAmount > megachadBalance) {
        setErrorMsg('Insufficient balance'); return;
      }
      if (needsApproval) {
        setStatus('approving');
        writeApprove({
          address: MAINNET_MEGACHAD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [MAINNET_MOGGER_STAKING_ADDRESS, parsedAmount],
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
        address: MAINNET_MOGGER_STAKING_ADDRESS,
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
      address: MAINNET_MOGGER_STAKING_ADDRESS,
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
      address: MAINNET_MOGGER_STAKING_ADDRESS,
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
          <span className="beta-stat-label">TOTAL EFFECTIVE STAKE</span>
          <span className="beta-stat-value">{totalEffectiveStake !== undefined ? fmtBig(totalEffectiveStake) : '—'}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">APY</span>
          <span className="beta-stat-value">{fmtAPY(stakingAPY)}</span>
        </div>
      </div>

      {/* Weekly distribution trigger (permissionless) */}
      <div className="beta-info-box" style={{ marginTop: '0.5rem' }}>
        <h4>WEEKLY EMISSION DISTRIBUTION</h4>
        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Anyone can pull the current week&apos;s MEGAGOONER mint from EmissionController into MoggerStaking + JESTERGOONER. Each tx catches up every unclaimed week in one shot.
        </p>
        <button
          className="beta-btn-secondary"
          onClick={handleDistribute}
          disabled={distributeStatus === 'pending'}
        >
          {distributeStatus === 'pending' ? 'DISTRIBUTING...' : 'TRIGGER WEEKLY DISTRIBUTION'}
        </button>
        {distributeStatus === 'done' && <div className="beta-status success" style={{ marginTop: '0.5rem' }}>Distribution confirmed — rewards credited.</div>}
        {distributeStatus === 'error' && <div className="beta-status error" style={{ marginTop: '0.5rem' }}>{distributeError}</div>}
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
          <span className="beta-stat-value">{stakerNftCount !== undefined ? stakerNftCount.toString() : '—'}</span>
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

      {action === 'stake' && lacksNFT && (
        <div className="beta-status error">
          Requires 1+ Looksmaxxed NFT — this wallet holds {stakerNftCount} on MegaETH mainnet.
        </div>
      )}

      <button
        className="beta-btn-primary"
        onClick={handleStakeUnstake}
        disabled={
          status === 'approving' ||
          status === 'staking' ||
          status === 'unstaking' ||
          (action === 'stake' && lacksNFT)
        }
      >
        {needsApproval ? `APPROVE & ${action.toUpperCase()}` : action.toUpperCase()}
      </button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// JESTERGOONER (Multi-Pool LP Staking → Earn MEGAGOONER)
// ═════════════════════════════════════════════════════════

// Compute APY from a pool's weekly emission + staked LP + LP price + gooner price.
// All amounts expressed as Number via formatUnits. Inputs of zero → undefined.
function computePoolAPY(
  weeklyEmissionRaw: bigint | undefined,
  totalStakedRaw: bigint | undefined,
  lpReserveMegachadRaw: bigint | undefined,
  lpTotalSupplyRaw: bigint | undefined,
  goonerPriceInMegachad: number | undefined
): number | undefined {
  if (!weeklyEmissionRaw || !totalStakedRaw || !lpReserveMegachadRaw || !lpTotalSupplyRaw || !goonerPriceInMegachad) return undefined;
  const weekly = Number(formatUnits(weeklyEmissionRaw, 18));
  const staked = Number(formatUnits(totalStakedRaw, 18));
  const megachadReserve = Number(formatUnits(lpReserveMegachadRaw, 18));
  const lpSupply = Number(formatUnits(lpTotalSupplyRaw, 18));
  if (weekly <= 0 || staked <= 0 || lpSupply <= 0 || megachadReserve <= 0) return undefined;
  const lpPriceInMegachad = (2 * megachadReserve) / lpSupply;
  const stakedValueInMegachad = staked * lpPriceInMegachad;
  if (stakedValueInMegachad <= 0) return undefined;
  return (weekly * 52 * goonerPriceInMegachad / stakedValueInMegachad) * 100;
}

// ═════════════════════════════════════════════════════════
// PUBLIC STATS (always visible, no wallet needed)
// ═════════════════════════════════════════════════════════
function PublicStatsCard() {
  // Mogger staking globals
  const { data: moggerGlobal } = useReadContract({
    address: MAINNET_MOGGER_STAKING_ADDRESS,
    abi: MOGGER_STAKING_ABI,
    functionName: 'getGlobalStats',
  });

  // MEGACHAD/MEGAGOONER LP reserves — used for gooner price
  const { data: mgReserves } = useReadContract({
    address: MAINNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'getReserves',
  });
  const { data: mgLpSupply } = useReadContract({
    address: MAINNET_LP_TOKEN_ADDRESS,
    abi: LP_ABI,
    functionName: 'totalSupply',
  });

  // JesterGoonerV3 per-pool info
  const { data: pool0 } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_V3_ABI,
    functionName: 'getPoolInfo',
    args: [0n],
  });
  const { data: pool1 } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_V3_ABI,
    functionName: 'getPoolInfo',
    args: [1n],
  });
  const { data: pool2 } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS,
    abi: JESTERGOONER_V3_ABI,
    functionName: 'getPoolInfo',
    args: [2n],
  });

  // Per-pool LP reserves + totalSupply (for LP price)
  const { data: lp1Reserves } = useReadContract({ address: MAINNET_LP_ETH_ADDRESS, abi: LP_ABI, functionName: 'getReserves' });
  const { data: lp1Supply } = useReadContract({ address: MAINNET_LP_ETH_ADDRESS, abi: LP_ABI, functionName: 'totalSupply' });
  const { data: lp2Reserves } = useReadContract({ address: MAINNET_LP_USDM_ADDRESS, abi: LP_ABI, functionName: 'getReserves' });
  const { data: lp2Supply } = useReadContract({ address: MAINNET_LP_USDM_ADDRESS, abi: LP_ABI, functionName: 'totalSupply' });

  // Gooner price (in MEGACHAD) from MC/MG reserves — tokenA is MEGACHAD
  const goonerPrice = (() => {
    if (!mgReserves) return undefined;
    const a = Number(formatUnits(mgReserves[0], 18));
    const b = Number(formatUnits(mgReserves[1], 18));
    if (a <= 0 || b <= 0) return undefined;
    return a / b;
  })();

  // Mogger APY hidden on mainnet — deployed MoggerStaking exposes cumulative
  // rewardPerTokenStored, not a per-week rate, so APY requires reading the
  // EmissionController schedule. Returns "—" until that wiring exists.
  const moggerAPY: number | undefined = undefined;

  const pool0APY = computePoolAPY(pool0?.[4], pool0?.[2], mgReserves?.[0], mgLpSupply, goonerPrice);
  const pool1APY = computePoolAPY(pool1?.[4], pool1?.[2], lp1Reserves?.[0], lp1Supply, goonerPrice);
  const pool2APY = computePoolAPY(pool2?.[4], pool2?.[2], lp2Reserves?.[0], lp2Supply, goonerPrice);

  return (
    <div className="beta-card" style={{ marginBottom: '1rem' }}>
      <div className="beta-card-header">
        <h2>CURRENT APY</h2>
        <span className="beta-card-badge">LIVE — NO WALLET NEEDED</span>
      </div>
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">MOGGER STAKING</span>
          <span className="beta-stat-value">{fmtAPY(moggerAPY)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">JG: MEGACHAD / MEGAGOONER</span>
          <span className="beta-stat-value">{fmtAPY(pool0APY)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">JG: MEGACHAD / ETH</span>
          <span className="beta-stat-value">{fmtAPY(pool1APY)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">JG: MEGACHAD / USDm</span>
          <span className="beta-stat-value">{fmtAPY(pool2APY)}</span>
        </div>
      </div>
    </div>
  );
}

const POOL_CONFIG = [
  { pid: 0, name: 'MEGACHAD / MEGAGOONER', lpAddress: MAINNET_MC_MG_PAIR_ADDRESS, tokenBAddress: MAINNET_MEGAGOONER_ADDRESS, tokenBSymbol: 'MEGAGOONER', isEth: false },
  { pid: 1, name: 'MEGACHAD / ETH', lpAddress: MAINNET_LP_ETH_ADDRESS, tokenBAddress: MAINNET_WETH_ADDRESS, tokenBSymbol: 'ETH', isEth: true },
  { pid: 2, name: 'MEGACHAD / USDm', lpAddress: MAINNET_LP_USDM_ADDRESS, tokenBAddress: MAINNET_USDM_ADDRESS, tokenBSymbol: 'USDm', isEth: false },
] as const;

function LPStakingSection({ address }: { address: `0x${string}` }) {
  const [selectedPool, setSelectedPool] = useState(0);
  const pool = POOL_CONFIG[selectedPool];
  const pairDeployed = isContractDeployed(pool.lpAddress);

  // ── State ──
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'unstake'>('stake');
  const [status, setStatus] = useState<'idle' | 'approving' | 'approving-b' | 'adding' | 'removing' | 'wrapping' | 'staking' | 'unstaking' | 'claiming' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [liqPanel, setLiqPanel] = useState<'none' | 'add' | 'remove'>('none');
  const [liqAmountA, setLiqAmountA] = useState('');
  const [liqAmountB, setLiqAmountB] = useState('');
  const [lastEditedSide, setLastEditedSide] = useState<'a' | 'b'>('a');
  const [removeLiqAmount, setRemoveLiqAmount] = useState('');

  // ── Token balances ──
  const { data: megachadBalance, refetch: refetchMegachadBal } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [address],
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
    args: [address, MAINNET_JESTERGOONER_ADDRESS],
  });
  const { data: megachadAllowanceLP } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, pool.lpAddress],
  });
  const { data: tokenBAllowanceLP } = useReadContract({
    address: pool.tokenBAddress, abi: ERC20_ABI, functionName: 'allowance',
    args: [address, pool.lpAddress],
  });

  // Read JESTERGOONER's live lpToken setting. The mainnet proxy is the single-pool
  // V1 contract — it exposes a public `lpToken` state var (auto getter). Until V2 is
  // deployed and ADMIN calls setLpToken(MC/MG pair), this returns the PlaceholderLP
  // address, and any stake/unstake/claim against the proxy reverts (function-selector
  // mismatch with the V3 ABI used below, and the placeholder isn't what users hold).
  const { data: jgLpToken } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS,
    abi: [{ type: 'function', name: 'lpToken', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' }] as const,
    functionName: 'lpToken',
  });
  const stakingActivated = jgLpToken !== undefined
    && typeof jgLpToken === 'string'
    && jgLpToken.toLowerCase() === (pool.lpAddress as string).toLowerCase();

  // ── V3 contract reads (pid-based) ──
  const { data: poolInfoData } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getPoolInfo',
    args: [BigInt(selectedPool)],
  });
  const { data: userInfoData, refetch: refetchStaker } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getUserInfo',
    args: [BigInt(selectedPool), address],
  });
  const { data: globalStats } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'getGlobalStats',
  });
  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'earned',
    args: [BigInt(selectedPool), address],
  });
  const { data: earnedAll, refetch: refetchEarnedAll } = useReadContract({
    address: MAINNET_JESTERGOONER_ADDRESS, abi: JESTERGOONER_V3_ABI, functionName: 'earnedAll',
    args: [address],
  });

  // ── LP reserves for ratio/APY ──
  const { data: lpReserves } = useReadContract({
    address: pool.lpAddress, abi: LP_ABI, functionName: 'getReserves',
  });
  const { data: lpTotalSupply } = useReadContract({
    address: pool.lpAddress, abi: LP_ABI, functionName: 'totalSupply',
  });

  // MEGACHAD/MEGAGOONER LP reserves — used to price MEGAGOONER in MEGACHAD for APY.
  // Source from the real pair (the placeholder LP is a static ERC20 with no reserves).
  const { data: goonerLpReserves } = useReadContract({
    address: MAINNET_MC_MG_PAIR_ADDRESS, abi: LP_ABI, functionName: 'getReserves',
  });
  const goonerPrice = (() => {
    if (!goonerLpReserves) return undefined;
    const a = Number(formatUnits(goonerLpReserves[0], 18));
    const b = Number(formatUnits(goonerLpReserves[1], 18));
    if (a <= 0 || b <= 0) return undefined;
    return a / b;
  })();
  const selectedPoolAPY = computePoolAPY(
    poolInfoData?.[4],
    poolInfoData?.[2],
    lpReserves?.[0],
    lpTotalSupply,
    goonerPrice,
  );

  // ── Computed values ──
  const poolRatio = lpReserves && lpReserves[0] > 0n
    ? Number(formatUnits(lpReserves[1], 18)) / Number(formatUnits(lpReserves[0], 18))
    : 0.05;
  const inversePoolRatio = poolRatio > 0 ? 1 / poolRatio : 0;

  // Auto-calculate the other side when one side changes
  const handleLiqAmountAChange = (val: string) => {
    setLiqAmountA(val);
    setLastEditedSide('a');
    if (val && Number(val) > 0) {
      setLiqAmountB((Number(val) * poolRatio).toFixed(6));
    } else {
      setLiqAmountB('');
    }
  };
  const handleLiqAmountBChange = (val: string) => {
    setLiqAmountB(val);
    setLastEditedSide('b');
    if (val && Number(val) > 0) {
      setLiqAmountA((Number(val) * inversePoolRatio).toFixed(6));
    } else {
      setLiqAmountA('');
    }
  };

  const parsedLiqA = liqAmountA ? parseUnits(liqAmountA, 18) : 0n;
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
    if (!pairDeployed) { setErrorMsg(`${pool.name} pair not deployed yet`); return; }
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
        address: MAINNET_WETH_ADDRESS,
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
        address: MAINNET_MEGACHAD_ADDRESS,
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
    if (!pairDeployed) { setErrorMsg(`${pool.name} pair not deployed yet`); return; }
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
      setLiqAmountB('');
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
    if (!stakingActivated) { setErrorMsg('Staking activates after the JESTERGOONER V2 upgrade points lpToken at this pair'); return; }
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
          args: [MAINNET_JESTERGOONER_ADDRESS, parsedAmount],
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
        address: MAINNET_JESTERGOONER_ADDRESS,
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
      address: MAINNET_JESTERGOONER_ADDRESS,
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
      address: MAINNET_JESTERGOONER_ADDRESS,
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
      address: MAINNET_JESTERGOONER_ADDRESS,
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
      refetchEarnedAll();
    }
  }, [claimConfirmed, status]);

  // ── V1 Migration: old JesterGooner with lock periods ──
  const { data: v1StakerInfo, refetch: refetchV1Staker } = useReadContract({
    address: MAINNET_JESTERGOONER_V1_ADDRESS,
    abi: JESTERGOONER_V1_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });
  const { data: v1Earned, refetch: refetchV1Earned } = useReadContract({
    address: MAINNET_JESTERGOONER_V1_ADDRESS,
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
    address: MAINNET_JESTERGOONER_V2_ADDRESS,
    abi: JESTERGOONER_ABI,
    functionName: 'getStakerInfo',
    args: [address],
  });
  const { data: v2Earned, refetch: refetchV2Earned } = useReadContract({
    address: MAINNET_JESTERGOONER_V2_ADDRESS,
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
      address: MAINNET_JESTERGOONER_V1_ADDRESS,
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
      address: MAINNET_JESTERGOONER_V1_ADDRESS,
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
      address: MAINNET_JESTERGOONER_V2_ADDRESS,
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
      address: MAINNET_JESTERGOONER_V2_ADDRESS,
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
        {POOL_CONFIG.map((p, i) => {
          const deployed = isContractDeployed(p.lpAddress);
          return (
            <button
              key={i}
              className={`beta-toggle${selectedPool === i ? ' active' : ''}`}
              onClick={() => { setSelectedPool(i); setAmount(''); setLiqPanel('none'); setErrorMsg(''); setStatus('idle'); }}
              style={{ fontSize: '0.7rem', padding: '0.4rem 0.6rem', opacity: deployed ? 1 : 0.55 }}
              title={deployed ? p.name : `${p.name} — pair not deployed yet`}
            >
              {p.name}{!deployed && ' (PENDING)'}
            </button>
          );
        })}
      </div>

      {/* Pool-specific stats */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">POOL APY</span>
          <span className="beta-stat-value">{fmtAPY(selectedPoolAPY)}</span>
        </div>
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

      {/* Your wallet balances (always visible — drives the Add Liquidity flow) */}
      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGACHAD</span>
          <span className="beta-stat-value">{fmtBig(megachadBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR ${pool.tokenBSymbol}</span>
          <span className="beta-stat-value">{fmtBig(tokenBBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR LP BALANCE</span>
          <span className="beta-stat-value">{fmtBig(lpBalance)} LP</span>
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
          {!pairDeployed && (
            <div style={{ padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(247,134,198,0.4)', borderRadius: '6px', background: 'rgba(247,134,198,0.05)' }}>
              <p className="beta-card-desc" style={{ margin: 0, fontSize: '0.8rem' }}>
                <strong>{pool.name}</strong> pair is not deployed yet. Liquidity can only be added to an existing Uniswap V2 pair —
                deployment is gated on tren fund accumulating sufficient {pool.tokenBSymbol} reserves.
              </p>
            </div>
          )}
          <p className="beta-card-desc" style={{ marginBottom: '0.75rem' }}>
            Deposit $MEGACHAD and ${pool.tokenBSymbol} in the current pool ratio to receive LP tokens.
            {pool.isEth && ' ETH will be automatically wrapped to WETH.'}
            {pairDeployed && lpTotalSupply !== undefined && lpTotalSupply === 0n && ' This pair is empty — you will set the initial price by depositing.'}
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
                onChange={(e) => handleLiqAmountAChange(e.target.value)}
                placeholder="0.0"
                className="beta-input"
                min="0"
              />
              <button
                className="beta-btn-max"
                onClick={() => {
                  if (megachadBalance) handleLiqAmountAChange(formatUnits(megachadBalance, 18));
                }}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="beta-input-group" style={{ marginTop: '0.5rem' }}>
            <label className="beta-input-label">${pool.tokenBSymbol} AMOUNT</label>
            <div className="beta-input-row">
              <input
                type="number"
                value={liqAmountB}
                onChange={(e) => handleLiqAmountBChange(e.target.value)}
                placeholder="0.0"
                className="beta-input"
                min="0"
              />
              <button
                className="beta-btn-max"
                onClick={() => {
                  if (tokenBBalance) handleLiqAmountBChange(formatUnits(tokenBBalance, 18));
                }}
              >
                MAX
              </button>
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
            disabled={isBusy || parsedLiqA <= 0n || !pairDeployed}
          >
            {!pairDeployed ? 'PAIR NOT DEPLOYED'
              : status === 'wrapping' ? 'WRAPPING ETH...'
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
            disabled={isBusy || parsedRemoveLiq <= 0n || !pairDeployed}
          >
            {!pairDeployed ? 'PAIR NOT DEPLOYED'
              : status === 'removing' ? 'REMOVING LIQUIDITY...'
              : 'REMOVE LIQUIDITY'}
          </button>
        </div>
      )}

      {/* ── Stake / Unstake ── */}
      {!stakingActivated && (
        <div style={{ padding: '0.75rem', marginTop: '1rem', border: '1px solid rgba(247,134,198,0.4)', borderRadius: '6px', background: 'rgba(247,134,198,0.05)' }}>
          <p className="beta-card-desc" style={{ margin: 0, fontSize: '0.8rem' }}>
            <strong>Staking pending V2 upgrade.</strong> JESTERGOONER&apos;s lpToken still points at the placeholder ERC20.
            Once the pair has initial liquidity and ADMIN calls <code>setLpToken</code>, your LP tokens from this pair become stakeable for MEGAGOONER emissions.
          </p>
        </div>
      )}
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
        disabled={isBusy || !stakingActivated}
      >
        {!stakingActivated ? 'STAKING NOT YET ACTIVE'
          : needsApproval ? `APPROVE & ${action.toUpperCase()}`
          : action === 'stake' ? 'STAKE LP'
          : 'UNSTAKE LP'}
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
    address: MAINNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  const { data: megagoonerBalance, refetch: refetchGooner } = useReadContract({
    address: MAINNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  // Allowances on LP contract
  const { data: chadAllowance, refetch: refetchChadAllowance } = useReadContract({
    address: MAINNET_MEGACHAD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, MAINNET_LP_TOKEN_ADDRESS],
  });

  const { data: goonerAllowance, refetch: refetchGoonerAllowance } = useReadContract({
    address: MAINNET_MEGAGOONER_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address, MAINNET_LP_TOKEN_ADDRESS],
  });

  // Reserves for quote
  const { data: reserves } = useReadContract({
    address: MAINNET_LP_TOKEN_ADDRESS,
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
      address: MAINNET_LP_TOKEN_ADDRESS,
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
      const tokenAddr = direction === 'buy' ? MAINNET_MEGACHAD_ADDRESS : MAINNET_MEGAGOONER_ADDRESS;
      writeApprove({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [MAINNET_LP_TOKEN_ADDRESS, parsedInput],
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
