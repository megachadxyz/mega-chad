'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { parseEther, formatEther, formatUnits } from 'viem';
import {
  KUMBAYA_QUOTER_V2,
  KUMBAYA_SWAP_ROUTER,
  WETH,
  QUOTER_V2_ABI,
  SWAP_ROUTER_ABI,
  FEE_TIERS,
  DEFAULT_FEE,
} from '@/lib/kumbaya';
import { MEGACHAD_ADDRESS, MEGACHAD_ABI } from '@/lib/contracts';

interface SwapModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSwapSuccess?: () => void;
  inline?: boolean;
}

type SwapStatus = 'idle' | 'quoting' | 'swapping' | 'confirming' | 'done' | 'error';

export default function SwapModal({ isOpen, onClose, onSwapSuccess, inline }: SwapModalProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: ethBalance } = useBalance({ address });
  const { data: chadBalance } = useReadContract({
    address: MEGACHAD_ADDRESS,
    abi: MEGACHAD_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const [ethAmount, setEthAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<bigint | null>(null);
  const [activeFee, setActiveFee] = useState(DEFAULT_FEE);
  const [slippage, setSlippage] = useState(2);
  const [showSlippage, setShowSlippage] = useState(false);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    writeContract: executeSwap,
    data: swapTxHash,
    error: swapError,
    reset: resetSwap,
  } = useWriteContract();

  const { isSuccess: swapConfirmed, isError: swapFailed } =
    useWaitForTransactionReceipt({
      hash: swapTxHash,
      query: { enabled: !!swapTxHash },
    });

  // Fetch quote when ETH amount changes (debounced)
  const fetchQuote = useCallback(async (amount: string) => {
    if (!publicClient || !amount || parseFloat(amount) <= 0) {
      setQuoteAmount(null);
      return;
    }

    setStatus('quoting');
    setError(null);

    const amountIn = parseEther(amount);

    // Try fee tiers in order (10000 first since that's where MEGACHAD pool is)
    // Use readContract (eth_call) instead of simulateContract because
    // UniV3 QuoterV2 is nonpayable and internally reverts after quoting
    const quoteTimeout = setTimeout(() => {
      setQuoteAmount(null);
      setStatus('idle');
      setError('Quote timed out. Try again.');
    }, 15000);

    try {
      for (const fee of FEE_TIERS) {
        try {
          const result = await publicClient.readContract({
            address: KUMBAYA_QUOTER_V2,
            abi: QUOTER_V2_ABI,
            functionName: 'quoteExactInputSingle',
            args: [{
              tokenIn: WETH,
              tokenOut: MEGACHAD_ADDRESS,
              fee,
              amountIn,
              sqrtPriceLimitX96: 0n,
            }],
          });

          clearTimeout(quoteTimeout);
          setQuoteAmount(result[0]);
          setActiveFee(fee);
          setStatus('idle');
          return;
        } catch {
          // try next fee tier
        }
      }

      clearTimeout(quoteTimeout);
      setQuoteAmount(null);
      setStatus('idle');
      setError('No liquidity pool found for this pair');
    } catch {
      clearTimeout(quoteTimeout);
    }
  }, [publicClient]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setQuoteAmount(null);
      return;
    }
    quoteTimer.current = setTimeout(() => fetchQuote(ethAmount), 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [ethAmount, fetchQuote]);

  // Handle swap execution result
  useEffect(() => {
    if (swapTxHash && status === 'swapping') {
      setStatus('confirming');
    }
  }, [swapTxHash, status]);

  useEffect(() => {
    if (swapConfirmed && status === 'confirming') {
      setStatus('done');
      onSwapSuccess?.();
    }
    if (swapFailed && status === 'confirming') {
      setStatus('error');
      setError('Swap transaction failed on-chain');
    }
  }, [swapConfirmed, swapFailed, status, onSwapSuccess]);

  useEffect(() => {
    if (swapError && status === 'swapping') {
      setStatus('error');
      setError(
        swapError.message.includes('User rejected')
          ? 'Transaction rejected.'
          : 'Swap failed. Try adjusting the amount.'
      );
    }
  }, [swapError, status]);

  const handleSwap = () => {
    if (!ethAmount || !quoteAmount || !address) return;

    setStatus('swapping');
    setError(null);
    resetSwap();

    const amountIn = parseEther(ethAmount);
    const slippageBps = BigInt(Math.round(slippage * 100));
    const amountOutMinimum = quoteAmount * (10000n - slippageBps) / 10000n;

    executeSwap({
      address: KUMBAYA_SWAP_ROUTER,
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: WETH,
        tokenOut: MEGACHAD_ADDRESS,
        fee: activeFee,
        recipient: address,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }],
      value: amountIn, // Send native ETH — router wraps to WETH
    });
  };

  const handleReset = () => {
    setStatus('idle');
    setError(null);
    setEthAmount('');
    setQuoteAmount(null);
    setShowSlippage(false);
    resetSwap();
  };

  const handleClose = () => {
    handleReset();
    onClose?.();
  };

  if (!inline && !isOpen) return null;

  const isBusy = status === 'quoting' || status === 'swapping' || status === 'confirming';
  const canSwap = isConnected && ethAmount && parseFloat(ethAmount) > 0 && quoteAmount && !isBusy;
  const ethBalanceNum = ethBalance ? parseFloat(formatEther(ethBalance.value)) : 0;
  const hasEnoughEth = ethAmount ? parseFloat(ethAmount) <= ethBalanceNum : true;

  const swapContent = (
    <>
        <h2 className="swap-title">Buy $MEGACHAD</h2>
        <p className="swap-subtitle">Swap ETH for $MEGACHAD via Kumbaya DEX</p>

        {/* ETH Input */}
        <div className="swap-field">
          <div className="swap-field-header">
            <span className="swap-field-label">You Pay</span>
            {ethBalance && (
              <span className="swap-balance">
                Balance: {ethBalanceNum.toFixed(4)} ETH
              </span>
            )}
          </div>
          <div className="swap-input-row">
            <input
              type="number"
              className="swap-input"
              placeholder="0.0"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              disabled={isBusy}
              step="0.001"
              min="0"
            />
            <span className="swap-token">ETH</span>
          </div>
          {ethAmount && !hasEnoughEth && (
            <div className="swap-insufficient">Insufficient ETH balance</div>
          )}
        </div>

        {/* Arrow */}
        <div className="swap-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* MEGACHAD Output */}
        <div className="swap-field">
          <div className="swap-field-header">
            <span className="swap-field-label">You Receive</span>
            {chadBalance !== undefined && (
              <span className="swap-balance">
                Balance: {Number(chadBalance / 10n ** 18n).toLocaleString()} $MEGACHAD
              </span>
            )}
          </div>
          <div className="swap-input-row">
            <div className="swap-output">
              {status === 'quoting' ? (
                <span className="swap-loading">Getting quote...</span>
              ) : quoteAmount ? (
                Number(formatUnits(quoteAmount, 18)).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              ) : (
                <span className="swap-placeholder">0</span>
              )}
            </div>
            <span className="swap-token swap-token-chad">$MEGACHAD</span>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="swap-slippage-row">
          <button className="swap-slippage-toggle" onClick={() => setShowSlippage(!showSlippage)}>
            Slippage: {slippage}% {showSlippage ? '\u25B4' : '\u25BE'}
          </button>
        </div>
        {showSlippage && (
          <div className="swap-slippage-panel">
            {[0.5, 1, 2, 5].map((val) => (
              <button
                key={val}
                className={`swap-slippage-btn ${slippage === val ? 'active' : ''}`}
                onClick={() => setSlippage(val)}
              >
                {val}%
              </button>
            ))}
            <div className="swap-slippage-custom">
              <input
                type="number"
                className="swap-slippage-input"
                value={slippage}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0 && v <= 20) setSlippage(v);
                }}
                step="0.1"
                min="0"
                max="20"
              />
              <span>%</span>
            </div>
          </div>
        )}

        {/* Swap Info */}
        {quoteAmount && ethAmount && parseFloat(ethAmount) > 0 && (
          <div className="swap-info">
            <div className="swap-info-row">
              <span>Rate</span>
              <span>
                1 ETH = {Number(formatUnits(quoteAmount * parseEther('1') / parseEther(ethAmount), 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $MEGACHAD
              </span>
            </div>
            <div className="swap-info-row">
              <span>Max Slippage</span>
              <span>{slippage}%</span>
            </div>
            <div className="swap-info-row">
              <span>Via</span>
              <span>Kumbaya DEX</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status === 'done' ? (
          <div className="swap-done">
            <div className="swap-done-text">Swap successful!</div>
            <div className="swap-done-buttons">
              <button className="btn btn-outline" onClick={handleReset}>Swap More</button>
              <button className="btn btn-primary" onClick={handleClose}>Done</button>
            </div>
          </div>
        ) : (
          <button
            className={`btn btn-primary swap-btn ${canSwap && hasEnoughEth ? 'pulse-glow' : ''}`}
            onClick={handleSwap}
            disabled={!canSwap || !hasEnoughEth}
          >
            {!isConnected
              ? 'Connect Wallet First'
              : status === 'swapping'
              ? 'Confirm in Wallet...'
              : status === 'confirming'
              ? 'Confirming Swap...'
              : !ethAmount || parseFloat(ethAmount) <= 0
              ? 'Enter Amount'
              : !hasEnoughEth
              ? 'Insufficient ETH'
              : !quoteAmount
              ? 'Enter Amount'
              : 'SWAP'}
          </button>
        )}

        {error && <div className="swap-error">{error}</div>}

        {/* Powered by */}
        <div className="swap-powered">
          Powered by{' '}
          <a href="https://kumbaya.xyz" target="_blank" rel="noopener noreferrer">
            Kumbaya DEX
          </a>
        </div>

        <style jsx>{`
          .swap-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }
          .swap-modal {
            background: #0d0d14;
            border: 1px solid rgba(247, 134, 198, 0.2);
            max-width: 440px;
            width: 100%;
            padding: 2rem;
            position: relative;
            box-shadow: 0 0 60px rgba(247, 134, 198, 0.1);
          }
          .swap-inline {
            background: rgba(13, 13, 20, 0.6);
            border: 1px solid rgba(247, 134, 198, 0.15);
            max-width: 440px;
            width: 100%;
            padding: 2rem;
            position: relative;
            box-shadow: 0 0 40px rgba(247, 134, 198, 0.08);
            margin: 0 auto;
          }
          .swap-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: none;
            border: none;
            color: var(--text-dim);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.25rem;
            line-height: 1;
          }
          .swap-close:hover {
            color: var(--pink);
          }
          .swap-title {
            font-family: var(--font-display);
            font-size: 1.8rem;
            color: var(--pink);
            margin: 0 0 0.25rem 0;
            letter-spacing: 0.03em;
          }
          .swap-subtitle {
            color: var(--text-dim);
            font-family: var(--font-body);
            font-size: 0.85rem;
            margin: 0 0 1.5rem 0;
          }
          .swap-field {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1rem;
          }
          .swap-field-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
          }
          .swap-field-label {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .swap-balance {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: var(--pink);
          }
          .swap-input-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .swap-input {
            flex: 1;
            background: none;
            border: none;
            color: #fff;
            font-family: var(--font-body);
            font-size: 1.5rem;
            outline: none;
            width: 100%;
            min-width: 0;
          }
          .swap-input::placeholder {
            color: rgba(255, 255, 255, 0.2);
          }
          .swap-input::-webkit-outer-spin-button,
          .swap-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .swap-output {
            flex: 1;
            font-family: var(--font-body);
            font-size: 1.5rem;
            color: #fff;
          }
          .swap-placeholder {
            color: rgba(255, 255, 255, 0.2);
          }
          .swap-loading {
            color: var(--text-dim);
            font-size: 1rem;
          }
          .swap-token {
            font-family: var(--font-body);
            font-size: 0.9rem;
            font-weight: 700;
            color: var(--text-dim);
            white-space: nowrap;
          }
          .swap-token-chad {
            color: var(--pink);
          }
          .swap-insufficient {
            color: #ff4444;
            font-family: var(--font-body);
            font-size: 0.75rem;
            margin-top: 0.5rem;
          }
          .swap-arrow {
            display: flex;
            justify-content: center;
            padding: 0.5rem 0;
            color: var(--text-dim);
          }
          .swap-slippage-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 0.5rem;
          }
          .swap-slippage-toggle {
            background: none;
            border: none;
            color: var(--text-dim);
            font-family: var(--font-body);
            font-size: 0.75rem;
            cursor: pointer;
            padding: 0.25rem 0;
          }
          .swap-slippage-toggle:hover {
            color: var(--pink);
          }
          .swap-slippage-panel {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 0;
            flex-wrap: wrap;
          }
          .swap-slippage-btn {
            font-family: var(--font-body);
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.35rem 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-dim);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            transition: all 0.15s;
          }
          .swap-slippage-btn.active {
            background: var(--pink);
            color: #000;
            border-color: var(--pink);
          }
          .swap-slippage-btn:not(.active):hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
          }
          .swap-slippage-custom {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            margin-left: auto;
            color: var(--text-dim);
            font-family: var(--font-body);
            font-size: 0.75rem;
          }
          .swap-slippage-input {
            width: 3.5rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            font-family: var(--font-body);
            font-size: 0.75rem;
            padding: 0.35rem 0.4rem;
            text-align: right;
            outline: none;
          }
          .swap-slippage-input:focus {
            border-color: var(--pink);
          }
          .swap-slippage-input::-webkit-outer-spin-button,
          .swap-slippage-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .swap-info {
            margin-top: 1rem;
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 0.75rem 1rem;
          }
          .swap-info-row {
            display: flex;
            justify-content: space-between;
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: var(--text-dim);
            padding: 0.25rem 0;
          }
          .swap-btn {
            width: 100%;
            margin-top: 1rem;
            font-size: 1.1rem;
            padding: 1rem;
          }
          .swap-error {
            color: #ff4444;
            font-family: var(--font-body);
            font-size: 0.85rem;
            margin-top: 0.75rem;
            text-align: center;
          }
          .swap-done {
            margin-top: 1rem;
            text-align: center;
          }
          .swap-done-text {
            color: #00ff88;
            font-family: var(--font-display);
            font-size: 1.2rem;
            margin-bottom: 1rem;
          }
          .swap-done-buttons {
            display: flex;
            gap: 0.75rem;
          }
          .swap-done-buttons .btn {
            flex: 1;
          }
          .swap-powered {
            margin-top: 1rem;
            text-align: center;
            font-family: var(--font-body);
            font-size: 0.7rem;
            color: var(--text-dim);
            opacity: 0.6;
          }
          .swap-powered a {
            color: var(--pink);
            text-decoration: none;
          }
          .swap-powered a:hover {
            text-decoration: underline;
          }
          @media (max-width: 480px) {
            .swap-modal, .swap-inline {
              padding: 1.5rem;
            }
            .swap-input, .swap-output {
              font-size: 1.2rem;
            }
          }
        `}</style>
    </>
  );

  if (inline) {
    return (
      <div className="swap-inline">
        {swapContent}
      </div>
    );
  }

  return (
    <div className="swap-overlay" onClick={handleClose}>
      <div className="swap-modal" onClick={(e) => e.stopPropagation()}>
        <button className="swap-close" onClick={handleClose} aria-label="Close">
          &times;
        </button>
        {swapContent}
      </div>
    </div>
  );
}
