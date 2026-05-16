'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function MainNav() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mobileNav, setMobileNav] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

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

  const onHome = pathname === '/main' || pathname === '/main/';
  const anchor = (id: string) => (onHome ? `#${id}` : `/main#${id}`);

  return (
    <>
      <nav className="nav">
        <Link href="/main" className="nav-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={220}
            height={60}
            priority
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </Link>
        <ul className={`nav-links ${mobileNav ? 'open' : ''}`}>
          <li><Link href={anchor('about')} onClick={() => setMobileNav(false)}>About</Link></li>
          <li><Link href={anchor('buy')} onClick={() => setMobileNav(false)}>Buy</Link></li>
          <li><Link href={anchor('burn')} onClick={() => setMobileNav(false)}>Burn</Link></li>
          <li><Link href="/main/protocol" onClick={() => setMobileNav(false)}>Protocol</Link></li>
          <li><Link href="/main/governance" onClick={() => setMobileNav(false)}>Governance</Link></li>
          <li><Link href={anchor('roadmap')} onClick={() => setMobileNav(false)}>Roadmap</Link></li>
          <li><Link href="/chadboard" onClick={() => setMobileNav(false)}>Chadboard</Link></li>
          <li><Link href="/portal" onClick={() => setMobileNav(false)}>Portal</Link></li>
          <li><Link href="/docs" onClick={() => setMobileNav(false)}>Docs</Link></li>
        </ul>
        <div className="nav-right">
          {isConnected ? (
            <button className="nav-wallet" onClick={() => disconnect()}>
              {truncAddr(address!)}
            </button>
          ) : (
            <button className="nav-wallet" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
          <button className="nav-burger" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {showWalletPicker && (
        <div className="wallet-overlay" onClick={() => setShowWalletPicker(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Connect Wallet</h3>
            <div className="wallet-options">
              {connectors.map((c) => (
                <button key={c.uid} className="wallet-option" onClick={() => pickConnector(c)}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
