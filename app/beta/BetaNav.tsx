'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function BetaNav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mobileNav, setMobileNav] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [whitelisted, setWhitelisted] = useState<boolean | null>(null);

  // Check whitelist status when wallet connects
  useEffect(() => {
    if (!address) {
      setWhitelisted(null);
      return;
    }
    fetch(`/api/beta/whitelist?address=${address}`)
      .then((r) => r.json())
      .then((d) => setWhitelisted(d.whitelisted))
      .catch(() => setWhitelisted(null));
  }, [address]);

  const connectWallet = () => {
    if (connectors.length <= 1) {
      const c = connectors[0];
      if (c) connect({ connector: c });
      return;
    }
    setShowWalletPicker(true);
  };

  const pickConnector = (connector: typeof connectors[number]) => {
    connect({ connector });
    setShowWalletPicker(false);
  };

  return (
    <>
      <nav className="nav beta-nav">
        <Link href="/beta" className="nav-logo">
          <Image src="/images/megachad-logo.png" alt="MegaChad" width={220} height={60} priority />
        </Link>

        <span className="beta-testnet-tag">TESTNET</span>

        <div className={`nav-links${mobileNav ? ' open' : ''}`}>
          <Link href="/beta" onClick={() => setMobileNav(false)}>Protocol</Link>
          <Link href="/beta/governance" onClick={() => setMobileNav(false)}>Governance</Link>
          <Link href="/beta/faucet" onClick={() => setMobileNav(false)}>Faucet</Link>
          <Link href="/main" onClick={() => setMobileNav(false)}>Mainnet</Link>
        </div>

        <div className="nav-right">
          {isConnected && whitelisted === false && (
            <span className="beta-not-whitelisted">NOT WHITELISTED</span>
          )}
          {isConnected && whitelisted === true && (
            <span className="beta-whitelisted">WHITELISTED</span>
          )}
          {isConnected ? (
            <button className="wallet-btn" onClick={() => disconnect()}>
              {truncAddr(address!)}
            </button>
          ) : (
            <button className="wallet-btn" onClick={connectWallet}>
              CONNECT WALLET
            </button>
          )}
        </div>

        <button
          className="nav-burger"
          onClick={() => setMobileNav(!mobileNav)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Wallet picker modal */}
      {showWalletPicker && (
        <div className="wallet-picker-overlay" onClick={() => setShowWalletPicker(false)}>
          <div className="wallet-picker" onClick={(e) => e.stopPropagation()}>
            <h3>Select Wallet</h3>
            {connectors.map((c) => (
              <button key={c.id} className="wallet-picker-option" onClick={() => pickConnector(c)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
