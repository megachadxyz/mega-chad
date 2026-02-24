'use client';

import { useState, useEffect } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

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

export default function WarrenPaymentModal({
  estimate,
  warrenData,
  onSuccess,
  onCancel,
  onError,
}: WarrenPaymentModalProps) {
  const [deployStatus, setDeployStatus] = useState<'idle' | 'paying' | 'deploying' | 'done'>('idle');

  // Send ETH to Warren relayer
  const {
    sendTransaction,
    data: paymentTxHash,
    error: paymentError,
  } = useSendTransaction();

  const { isSuccess: paymentConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
    query: { enabled: !!paymentTxHash },
  });

  // Handle payment confirmation
  useEffect(() => {
    if (paymentConfirmed && paymentTxHash && deployStatus === 'paying') {
      handleWarrenDeploy(paymentTxHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentConfirmed, paymentTxHash, deployStatus]);

  // Handle payment errors
  useEffect(() => {
    if (paymentError && deployStatus === 'paying') {
      setDeployStatus('idle');
      onError(paymentError.message.includes('User rejected')
        ? 'Payment rejected.'
        : paymentError.message.slice(0, 120));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentError, deployStatus]);

  const handlePayment = () => {
    setDeployStatus('paying');
    sendTransaction({
      to: estimate.relayerAddress as `0x${string}`,
      value: BigInt(estimate.totalWei),
    });
  };

  async function handleWarrenDeploy(paymentHash: `0x${string}`) {
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
      setDeployStatus('idle');
      onError(err instanceof Error ? err.message : 'Warren deployment failed');
    }
  }

  const imageSizeKB = Math.round(estimate.imageSize / 1024);
  const costUSD = (parseFloat(estimate.totalEth) * 3000).toFixed(2);

  return (
    <div className="warren-modal-overlay" onClick={deployStatus === 'idle' ? onCancel : undefined}>
      <div className="warren-modal" onClick={(e) => e.stopPropagation()}>
        <div className="warren-modal-header">
          <h3>⚡ UPGRADE TO ON-CHAIN STORAGE</h3>
          {deployStatus === 'idle' && (
            <button className="warren-modal-close" onClick={onCancel} aria-label="Close">
              ✕
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
                  {estimate.totalEth} ETH
                  <span className="warren-cost-usd"> (~${costUSD})</span>
                </span>
              </div>
            </div>

            <div className="warren-note">
              💡 Your NFT will use on-chain images from Warren instead of IPFS. This is permanent and cannot be changed.
            </div>
          </div>

          {deployStatus === 'idle' && (
            <div className="warren-actions">
              <button className="btn btn-outline" onClick={onCancel}>
                Cancel (Use IPFS)
              </button>
              <button className="btn btn-primary" onClick={handlePayment}>
                Pay {estimate.totalEth} ETH
              </button>
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
              <div className="warren-success">✓</div>
              <p>Successfully deployed to Warren!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
