'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import {
  TESTNET_MEGACHAD_ADDRESS,
  TESTNET_MEGAGOONER_ADDRESS,
  ERC20_ABI,
} from '@/lib/testnet-contracts';

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtBig(raw: bigint | undefined, decimals = 18): string {
  if (raw === undefined) return '—';
  return Number(formatUnits(raw, decimals)).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
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
        <h1 className="beta-hero-title">TESTNET FAUCET</h1>
        <p className="beta-hero-subtitle">
          Claim tokens from the Tren Fund to test the protocol
        </p>
        <div className="beta-chain-info">
          <span className="beta-chain-dot" />
          MegaETH Testnet (Chain 6343)
        </div>
      </section>

      <div className="beta-content">
        {!isConnected ? (
          <div className="beta-connect-prompt">
            <p>Connect your wallet to claim testnet tokens.</p>
          </div>
        ) : !whitelisted ? (
          <div className="beta-not-allowed">
            <div className="beta-lock-icon">&#128274;</div>
            <h3>WALLET NOT WHITELISTED</h3>
            <p>Your wallet ({truncAddr(address!)}) is not authorized for testnet operations.</p>
            <p className="beta-dim">Contact the team to request access.</p>
          </div>
        ) : (
          <FaucetCard address={address!} />
        )}
      </div>
    </div>
  );
}

function FaucetCard({ address }: { address: `0x${string}` }) {
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
        <h2>CLAIM TOKENS</h2>
        <span className="beta-card-badge">TREN FUND</span>
      </div>
      <p className="beta-card-desc">
        Claim 500,000 $MEGACHAD and 5,000 $MEGAGOONER per drip from the Tren Fund. 24h cooldown per token per wallet.
        Use these tokens to test Burn to Looksmaxx, Framemogger, Mogger Staking, JESTERGOONER, and Governance.
      </p>

      <div className="beta-stat-row">
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGACHAD BALANCE</span>
          <span className="beta-stat-value">{fmtBig(megachadBalance)}</span>
        </div>
        <div className="beta-stat">
          <span className="beta-stat-label">YOUR $MEGAGOONER BALANCE</span>
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
            {megachadStatus === 'dripping' ? 'DRIPPING...' : 'DRIP 500K $MEGACHAD'}
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
            {megagoonerStatus === 'dripping' ? 'DRIPPING...' : 'DRIP 5K $MEGAGOONER'}
          </button>
          {megagoonerMsg && (
            <span className={`beta-faucet-msg ${megagoonerStatus === 'error' ? 'error' : 'success'}`}>
              {megagoonerMsg}
            </span>
          )}
        </div>
      </div>

      <div className="beta-info-box" style={{ marginTop: '1.5rem' }}>
        <h4>HOW IT WORKS</h4>
        <ul>
          <li>All testnet tokens are held in the Tren Fund wallet</li>
          <li>Each whitelisted wallet can claim 500,000 $MEGACHAD and 5,000 $MEGAGOONER every 24 hours</li>
          <li>Use $MEGACHAD for burning (Looksmaxx + Framemogger) and staking (Mogger Staking)</li>
          <li>Use $MEGAGOONER for governance voting and Framemogger deflation burns</li>
        </ul>
      </div>
    </div>
  );
}
