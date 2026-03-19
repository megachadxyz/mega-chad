'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAccount } from 'wagmi';

interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  balanceRaw: string;
  hasBalance: boolean;
  logo?: string | null;
}

interface Protocol {
  name: string;
  category: string;
  description: string;
  url?: string;
  token?: string;
  features: string[];
  hasMcpIntegration?: boolean;
  hasX402?: boolean;
}

interface LiveEvent {
  id: string;
  type: 'burn' | 'mint' | 'swap' | 'bridge';
  icon: string;
  text: string;
  time: string;
}

interface StatsData {
  totalBurns?: number;
  tokensBurned?: string;
  circulatingSupply?: string;
}

interface PriceData {
  price?: { megachadPerEth?: string };
  burnCost?: { ethEstimate?: string };
}

export default function PortalPage() {
  const { address, isConnected } = useAccount();

  // State
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [stats, setStats] = useState<StatsData>({});
  const [price, setPrice] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'protocols' | 'activity'>('portfolio');
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<{ answer?: string; actions?: { label: string; endpoint: string }[] } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [liveEvents] = useState<LiveEvent[]>([]);

  // Fetch data
  const fetchPortalData = useCallback(async () => {
    const fetches: Promise<void>[] = [];

    // Tokens (if connected)
    if (isConnected && address) {
      fetches.push(
        fetch(`/api/portal/tokens?address=${address}`)
          .then(r => r.json())
          .then(data => {
            setEthBalance(data.nativeBalance?.balance || '0');
            setTokens(data.tokens || []);
          })
          .catch(() => {})
      );
    }

    // Protocols
    fetches.push(
      fetch('/api/portal/protocols')
        .then(r => r.json())
        .then(data => setProtocols(data.protocols || []))
        .catch(() => {})
    );

    // Stats
    fetches.push(
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => setStats(data))
        .catch(() => {})
    );

    // Price
    fetches.push(
      fetch('/api/price')
        .then(r => r.json())
        .then(data => setPrice(data))
        .catch(() => {})
    );

    await Promise.all(fetches);
    setLoading(false);
  }, [isConnected, address]);

  useEffect(() => {
    fetchPortalData();
    const interval = setInterval(fetchPortalData, 30000);
    return () => clearInterval(interval);
  }, [fetchPortalData]);

  // NLP chat handler
  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    setChatLoading(true);
    setChatResponse(null);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, wallet: address }),
      });
      const data = await res.json();
      setChatResponse(data);
    } catch {
      setChatResponse({ answer: 'Failed to process request. Try again.' });
    }
    setChatLoading(false);
  };

  return (
    <>
      {/* ─── NAV ─────────────────────────────────────── */}
      <nav className="nav">
        <Link href="/main" className="nav-logo">
          <Image
            src="/images/megachad-logo.png"
            alt="$MEGACHAD"
            width={180}
            height={50}
            priority
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        </Link>
        <ul className="nav-links">
          <li><Link href="/main">Burn</Link></li>
          <li><Link href="/chadboard">Chadboard</Link></li>
          <li className="nav-divider">|</li>
          <li><Link href="/portal" className="nav-link-active">Portal</Link></li>
          {isConnected && address && (
            <li><Link href={`/profile/${address}`}>Profile</Link></li>
          )}
        </ul>
      </nav>

      {/* ─── HEADER ─────────────────────────────────── */}
      <section className="section" style={{ paddingTop: '8rem' }}>
        <div className="section-label">MegaETH</div>
        <h2 className="section-heading">Universal Portal</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '.85rem', marginTop: '.5rem', maxWidth: 600 }}>
          Your MegaETH command center. Portfolio, protocols, and natural language transactions — all in one place.
        </p>

        {/* ─── NLP COMMAND BAR ────────────────────────── */}
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          gap: '.5rem',
          maxWidth: 700,
        }}>
          <input
            type="text"
            placeholder='Try: "swap 0.1 ETH for megachad" or "looksmaxx from base" or "show top burners"'
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleChat(); }}
            disabled={chatLoading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(247,134,198,0.2)',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#fff',
              fontSize: '.9rem',
              fontFamily: "'Roboto Mono', monospace",
              outline: 'none',
            }}
          />
          <button
            onClick={handleChat}
            disabled={chatLoading || !chatInput.trim()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '.85rem' }}
          >
            {chatLoading ? '...' : 'Go'}
          </button>
        </div>

        {/* ─── NLP RESPONSE ──────────────────────────── */}
        {chatResponse && (
          <div style={{
            marginTop: '1rem',
            padding: '1.25rem',
            background: 'rgba(247,134,198,0.05)',
            border: '1px solid rgba(247,134,198,0.15)',
            borderRadius: 8,
            maxWidth: 700,
          }}>
            <div style={{ color: '#e0e0e0', fontSize: '.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {chatResponse.answer}
            </div>
            {chatResponse.actions && chatResponse.actions.length > 0 && (
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {chatResponse.actions.map((a, i) => (
                  <button
                    key={i}
                    className="btn btn-outline"
                    style={{ fontSize: '.75rem', padding: '6px 12px' }}
                    onClick={() => {
                      setChatInput(a.label);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB SWITCHER ──────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '0',
          marginTop: '2.5rem',
          borderBottom: '1px solid rgba(247,134,198,0.15)',
          maxWidth: 700,
        }}>
          {(['portfolio', 'protocols', 'activity'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-dim)',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.1rem',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ─── PORTFOLIO TAB ──────────────────────────── */}
        {activeTab === 'portfolio' && (
          <div style={{ marginTop: '2rem', maxWidth: 700 }}>
            {!isConnected ? (
              <div className="burn-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
                  Connect your wallet to view your MegaETH portfolio.
                </div>
              </div>
            ) : loading ? (
              <div className="cb-loading">Loading portfolio...</div>
            ) : (
              <>
                {/* Stats Bar */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}>
                  <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>ETH Balance</div>
                    <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontFamily: "'Bebas Neue'" }}>{Number(ethBalance).toFixed(4)}</div>
                  </div>
                  <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>$MEGACHAD Price</div>
                    <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontFamily: "'Bebas Neue'" }}>{price.price?.megachadPerEth ? `${Number(price.price.megachadPerEth).toLocaleString()}/ETH` : '...'}</div>
                  </div>
                  <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Burns</div>
                    <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontFamily: "'Bebas Neue'" }}>{stats.totalBurns || 0}</div>
                  </div>
                  <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>Burn Cost</div>
                    <div style={{ color: 'var(--primary)', fontSize: '1.2rem', fontFamily: "'Bebas Neue'" }}>{price.burnCost?.ethEstimate || '...'} ETH</div>
                  </div>
                </div>

                {/* Token List */}
                <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>Tokens</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {/* Native ETH */}
                  <div className="burn-card" style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(247,134,198,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 600, color: 'var(--primary)' }}>E</div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '.9rem', fontWeight: 500 }}>ETH</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '.7rem' }}>Native</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontSize: '.9rem', fontFamily: "'Roboto Mono'" }}>{Number(ethBalance).toFixed(6)}</div>
                    </div>
                  </div>

                  {/* ERC-20 tokens */}
                  {tokens.map(token => (
                    <div key={token.address} className="burn-card" style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: token.hasBalance ? 1 : 0.5,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(247,134,198,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 600, color: 'var(--primary)' }}>
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontSize: '.9rem', fontWeight: 500 }}>{token.symbol}</div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '.7rem' }}>{token.name}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#fff', fontSize: '.9rem', fontFamily: "'Roboto Mono'" }}>
                          {Number(token.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.3rem', margin: '2rem 0 1rem', color: '#fff' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem' }}>
                  <Link href="/main#burn" className="btn btn-primary" style={{ textAlign: 'center', padding: '12px' }}>
                    Burn & Looksmaxx
                  </Link>
                  <a href="https://rabbithole.megaeth.com/bridge" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ textAlign: 'center', padding: '12px' }}>
                    Bridge
                  </a>
                  <Link href={`/profile/${address}`} className="btn btn-outline" style={{ textAlign: 'center', padding: '12px' }}>
                    My Profile
                  </Link>
                  <Link href="/chadboard" className="btn btn-outline" style={{ textAlign: 'center', padding: '12px' }}>
                    Chadboard
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── PROTOCOLS TAB ─────────────────────────── */}
        {activeTab === 'protocols' && (
          <div style={{ marginTop: '2rem', maxWidth: 700 }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '.8rem', marginBottom: '1.5rem' }}>
              Protocols building on MegaETH. The real-time blockchain.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {protocols.map(protocol => (
                <div key={protocol.name} className="burn-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>{protocol.name}</span>
                        <span style={{
                          fontSize: '.65rem',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(247,134,198,0.1)',
                          color: 'var(--primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '.05em',
                        }}>
                          {protocol.category}
                        </span>
                        {protocol.hasMcpIntegration && (
                          <span style={{ fontSize: '.6rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(100,200,100,0.1)', color: '#8f8' }}>MCP</span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-dim)', fontSize: '.8rem', marginTop: '.5rem', lineHeight: 1.5 }}>
                        {protocol.description}
                      </p>
                      <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.75rem' }}>
                        {protocol.features.map(f => (
                          <span key={f} style={{
                            fontSize: '.65rem',
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--text-dim)',
                          }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    {protocol.url && (
                      <a
                        href={protocol.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{ fontSize: '.7rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Open
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ACTIVITY TAB ──────────────────────────── */}
        {activeTab === 'activity' && (
          <div style={{ marginTop: '2rem', maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f4', animation: 'pulse 2s infinite' }} />
              <span style={{ color: '#4f4', fontSize: '.75rem', fontFamily: "'Roboto Mono'", textTransform: 'uppercase' }}>Live on MegaETH</span>
            </div>

            {/* Protocol Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{stats.totalBurns || 0}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Total Burns</div>
              </div>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{stats.tokensBurned ? Number(stats.tokensBurned).toLocaleString() : '0'}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Tokens Burned</div>
              </div>
              <div className="burn-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.5rem', fontFamily: "'Bebas Neue'" }}>{stats.circulatingSupply ? Number(stats.circulatingSupply).toLocaleString() : '...'}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Circulating</div>
              </div>
            </div>

            {/* Live Event Stream */}
            <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>Recent Activity</h3>
            {liveEvents.length === 0 ? (
              <div className="burn-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
                  Watching for on-chain events... Burns, mints, and swaps will appear here in real-time.
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.75rem', marginTop: '.5rem' }}>
                  MegaETH block time: ~250ms
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {liveEvents.map(event => (
                  <div key={event.id} className="burn-card" style={{
                    padding: '.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span>{event.icon}</span>
                      <span style={{ color: '#e0e0e0', fontSize: '.8rem' }}>{event.text}</span>
                    </div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '.7rem' }}>{event.time}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Chain Info */}
            <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: '1.3rem', margin: '2rem 0 1rem', color: '#fff' }}>MegaETH Network</h3>
            <div className="burn-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Chain ID</div>
                  <div style={{ color: '#fff', fontSize: '.85rem', fontFamily: "'Roboto Mono'" }}>4326</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Block Time</div>
                  <div style={{ color: '#fff', fontSize: '.85rem', fontFamily: "'Roboto Mono'" }}>~250ms</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>RPC</div>
                  <div style={{ color: '#fff', fontSize: '.85rem', fontFamily: "'Roboto Mono'", wordBreak: 'break-all' }}>mainnet.megaeth.com/rpc</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '.7rem', textTransform: 'uppercase' }}>Explorer</div>
                  <a href="https://megaexplorer.xyz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontSize: '.85rem', fontFamily: "'Roboto Mono'" }}>megaexplorer.xyz</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── FOOTER ──────────────────────────────────── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Image
              src="/images/megachad-footer-logo.png"
              alt="$MEGACHAD"
              width={194}
              height={60}
              style={{ objectFit: 'contain', height: 'auto' }}
            />
            <div className="footer-tagline">MegaETH Universal Portal</div>
          </div>
          <div className="footer-right">
            <ul className="footer-links">
              <li><Link href="/main">Burn</Link></li>
              <li><Link href="/chadboard">Chadboard</Link></li>
              <li className="footer-divider">|</li>
              <li><Link href="/portal">Portal</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
}
