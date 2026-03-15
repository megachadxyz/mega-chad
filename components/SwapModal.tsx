'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import {
  KUMBAYA_QUOTER_V2,
  KUMBAYA_SWAP_ROUTER,
  USDM,
  USDM_DECIMALS,
  QUOTER_V2_ABI,
  SWAP_ROUTER_ABI,
  DEFAULT_FEE,
} from '@/lib/kumbaya';
import { MEGACHAD_ADDRESS } from '@/lib/contracts';

interface SwapModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSwapSuccess?: () => void;
  inline?: boolean;
}

type SwapStatus = 'idle' | 'quoting' | 'approving' | 'swapping' | 'confirming' | 'done' | 'error';

export default function SwapModal({ isOpen, onClose, onSwapSuccess, inline }: SwapModalProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [usdmAmount, setUsdmAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState<bigint | null>(null);
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read USDm balance
  const { data: usdmBalance, refetch: refetchUsdmBalance } = useReadContract({
    address: USDM,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read USDm allowance for swap router
  const { data: usdmAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDM,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, KUMBAYA_SWAP_ROUTER] : undefined,
    query: { enabled: !!address },
  });

  // Approve USDm
  const {
    writeContract: writeApprove,
    data: approveTxHash,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    query: { enabled: !!approveTxHash },
  });

  // Swap
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

  const amountInWei = usdmAmount && parseFloat(usdmAmount) > 0
    ? parseUnits(usdmAmount, USDM_DECIMALS)
    : 0n;

  const needsApproval = usdmAllowance !== undefined && amountInWei > 0n && usdmAllowance < amountInWei;

  // Fetch quote when USDm amount changes (debounced)
  const fetchQuote = useCallback(async (amount: string) => {
    if (!publicClient || !amount || parseFloat(amount) <= 0) {
      setQuoteAmount(null);
      return;
    }

    setStatus('quoting');
    setError(null);

    const amountIn = parseUnits(amount, USDM_DECIMALS);

    for (const fee of [DEFAULT_FEE, 500, 10000]) {
      try {
        const result = await publicClient.simulateContract({
          address: KUMBAYA_QUOTER_V2,
          abi: QUOTER_V2_ABI,
          functionName: 'quoteExactInputSingle',
          args: [{
            tokenIn: USDM,
            tokenOut: MEGACHAD_ADDRESS,
            fee,
            amountIn,
            sqrtPriceLimitX96: 0n,
          }],
        });

        setQuoteAmount(result.result[0]);
        setStatus('idle');
        return;
      } catch {
        // try next fee tier
      }
    }

    setQuoteAmount(null);
    setStatus('idle');
    setError('No liquidity pool found for this pair');
  }, [publicClient]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    if (!usdmAmount || parseFloat(usdmAmount) <= 0) {
      setQuoteAmount(null);
      return;
    }
    quoteTimer.current = setTimeout(() => fetchQuote(usdmAmount), 400);
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [usdmAmount, fetchQuote]);

  // Handle approve confirmation → trigger swap
  useEffect(() => {
    if (approveConfirmed && status === 'approving') {
      refetchAllowance();
      doSwap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed, status]);

  // Handle approve errors
  useEffect(() => {
    if (approveError && status === 'approving') {
      setStatus('error');
      setError(
        approveError.message.includes('User rejected')
          ? 'Approval rejected.'
          : approveError.message.slice(0, 120)
      );
    }
  }, [approveError, status]);

  // Handle swap tx hash → confirming
  useEffect(() => {
    if (swapTxHash && status === 'swapping') {
      setStatus('confirming');
    }
  }, [swapTxHash, status]);

  // Handle swap confirmation
  useEffect(() => {
    if (swapConfirmed && status === 'confirming') {
      setStatus('done');
      refetchUsdmBalance();
      onSwapSuccess?.();
    }
    if (swapFailed && status === 'confirming') {
      setStatus('error');
      setError('Swap transaction failed on-chain');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapConfirmed, swapFailed, status]);

  // Handle swap errors
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

  function doSwap() {
    if (!address || !quoteAmount) return;

    setStatus('swapping');
    resetSwap();

    const amountOutMinimum = quoteAmount * 98n / 100n;

    executeSwap({
      address: KUMBAYA_SWAP_ROUTER,
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn: USDM,
        tokenOut: MEGACHAD_ADDRESS,
        fee: DEFAULT_FEE,
        recipient: address,
        amountIn: amountInWei,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }],
    });
  }

  const handleSwap = () => {
    if (!usdmAmount || !quoteAmount || !address) return;

    setError(null);

    if (needsApproval) {
      // Approve first, then swap on confirmation
      setStatus('approving');
      resetApprove();
      writeApprove({
        address: USDM,
        abi: erc20Abi,
        functionName: 'approve',
        args: [KUMBAYA_SWAP_ROUTER, amountInWei],
      });
    } else {
      doSwap();
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setError(null);
    setUsdmAmount('');
    setQuoteAmount(null);
    resetSwap();
    resetApprove();
  };

  const handleClose = () => {
    handleReset();
    onClose?.();
  };

  if (!inline && !isOpen) return null;

  const isBusy = status === 'quoting' || status === 'approving' || status === 'swapping' || status === 'confirming';
  const canSwap = isConnected && usdmAmount && parseFloat(usdmAmount) > 0 && quoteAmount && !isBusy;
  const usdmBalanceNum = usdmBalance !== undefined ? parseFloat(formatUnits(usdmBalance, USDM_DECIMALS)) : 0;
  const hasEnough = usdmAmount ? parseFloat(usdmAmount) <= usdmBalanceNum : true;

  const swapContent = (
    <>
        <h2 className="swap-title">Buy $MEGACHAD</h2>
        <p className="swap-subtitle">Swap USDm for $MEGACHAD via Kumbaya DEX</p>

        {/* USDm Input */}
        <div className="swap-field">
          <div className="swap-field-header">
            <span className="swap-field-label">You Pay</span>
            {usdmBalance !== undefined && (
              <button
                className="swap-max"
                onClick={() => {
                  setUsdmAmount(usdmBalanceNum > 0 ? usdmBalanceNum.toFixed(2) : '');
                }}
              >
                Max: {usdmBalanceNum.toFixed(2)} USDm
              </button>
            )}
          </div>
          <div className="swap-input-row">
            <input
              type="number"
              className="swap-input"
              placeholder="0.00"
              value={usdmAmount}
              onChange={(e) => setUsdmAmount(e.target.value)}
              disabled={isBusy}
              step="0.01"
              min="0"
            />
            <span className="swap-token">USDm</span>
          </div>
          {usdmAmount && !hasEnough && (
            <div className="swap-insufficient">Insufficient USDm balance</div>
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

        {/* Swap Info */}
        {quoteAmount && usdmAmount && parseFloat(usdmAmount) > 0 && (
          <div className="swap-info">
            <div className="swap-info-row">
              <span>Rate</span>
              <span>
                1 USDm = {Number(formatUnits(quoteAmount * parseUnits('1', USDM_DECIMALS) / amountInWei, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $MEGACHAD
              </span>
            </div>
            <div className="swap-info-row">
              <span>Slippage</span>
              <span>2%</span>
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
            className={`btn btn-primary swap-btn ${canSwap && hasEnough ? 'pulse-glow' : ''}`}
            onClick={handleSwap}
            disabled={!canSwap || !hasEnough}
          >
            {!isConnected
              ? 'Connect Wallet First'
              : status === 'approving'
              ? 'Approving USDm...'
              : status === 'swapping'
              ? 'Confirm in Wallet...'
              : status === 'confirming'
              ? 'Confirming Swap...'
              : !usdmAmount || parseFloat(usdmAmount) <= 0
              ? 'Enter Amount'
              : !hasEnough
              ? 'Insufficient USDm'
              : !quoteAmount
              ? 'Enter Amount'
              : needsApproval
              ? 'Approve & Swap'
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
          .swap-max {
            background: none;
            border: none;
            color: var(--pink);
            font-family: var(--font-body);
            font-size: 0.75rem;
            cursor: pointer;
            padding: 0;
          }
          .swap-max:hover {
            text-decoration: underline;
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
