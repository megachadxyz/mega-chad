'use client';

import React, { useState, useEffect } from 'react';
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';

// USDm on MegaETH mainnet
const USDM_ADDRESS = '0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7' as const;
const USDM_DECIMALS = 18;

interface WarrenPaymentModalProps {
  estimate: {
    totalEth: string;
    totalWei: string;
    relayerAddress: string;
    imageSize: number;
  };
  warrenData: {
    imageBase64: string;
    burnerAddress: string;
    burnTxHash: string;
    devTxHash: string;
    ipfsUrl: string;
    ipfsCid: string;
    metadataUrl: string;
  };
  onSuccess: (result: {
    tokenId: string;
    warrenTokenId: number;
    warrenRegistry: string;
    mintTxHash: string;
  }) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

type PaymentMethod = 'eth' | 'usdm';

export default function WarrenPaymentModal({
  estimate,
  warrenData,
  onSuccess,
  onCancel,
  onError,
}: WarrenPaymentModalProps) {
  const [deployStatus, setDeployStatus] = useState<'idle' | 'approving' | 'paying' | 'deploying' | 'done'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eth');
  const deployingRef = React.useRef(false);

  // USDm price estimate (~$5 equivalent, using ETH estimate as reference)
  // Warren costs ETH; for USDm we convert at approximate rate
  // Use a fixed $5 USDm as the storage cost (matching the ~$5 ETH estimate)
  const ethPrice = 3000; // approximate for display
  const usdmAmount = parseFloat(estimate.totalEth) * ethPrice;
  const usdmAmountWei = parseUnits(usdmAmount.toFixed(2), USDM_DECIMALS);
  const usdmDisplay = usdmAmount.toFixed(2);

  const burner = warrenData.burnerAddress as `0x${string}`;

  // Read USDm balance
  const { data: usdmBalance } = useReadContract({
    address: USDM_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [burner],
  });

  // Read USDm allowance for relayer
  const { data: usdmAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDM_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [burner, estimate.relayerAddress as `0x${string}`],
  });

  const hasUsdmBalance = usdmBalance !== undefined && usdmBalance >= usdmAmountWei;
  const hasUsdmAllowance = usdmAllowance !== undefined && usdmAllowance >= usdmAmountWei;

  // ── ETH payment flow ──────────────────────────────────
  const {
    sendTransaction,
    data: paymentTxHash,
    error: paymentError,
  } = useSendTransaction();

  const { isSuccess: paymentConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
    query: { enabled: !!paymentTxHash },
  });

  // ── USDm approve flow ────────────────────────────────
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

  // ── USDm transfer flow ───────────────────────────────
  const {
    writeContract: writeTransfer,
    data: transferTxHash,
    error: transferError,
    reset: resetTransfer,
  } = useWriteContract();

  const { isSuccess: transferConfirmed } = useWaitForTransactionReceipt({
    hash: transferTxHash,
    query: { enabled: !!transferTxHash },
  });

  // Handle ETH payment confirmation
  useEffect(() => {
    if (paymentConfirmed && paymentTxHash && deployStatus === 'paying') {
      handleWarrenDeploy(paymentTxHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentConfirmed, paymentTxHash, deployStatus]);

  // Handle ETH payment errors
  useEffect(() => {
    if (paymentError && deployStatus === 'paying') {
      setDeployStatus('idle');
      onError(paymentError.message.includes('User rejected')
        ? 'Payment rejected.'
        : paymentError.message.slice(0, 120));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentError, deployStatus]);

  // Handle USDm approve confirmation → trigger transfer
  useEffect(() => {
    if (approveConfirmed && deployStatus === 'approving') {
      refetchAllowance();
      setDeployStatus('paying');
      writeTransfer({
        address: USDM_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [estimate.relayerAddress as `0x${string}`, usdmAmountWei],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed, deployStatus]);

  // Handle USDm approve errors
  useEffect(() => {
    if (approveError && deployStatus === 'approving') {
      setDeployStatus('idle');
      onError(approveError.message.includes('User rejected')
        ? 'Approval rejected.'
        : approveError.message.slice(0, 120));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveError, deployStatus]);

  // Handle USDm transfer confirmation → deploy to Warren
  useEffect(() => {
    if (transferConfirmed && transferTxHash && deployStatus === 'paying') {
      handleWarrenDeploy(transferTxHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferConfirmed, transferTxHash, deployStatus]);

  // Handle USDm transfer errors
  useEffect(() => {
    if (transferError && deployStatus === 'paying') {
      setDeployStatus('idle');
      onError(transferError.message.includes('User rejected')
        ? 'Transfer rejected.'
        : transferError.message.slice(0, 120));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferError, deployStatus]);

  const handleEthPayment = () => {
    setDeployStatus('paying');
    sendTransaction({
      to: estimate.relayerAddress as `0x${string}`,
      value: BigInt(estimate.totalWei),
    });
  };

  const handleUsdmPayment = () => {
    if (hasUsdmAllowance) {
      // Already approved — go straight to transfer
      setDeployStatus('paying');
      resetTransfer();
      writeTransfer({
        address: USDM_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [estimate.relayerAddress as `0x${string}`, usdmAmountWei],
      });
    } else {
      // Need approval first
      setDeployStatus('approving');
      resetApprove();
      writeApprove({
        address: USDM_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [estimate.relayerAddress as `0x${string}`, usdmAmountWei],
      });
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'eth') {
      handleEthPayment();
    } else {
      handleUsdmPayment();
    }
  };

  async function handleWarrenDeploy(paymentHash: `0x${string}`) {
    if (deployingRef.current) return;
    deployingRef.current = true;
    setDeployStatus('deploying');
    try {
      const res = await fetch('/api/warren/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: warrenData.imageBase64,
          paymentTxHash: paymentHash,
          burnerAddress: warrenData.burnerAddress,
          burnTxHash: warrenData.burnTxHash,
          devTxHash: warrenData.devTxHash,
          ipfsUrl: warrenData.ipfsUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Warren deployment failed');

      setDeployStatus('done');
      onSuccess(data);
    } catch (err) {
      deployingRef.current = false;
      setDeployStatus('idle');
      onError(err instanceof Error ? err.message : 'Warren deployment failed');
    }
  }

  const imageSizeKB = Math.round(estimate.imageSize / 1024);
  const costUSD = (parseFloat(estimate.totalEth) * ethPrice).toFixed(2);

  return (
    <div className="warren-modal-overlay" onClick={deployStatus === 'idle' ? onCancel : undefined}>
      <div className="warren-modal" onClick={(e) => e.stopPropagation()}>
        <div className="warren-modal-header">
          <h3>UPGRADE TO ON-CHAIN STORAGE</h3>
          {deployStatus === 'idle' && (
            <button className="warren-modal-close" onClick={onCancel} aria-label="Close">
              &times;
            </button>
          )}
        </div>

        <div className="warren-modal-content">
          <div className="warren-info">
            <p>
              Your image will be stored <strong>permanently on-chain</strong> using Warren Protocol.
              This is immutable, censorship-resistant storage that will last forever.
            </p>

            <div className="warren-cost">
              <div className="warren-cost-row">
                <span>Image size:</span>
                <span>{imageSizeKB} KB</span>
              </div>
              <div className="warren-cost-row">
                <span>On-chain storage cost:</span>
                <span className="warren-cost-value">
                  {paymentMethod === 'eth'
                    ? `${estimate.totalEth} ETH`
                    : `${usdmDisplay} USDm`}
                  <span className="warren-cost-usd"> (~${costUSD})</span>
                </span>
              </div>
            </div>

            {/* Payment method toggle */}
            {deployStatus === 'idle' && (
              <div className="warren-payment-toggle">
                <span className="warren-toggle-label">Pay with:</span>
                <div className="warren-toggle-buttons">
                  <button
                    className={`warren-toggle-btn ${paymentMethod === 'eth' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('eth')}
                  >
                    ETH
                  </button>
                  <button
                    className={`warren-toggle-btn ${paymentMethod === 'usdm' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('usdm')}
                  >
                    USDm
                  </button>
                </div>
              </div>
            )}

            {/* USDm balance info */}
            {paymentMethod === 'usdm' && deployStatus === 'idle' && (
              <div className="warren-usdm-info">
                <span className="warren-usdm-balance">
                  USDm Balance: {usdmBalance !== undefined
                    ? Number(formatUnits(usdmBalance, USDM_DECIMALS)).toFixed(2)
                    : '—'}
                </span>
                {!hasUsdmBalance && usdmBalance !== undefined && (
                  <span className="warren-usdm-insufficient">Insufficient USDm</span>
                )}
              </div>
            )}

            <div className="warren-note">
              Your NFT will use on-chain images from Warren instead of IPFS. This is permanent and cannot be changed.
            </div>
          </div>

          {deployStatus === 'idle' && (
            <div className="warren-actions">
              <button className="btn btn-outline" onClick={onCancel}>
                Use IPFS Instead
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePayment}
                disabled={paymentMethod === 'usdm' && !hasUsdmBalance}
              >
                {paymentMethod === 'eth'
                  ? `Pay ${estimate.totalEth} ETH`
                  : hasUsdmAllowance
                  ? `Pay ${usdmDisplay} USDm`
                  : `Approve & Pay ${usdmDisplay} USDm`}
              </button>
            </div>
          )}

          {deployStatus === 'approving' && (
            <div className="warren-status">
              <div className="warren-spinner" />
              <p>Approving USDm...</p>
            </div>
          )}

          {deployStatus === 'paying' && (
            <div className="warren-status">
              <div className="warren-spinner" />
              <p>Waiting for payment confirmation...</p>
            </div>
          )}

          {deployStatus === 'deploying' && (
            <div className="warren-status">
              <div className="warren-spinner" />
              <p>Deploying to Warren Protocol...</p>
            </div>
          )}

          {deployStatus === 'done' && (
            <div className="warren-status">
              <div className="warren-success">&check;</div>
              <p>Successfully deployed to Warren!</p>
            </div>
          )}
        </div>

        <style jsx>{`
          .warren-payment-toggle {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 1rem;
          }
          .warren-toggle-label {
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: var(--text-dim);
          }
          .warren-toggle-buttons {
            display: flex;
            border: 1px solid rgba(255, 255, 255, 0.12);
          }
          .warren-toggle-btn {
            font-family: var(--font-body);
            font-size: 0.8rem;
            font-weight: 700;
            padding: 0.4rem 1rem;
            background: transparent;
            color: var(--text-dim);
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }
          .warren-toggle-btn.active {
            background: var(--pink);
            color: #000;
          }
          .warren-toggle-btn:not(.active):hover {
            color: #fff;
          }
          .warren-usdm-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }
          .warren-usdm-balance {
            font-family: var(--font-body);
            font-size: 0.8rem;
            color: var(--text-dim);
          }
          .warren-usdm-insufficient {
            font-family: var(--font-body);
            font-size: 0.75rem;
            color: #ff4444;
          }
        `}</style>
      </div>
    </div>
  );
}
